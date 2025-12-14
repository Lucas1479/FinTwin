import asyncHandler from 'express-async-handler';
import llmService from '../services/llmService.js';
import { BadRequestError } from '../utils/errors.js';
import { buildGoalEnginePrompt, GOAL_ENGINE_STAGES } from '../services/goalEnginePrompts.js';
import { getFormSchemaForCategory } from '../services/goalFormSchemas.js';
import { logDecision } from '../utils/memoryLogger.js';

// ==========================================
// Goal Engine / LLM decision entrypoint
// This is a thin API layer that forwards prompts
// and structured context to the LLMService.
// ==========================================

// @desc    Generate AI suggestion for goal decision
// @route   POST /api/goals/engine/generate
// @access  Private
export const generateGoalDecision = asyncHandler(async (req, res) => {
  const { stage, goalContext, userInput, previousDecisions } = req.body || {};

  if (!stage || !Object.values(GOAL_ENGINE_STAGES).includes(stage)) {
    throw new BadRequestError('Valid stage is required', 'STAGE_REQUIRED');
  }

  // --- Optimization: Predefined Schemas ---
  // If we are in 'definition' stage and have a known category, 
  // we can inject the static schema to save the LLM from hallucinating it.
  // The LLM still runs to generate "ai_decision" (advice, pre-fill values),
  // but we enforce the form structure.
  let injectedSchema = null;
  if (stage === GOAL_ENGINE_STAGES.DEFINITION && goalContext?.category) {
    injectedSchema = getFormSchemaForCategory(goalContext.category);
  }

  // --- MOCK DATA INJECTION (For Strategy Stage) ---
  // If we are in 'strategy' stage, inject user profile and market products
  // so the AI has something to analyze.
  // In a real app, this would come from the database (User Profile Service).
  let enrichedContext = { ...goalContext };
  
  if (stage === GOAL_ENGINE_STAGES.STRATEGY) {
      enrichedContext.simulation_data = {
          user_profile: {
              age: 30,
              income_pa: 85000,
              monthly_surplus: 1200,
              risk_tolerance_quiz: "high", // User says high, let's see if goal matches
              existing_assets: [
                  { type: "Cash", value: 15000, location: "Savings Account" },
                  { type: "KiwiSaver", value: 45000, location: "Simplicity Growth" },
                  { type: "Shares", value: 5000, location: "Sharesies" }
              ]
          },
          market_products: [
              { type: "KiwiSaver", category: "Growth", avg_return: 0.08, liquidity: "locked", description: "Long-term locked retirement savings" },
              { type: "KiwiSaver", category: "Conservative", avg_return: 0.04, liquidity: "locked", description: "Stable locked savings" },
              { type: "Managed Fund", category: "Index Global", avg_return: 0.09, liquidity: "high", description: "Liquid growth assets" },
              { type: "Term Deposit", category: "1 Year", rate: 0.055, liquidity: "low", description: "Fixed interest for short term" },
              { type: "Savings Account", category: "On-call", rate: 0.045, liquidity: "immediate", description: "Emergency cash" }
          ]
      };
  }

  // Build stage-specific prompt + context (includes responseSchema)
  const { prompt, context } = buildGoalEnginePrompt({
    stage,
    goalContext: enrichedContext,
    userInput,
    previousDecisions,
  });

  // If we have an injected schema, we could theoretically skip the LLM if we only wanted the form.
  // But usually we want the AI to also give advice or pre-fill values based on user chat.
  // For MVP: Let's run the LLM, but overwrite the 'form_schema' in the output 
  // with our high-quality static one if available.
  
  let result;
  try {
      result = await llmService.generate(prompt, context);
  } catch (err) {
      console.error("LLM Generation Failed:", err);
      // Fallback: If LLM fails but we have a static schema, return that at least.
      if (injectedSchema) {
          result = {
              json: {
                  form_schema: injectedSchema,
                  ai_decision: { rationale: "AI service unavailable, using standard template." }
              },
              text: "AI service unavailable, using standard template."
          };
      } else {
          throw err;
      }
  }

  // Overlay our static schema if it exists (it's better than what AI generates)
  if (injectedSchema && result.json) {
      result.json.form_schema = injectedSchema;
  }

  // --- CLEANUP: Ensure 'text' is user-friendly, not raw JSON ---
  // If the LLM returned structured data, we want the chat bubble to show the 'rationale' or 'text' field,
  // not the entire JSON string.
  if (result.json && result.json.ai_decision) {
      const decision = result.json.ai_decision;
      // Prefer explicit 'text' for chat, then 'rationale', then fallback to existing result.text
      if (decision.text) {
          result.text = decision.text;
      } else if (decision.rationale) {
          result.text = decision.rationale;
      }
      // If neither exists, we leave result.text as is (which might be the raw JSON, but better than nothing)
  }

  // Log to memory (instead of DB for now)
  logDecision({
      stage,
      category: goalContext?.category,
      input: userInput,
      output: result.json
  });

  res.json(result);
});
