import asyncHandler from 'express-async-handler';
import Goal from '../models/goalModel.js';
import Plan from '../models/planModel.js';
import GoalDecisionLog from '../models/goalDecisionLogModel.js';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import Product from '../models/productModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * Handle Linkage between Goal/Plan and Wealth Center (Assets & CashFlow)
 * This function handles:
 * 1. Initial Lump Sum deduction from source asset
 * 2. Creation of a new "Goal-linked" investment asset
 * 3. Setup of recurring CashFlow for contributions
 */
const handlePlanActivation = async (user, goal, plan) => {
    console.log(`[Goal Activation] 🚀 Activating Plan for Goal: ${goal.goal_name}`);
    
    // --- 1. Handle Initial Lump Sum (One-time deduction) ---
    const initialAmount = plan.contribution_strategy?.lump_sum_amount || 0;
    let sourceAssetId = plan.funding_source;

    if (initialAmount > 0) {
        let sourceAsset = null;

        // Step A: If source ID is provided, try to find that specific asset
        if (sourceAssetId) {
            sourceAsset = await FinancialAsset.findOne({ _id: sourceAssetId, user_id: user._id });
        }

        // Step B: Smart Match - If no ID or ID not found, find the best cash account (highest balance)
        if (!sourceAsset) {
            console.log(`[Goal Activation] 🔍 Finding best cash account for deduction...`);
            const cashAccounts = await FinancialAsset.find({ 
                user_id: user._id, 
                record_type: 'Asset',
                category: 'Cash_Bank' 
            }).sort({ value: -1 }); // Get highest balance first

            if (cashAccounts.length > 0) {
                sourceAsset = cashAccounts[0];
                console.log(`[Goal Activation] ✨ Smart matched account: ${sourceAsset.name} (Balance: ${sourceAsset.value})`);
            }
        }
        
        if (sourceAsset) {
            console.log(`[Goal Activation] 💸 Deducting initial lump sum ${initialAmount} from ${sourceAsset.name}`);
            const oldValue = sourceAsset.value;
            sourceAsset.value = Math.max(0, sourceAsset.value - initialAmount);
            await sourceAsset.save();
            console.log(`[Goal Activation] Updated ${sourceAsset.name}: ${oldValue} -> ${sourceAsset.value}`);

            // NOTE: One-Off Lump Sum is handled as a physical transfer. 
            // We NO LONGER create a CashFlow record for it to keep the planning view clean.
            // The deduction is already reflected in the asset balance.

            // --- 1.3 Create Detailed Investment Assets based on Portfolio Weights ---
            const portfolio = plan.selected_portfolio;
            
            if (portfolio && portfolio.products?.length > 0) {
                console.log(`[Goal Activation] 🧩 Fragmenting investment into ${portfolio.products.length} products...`);
                
                for (const item of portfolio.products) {
                    const productAmount = Math.round(initialAmount * (item.weight_pct / 100));
                    if (productAmount <= 0) continue;

                    const productDoc = await Product.findById(item.product_id);
                    const productName = productDoc ? productDoc.name : `Investment Product`;
                    
                    let productCat = 'Invest_ManagedFund';
                    if (productDoc) {
                        if (productDoc.category === 'KiwiSaver') productCat = 'KiwiSaver';
                        else if (productDoc.category === 'Fund') productCat = 'Invest_ManagedFund';
                        else if (productDoc.category === 'TermDeposit') productCat = 'Cash_TermDeposit';
                    } else {
                        productCat = goal.category === 'retirement' ? 'KiwiSaver' : 'Invest_ManagedFund';
                    }

                    await FinancialAsset.create({
                        user_id: user._id,
                        name: `${productName} (${goal.goal_name})`,
                        record_type: 'Asset',
                        category: productCat,
                        value: productAmount,
                        source_product_id: item.product_id,
                        is_liquid: productCat !== 'KiwiSaver',
                        asset_details: {
                            linked_goal_id: goal._id,
                            strategy: plan.strategy_profile,
                            is_auto_generated: true,
                            weight_pct: item.weight_pct
                        }
                    });
                    console.log(`   + Created asset: ${productName} ($${productAmount})`);
                }
            } else {
                // Fallback: If no specific portfolio products, create a generic one
                const investmentAssetName = `${goal.goal_name} Portfolio`;
                const isRetirement = goal.category === 'retirement';
                
                await FinancialAsset.create({
                    user_id: user._id,
                    name: investmentAssetName,
                    record_type: 'Asset',
                    category: isRetirement ? 'KiwiSaver' : 'Invest_ManagedFund',
                    value: initialAmount,
                    is_liquid: !isRetirement,
                    asset_details: {
                        linked_goal_id: goal._id,
                        strategy: plan.strategy_profile,
                        is_auto_generated: true
                    }
                });
                console.log(`[Goal Activation] 📈 Created generic investment asset: ${investmentAssetName}`);
            }
        } else {
            console.error(`[Goal Activation] ❌ No suitable cash account found for deduction of ${initialAmount}`);
        }
    }

    // --- 2. Handle Recurring Contributions (Atomic CashFlow Linkage) ---
    const monthlyAmount = plan.contribution?.amount || plan.contribution_strategy?.monthly_amount || 0;
    const portfolio = plan.selected_portfolio;
    
    if (monthlyAmount > 0) {
        console.log(`[Goal Activation] 🗓️ Setting up atomic recurring contributions for total: ${monthlyAmount}/month`);
        
        if (portfolio && portfolio.products?.length > 0) {
            // Fragment the monthly contribution according to portfolio weights
            for (const item of portfolio.products) {
                const productMonthlyAmount = Math.round(monthlyAmount * (item.weight_pct / 100));
                if (productMonthlyAmount <= 0) continue;

                const productDoc = await Product.findById(item.product_id);
                const productName = productDoc ? productDoc.name : `Investment`;

                await CashFlow.create({
                    user_id: user._id,
                    name: `${productName} (${goal.goal_name})`,
                    type: 'Investment',
                    category: 'Goal_Contribution',
                    amount: productMonthlyAmount,
                    frequency: 'Monthly',
                    timing_mode: 'Specific_Date',
                    anchor_date: 1, 
                    is_variable: false,
                    icon: goal.icon || 'target',
                    color: '#4F46E5' 
                });
                console.log(`   + Created recurring cashflow: ${productName} ($${productMonthlyAmount}/mo)`);
            }
        } else {
            // Fallback: Generic single contribution record
            await CashFlow.create({
                user_id: user._id,
                name: `Contribution: ${goal.goal_name}`,
                type: 'Investment',
                category: 'Goal_Contribution',
                amount: monthlyAmount,
                frequency: 'Monthly',
                timing_mode: 'Specific_Date',
                anchor_date: 1, 
                is_variable: false,
                icon: goal.icon || 'target',
                color: '#4F46E5' 
            });
            console.log(`   + Created generic recurring cashflow: $${monthlyAmount}/mo`);
        }
    }
};

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

  // 3. Trigger Linkage Logic (Financial Activation)
  await handlePlanActivation(req.user, goal, plan);

  // 4. If we have a session ID, update decision logs with the goal ID
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
  const userId = req.user._id;
  const filter = { user_id: userId };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  // 1. Fetch Goals
  const goals = await Goal.find(filter).sort({ rank: 1, created_at: -1 }).lean();

  // 2. Fetch Plans & Financial Assets for all goals in parallel
  const goalIds = goals.map(g => g._id);
  const [plans, assets] = await Promise.all([
    Plan.find({ goal_id: { $in: goalIds } }).populate('selected_portfolio.products.product_id').lean(),
    FinancialAsset.find({ user_id: userId }).lean()
  ]);

  // 3. Merge Plan and REAL-TIME current_amount into Goal
  const goalsWithLiveStats = goals.map(goal => {
    const plan = plans.find(p => p.goal_id.toString() === goal._id.toString());
    
    // Calculate real-time current_amount based on associated assets in Wealth Center
    const associatedAssets = assets.filter(a => a.asset_details?.linked_goal_id?.toString() === goal._id.toString());
    const liveCurrentAmount = associatedAssets.reduce((sum, a) => sum + (a.value || 0), 0);

    return { 
        ...goal, 
        current_amount: liveCurrentAmount, // OVERWRITE with real asset value
        plan: plan || null 
    };
  });

  res.json(goalsWithLiveStats);
});

