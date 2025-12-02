import asyncHandler from 'express-async-handler';
import Goal from '../models/goalModel.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// ==========================================
// Goal Information / CRUD Controller
// Handles creating, reading, updating and deleting
// finalized Goal documents for a specific user.
// ==========================================

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
export const createGoal = asyncHandler(async (req, res) => {
  const {
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
    inflation_adjusted,
    funding_mix,
    contribution_plan,
    goal_details,
    notes,
    linked_accounts,
  } = req.body;

  if (!goal_name || !category || !priority || !riskTolerance || !target_amount || !due_date) {
    throw new BadRequestError('Missing required goal fields');
  }

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
    inflation_adjusted,
    funding_mix,
    contribution_plan,
    goal_details,
    notes,
    linked_accounts,
  });

  res.status(201).json(goal);
});

// @desc    Get all goals for current user
// @route   GET /api/goals
// @access  Private
export const getGoals = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user._id };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const goals = await Goal.find(filter).sort({ rank: 1, created_at: -1 });
  res.json(goals);
});

// @desc    Get a single goal by id
// @route   GET /api/goals/:id
// @access  Private
export const getGoalById = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  res.json(goal);
});

// @desc    Update a goal
// @route   PUT /api/goals/:id
// @access  Private
export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  const updatableFields = [
    'goal_name',
    'icon',
    'category',
    'priority',
    'riskTolerance',
    'status',
    'rank',
    'target_amount',
    'current_amount',
    'due_date',
    'inflation_adjusted',
    'funding_mix',
    'contribution_plan',
    'goal_details',
    'notes',
    'linked_accounts',
    'strategy',
    'completed_at',
  ];

  updatableFields.forEach((field) => {
    if (typeof req.body[field] !== 'undefined') {
      goal[field] = req.body[field];
    }
  });

  const updated = await goal.save();
  res.json(updated);
});

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  res.status(200).json({ message: 'Goal removed' });
});


