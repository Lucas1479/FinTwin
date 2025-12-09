import asyncHandler from 'express-async-handler';
import GoalDecisionLog from '../models/goalDecisionLogModel.js';
import { BadRequestError } from '../utils/errors.js';

// ==========================================
// Goal Decision / Reasoning Controller
// Handles logging and retrieving AI-assisted
// decision steps for the Goal Engine workflow.
// ==========================================

// @desc    Create a new decision log entry
// @route   POST /api/goals/:id/decisions
// @access  Private
export const createDecisionLogEntry = asyncHandler(async (req, res) => {
  const goalId = req.params.id || null;
  const {
    session_id,
    stage,
    step_index,
    agent_role,
    llm_model,
    goal_snapshot,
    form_schema,
    user_input,
    ai_decision,
    user_action,
    committed_to_goal,
  } = req.body;

  if (!session_id || !stage) {
    throw new BadRequestError('session_id and stage are required');
  }

  const log = await GoalDecisionLog.create({
    user_id: req.user._id,
    goal_id: goalId,
    session_id,
    stage,
    step_index,
    agent_role,
    llm_model,
    goal_snapshot,
    form_schema,
    user_input,
    ai_decision,
    user_action,
    committed_to_goal,
  });

  res.status(201).json(log);
});

// @desc    Get all decision logs for a specific goal (chronological)
// @route   GET /api/goals/:id/decisions
// @access  Private
export const getDecisionLogsForGoal = asyncHandler(async (req, res) => {
  const logs = await GoalDecisionLog.find({
    user_id: req.user._id,
    goal_id: req.params.id,
  }).sort({ created_at: 1 });

  res.json(logs);
});

// @desc    Get all decision logs for a specific session
// @route   GET /api/goals/decisions/session/:sessionId
// @access  Private
export const getDecisionLogsForSession = asyncHandler(async (req, res) => {
  const logs = await GoalDecisionLog.find({
    user_id: req.user._id,
    session_id: req.params.sessionId,
  }).sort({ created_at: 1 });

  res.json(logs);
});