// @desc    Get a single goal by id
// @route   GET /api/goals/:id
// @access  Private
export const getGoalById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const goal = await Goal.findOne({ _id: req.params.id, user_id: userId }).lean();

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  // Fetch Plan and Associated Assets for real-time progress
  const [plan, associatedAssets] = await Promise.all([
    Plan.findOne({ goal_id: goal._id }).populate('selected_portfolio.products.product_id').lean(),
    FinancialAsset.find({ 
        user_id: userId, 
        'asset_details.linked_goal_id': goal._id.toString() 
    }).lean()
  ]);

  const liveCurrentAmount = associatedAssets.reduce((sum, a) => sum + (a.value || 0), 0);

  res.json({ 
    ...goal, 
    current_amount: liveCurrentAmount, // Real-time value injected directly from assets
    plan: plan || null 
  });
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
  const goalId = req.params.id;
  const goal = await Goal.findOne({ _id: goalId, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  console.log(`[Goal Deletion] 🗑️ Cleaning up for Goal: ${goal.goal_name}`);

  // 1. Unlink Assets (Keep the money, just remove the goal association)
  // We keep the actual FinancialAsset records but clear the goal link
  await FinancialAsset.updateMany(
    { 
        user_id: req.user._id,
        'asset_details.linked_goal_id': goalId 
    },
    { 
        $set: { 
            'asset_details.linked_goal_id': null,
            'asset_details.is_legacy_goal_asset': true,
            'asset_details.original_goal_name': goal.goal_name
        }
    }
  );
  console.log(`[Goal Deletion] 📉 Unlinked existing investment assets (kept in Wealth Center)`);

  // 2. Cleanup linked CashFlows (Stop future recurring contributions)
  // We MUST delete these as the investment plan is now cancelled
  const cashFlowResult = await CashFlow.deleteMany({
    user_id: req.user._id,
    $or: [
        { name: `Contribution: ${goal.goal_name}` },
        { name: `Lump Sum: ${goal.goal_name}` }
    ]
  });
  console.log(`[Goal Deletion] 💸 Stopped ${cashFlowResult.deletedCount} future/recurring contribution records`);

  // 3. Cleanup Plan
  await Plan.deleteOne({ goal_id: goalId });

  // 4. Finally remove the Goal itself
  await Goal.deleteOne({ _id: goalId });

  res.status(200).json({ 
    message: 'Goal removed. Future contributions stopped. Existing assets retained.',
    cleanupSummary: {
        cashFlowsDeleted: cashFlowResult.deletedCount
    }
  });
});
