import asyncHandler from 'express-async-handler';
import llmService from '../services/llmService.js';
import { BadRequestError } from '../utils/errors.js';

// ==========================================
// Goal Engine / LLM decision entrypoint
// This is a thin API layer that forwards prompts
// and structured context to the LLMService.
// ==========================================

// @desc    Generate AI suggestion for goal decision
// @route   POST /api/goals/engine/generate
// @access  Private
export const generateGoalDecision = asyncHandler(async (req, res) => {
  const { prompt, context } = req.body || {};

  if (!prompt) {
    throw new BadRequestError('prompt is required', 'PROMPT_REQUIRED');
  }

  // context can include: stage, goalContext, user_input, previous_decisions, etc.
  const result = await llmService.generate(prompt, context || {});

  res.json(result);
});


