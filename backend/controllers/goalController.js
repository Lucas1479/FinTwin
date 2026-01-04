import asyncHandler from 'express-async-handler';
import Goal from '../models/goalModel.js';
import Plan from '../models/planModel.js';
import GoalDecisionLog from '../models/goalDecisionLogModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// ==========================================
// Goal & Plan Controller
// Handles the lifecycle of Goals and their associated Plans.
// ==========================================

// @desc    Create a new goal (and its initial Plan)
// @route   POST /api/goals
// @access  Private
export const createGoal = asyncHandler(async (req, res) => {
  const {
    // --- Goal Fields ---
    goal_name,
    icon,
    category,
    priority,
    riskTolerance,
    status,
    rank,
    target_amount,
    current_amount,
    due_date,
    goal_details,
    notes,
    linked_accounts,

    // --- Plan Fields ---
    strategyType,     // Maps to strategy_profile
    granularSettings, // Maps to settings
    product,          // Maps to investment_product / product_snapshot
    contribution,     // { amount, frequency }
    funding_source,
    initial_allocations,
    ai_rationale,
    
    // --- Enhanced Plan Fields (from Goal Engine) ---
    target_exposure,
    glide_path,
    contribution_strategy,
    selected_portfolio,
    decision_session_id
  } = req.body;

  if (!goal_name || !category || !priority || !riskTolerance || !target_amount || !due_date) {
    throw new BadRequestError('Missing required goal fields');
  }

  // 1. Create the Goal (The "What")
  const goal = await Goal.create({
    user_id: req.user._id,
    goal_name,
    icon,
    category,
    priority,
    riskTolerance,
    status,
    rank,
    target_amount,
    current_amount,
    due_date,
    goal_details,
    notes,
    linked_accounts,
  });

  // 2. Create the Plan (The "How")
  const plan = await Plan.create({
    goal_id: goal._id,
    user_id: req.user._id,
    strategy_profile: strategyType || 'balanced',
    
    // Target exposure (from AI strategy recommendation)
    target_exposure: target_exposure || { growth: 60, defensive: 30, liquidity: 10 },
    
    // Glide path configuration
    glide_path: glide_path || { enabled: false },
    
    settings: {
        inflation_adjusted: granularSettings?.inflationAdjust ?? true,
        tax_optimized: granularSettings?.taxOptimized ?? false,
        reinvest_dividends: granularSettings?.reinvestDividends ?? true,
        liquidity_preference: granularSettings?.liquidity ?? 'flexible'
    },
    
    // Legacy product snapshot
    product_snapshot: product ? {
        name: product.name,
        provider: product.provider || 'Unknown',
        fees: product.fees,
        risk_level: product.risk_level || 'Medium'
    } : undefined,
    
    // Selected portfolio (from Stage 3)
    selected_portfolio: selected_portfolio,
    
    // Contribution schedule
    contribution: contribution || { amount: 0, frequency: 'monthly' },
    
    // Enhanced contribution strategy
    contribution_strategy: contribution_strategy || {
      mode: 'recurring',
      monthly_amount: contribution?.amount || 0,
      lump_sum_amount: 0
    },
    
    funding_source,
    initial_allocations: initial_allocations || [],
    ai_rationale,
    decision_session_id
  });

  // 3. If we have a session ID, update decision logs with the goal ID
  if (decision_session_id) {
    try {
      await GoalDecisionLog.updateMany(
        { session_id: decision_session_id, user_id: req.user._id },
        { $set: { goal_id: goal._id, committed_to_goal: true } }
      );
    } catch (logErr) {
      console.warn('[GoalController] Failed to update decision logs:', logErr.message);
      // Don't fail the goal creation if log update fails
    }
  }

  // 4. Return Combined Result
  res.status(201).json({
    ...goal.toObject(),
    plan: plan.toObject()
  });
});

// @desc    Get all goals for current user (includes active Plan)
// @route   GET /api/goals
// @access  Private
export const getGoals = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user._id };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  // 1. Fetch Goals
  const goals = await Goal.find(filter).sort({ rank: 1, created_at: -1 }).lean();

  // 2. Fetch Plans for these goals
  // Optimization: Fetch all plans for this user in one go and map them in memory
  const goalIds = goals.map(g => g._id);
  const plans = await Plan.find({ goal_id: { $in: goalIds } })
    .populate('selected_portfolio.products.product_id')
    .lean();

  // 3. Merge Plan into Goal
  const goalsWithPlans = goals.map(goal => {
    const plan = plans.find(p => p.goal_id.toString() === goal._id.toString());
    return { ...goal, plan: plan || null };
  });

  res.json(goalsWithPlans);
});

// @desc    Get a single goal by id
// @route   GET /api/goals/:id
// @access  Private
export const getGoalById = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id }).lean();

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  const plan = await Plan.findOne({ goal_id: goal._id })
    .populate('selected_portfolio.products.product_id')
    .lean();

  res.json({ ...goal, plan: plan || null });
});

// @desc    Update a goal (and optionally its plan)
// @route   PUT /api/goals/:id
// @access  Private
export const updateGoal = asyncHandler(async (req, res) => {
  let goal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  // --- Update Goal Fields ---
  const goalFields = [
    'goal_name', 'icon', 'category', 'priority', 'riskTolerance',
    'status', 'rank', 'target_amount', 'current_amount', 'due_date',
    'goal_details', 'notes', 'linked_accounts', 'completed_at'
  ];

  goalFields.forEach((field) => {
    if (typeof req.body[field] !== 'undefined') {
      goal[field] = req.body[field];
    }
  });
  await goal.save();

  // --- Update Plan Fields (If provided) ---
  // If request contains plan-related keys, update the plan
  if (req.body.strategyType || req.body.granularSettings || req.body.contribution) {
      let plan = await Plan.findOne({ goal_id: goal._id });
      if (!plan) {
          // Create if missing (rare case)
          plan = new Plan({ goal_id: goal._id, user_id: req.user._id });
      }

      if (req.body.strategyType) plan.strategy_profile = req.body.strategyType;
      
      if (req.body.granularSettings) {
          if (req.body.granularSettings.inflationAdjust !== undefined) plan.settings.inflation_adjusted = req.body.granularSettings.inflationAdjust;
          if (req.body.granularSettings.taxOptimized !== undefined) plan.settings.tax_optimized = req.body.granularSettings.taxOptimized;
          // ... map others
      }

      if (req.body.contribution) plan.contribution = req.body.contribution;

      await plan.save();
      
      // Return merged
      return res.json({ ...goal.toObject(), plan: plan.toObject() });
  }

  res.json(goal);
});

// @desc    Delete a goal (and its plan)
// @route   DELETE /api/goals/:id
// @access  Private
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  // Cleanup Plan
  await Plan.deleteOne({ goal_id: req.params.id });

  res.status(200).json({ message: 'Goal and associated Plan removed' });
});
