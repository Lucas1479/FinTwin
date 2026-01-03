import asyncHandler from 'express-async-handler';
import llmService from '../services/llmService.js';
import { BadRequestError } from '../utils/errors.js';
import { buildGoalEnginePrompt, GOAL_ENGINE_STAGES } from '../services/goalEnginePrompts.js';
import { getFormSchemaForCategory } from '../services/goalFormSchemas.js';
import { logDecision } from '../utils/memoryLogger.js';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import User from '../models/userModel.js';

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

  console.log(`\n[Goal Engine] === Incoming Request ===`);
  console.log(`[Goal Engine] Stage: ${stage}`);
  console.log(`[Goal Engine] Category: ${goalContext?.category || 'Not specified'}`);
  if (userInput?.text) console.log(`[Goal Engine] User Input: "${userInput.text}"`);

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

  // --- REAL DATA ENRICHMENT (Strategy Stage) ---
  // Replace mock profile with real wealth & cashflow data; fall back gracefully if missing.
  let enrichedContext = { ...goalContext };

  if (stage === GOAL_ENGINE_STAGES.STRATEGY) {
      const userId = req.user._id;

      // Helper: convert amount to annual based on frequency
      const TO_ANNUAL = { Weekly: 52, Fortnightly: 26, Monthly: 12, Yearly: 1, 'One-Off': 0 };
      const toAnnual = (amount, frequency) => amount * (TO_ANNUAL[frequency] || 0);

      const [assets, cashFlows, userDoc] = await Promise.all([
          FinancialAsset.find({ user_id: userId }).lean(),
          CashFlow.find({ user_id: userId }).lean(),
          User.findById(userId).lean()
      ]);

      const totalAssets = assets.filter(a => a.record_type === 'Asset').reduce((sum, a) => sum + (a.value || 0), 0);
      const totalLiabilities = assets.filter(a => a.record_type === 'Liability').reduce((sum, a) => sum + (a.value || 0), 0);
      const liquidCapital = assets.filter(a => a.record_type === 'Asset' && a.is_liquid).reduce((sum, a) => sum + (a.value || 0), 0);

      // Cashflow summary (monthly)
      const incomes = cashFlows.filter(f => f.type === 'Income');
      const expenses = cashFlows.filter(f => f.type === 'Expense' || f.type === 'Subscription');
      const annualIncome = incomes.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
      const annualExpense = expenses.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
      const monthlyIncome = annualIncome / 12;
      const monthlyExpense = annualExpense / 12;
      const monthlySurplus = Math.max(0, monthlyIncome - monthlyExpense);

      // Avoid single goal consuming all surplus; reserve 40% by default.
      const maxAllocatableSurplus = Math.max(0, monthlySurplus * 0.6);

      // Derive age & risk
      const age = (() => {
          const dob = userDoc?.household?.dob || userDoc?.dob; // Support migration
          if (!dob) return 30;
          const diff = Date.now() - new Date(dob).getTime();
          return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
      })();
      const overallRisk = (userDoc?.riskProfile?.level || userDoc?.riskTolerance || 'Balanced').toLowerCase();

      // Standardized risk profile for LLM
      const riskProfile = {
          attitude: overallRisk, // conservative | balanced | growth | high growth
          volatility_tolerance_pct: overallRisk.includes('high') ? 22 : overallRisk.includes('growth') ? 18 : overallRisk.includes('balanced') ? 12 : 8,
          max_drawdown_allowed_pct: overallRisk.includes('high') ? 30 : overallRisk.includes('growth') ? 25 : overallRisk.includes('balanced') ? 15 : 10,
          notes: 'Derived from user profile; tighten if goal priority is high.'
      };

      // Existing assets snapshot for context
      const existingAssets = assets
          .filter(a => a.record_type === 'Asset')
          .map(a => ({
              name: a.name,
              category: a.category,
              value: a.value,
              is_liquid: !!a.is_liquid,
              wrapper: a.category?.toLowerCase().includes('kiwisaver') ? 'kiwisaver' :
                        a.category?.toLowerCase().includes('fund') ? 'managed_fund' :
                        a.category?.toLowerCase().includes('cash') ? 'cash' : 'other'
          }));

      // Contribution strategy hint
      const contributionStrategy = {
          mode: liquidCapital > 0 && maxAllocatableSurplus > 0 ? 'hybrid'
               : maxAllocatableSurplus > 0 ? 'recurring'
               : liquidCapital > 0 ? 'lump_sum'
               : 'recurring',
          monthly_amount_hint: Math.round(maxAllocatableSurplus),
          lump_sum_hint: Math.round(liquidCapital * 0.2), // leave buffer; avoid draining liquidity
          income_linked: true,
          reserve_for_other_goals_pct: 40,
          rationale: 'Limit this goal to ~60% of monthly surplus to avoid starving other goals.'
      };

      // Implementation notes (product-agnostic)
      const implementationNotes = {
          expected_wrappers: ['kiwisaver', 'managed_fund', 'cash'],
          product_count_hint: '1-3',
          approximation_allowed: true,
          liquidity_requirement: goalContext?.due_date ? 'medium' : 'unspecified'
      };

      // Target exposure placeholder (economic exposure)
      const targetExposure = {
          growth: goalContext?.riskTolerance === 'high-risk' ? 75 : goalContext?.riskTolerance === 'low-risk' ? 45 : 60,
          defensive: goalContext?.riskTolerance === 'high-risk' ? 20 : goalContext?.riskTolerance === 'low-risk' ? 45 : 30,
          liquidity: 5
      };

      enrichedContext.simulation_data = {
          ...(goalContext?.simulation_data || {}),
          user_profile: {
              age,
              income_pa: Math.round(annualIncome),
              monthly_surplus: Math.round(monthlySurplus),
              risk_profile: riskProfile,
              existing_assets: existingAssets,
              vision_statement: userDoc?.household?.statement || ''
          },
          financials: {
              net_worth: totalAssets - totalLiabilities,
              liquid_capital: liquidCapital,
              monthly_income: Math.round(monthlyIncome),
              monthly_expense: Math.round(monthlyExpense),
              monthly_surplus_total: Math.round(monthlySurplus),
              monthly_surplus_allocatable: Math.round(maxAllocatableSurplus),
              reserve_for_other_goals_pct: 40
          },
          target_exposure: targetExposure,
          contribution_strategy_hint: contributionStrategy,
          other_goals: goalContext?.simulation_data?.other_goals || [],
          implementation_notes: implementationNotes,
          // Keep a minimal product list as hint; real selection happens in Stage 3.
          market_products: [
              { type: 'KiwiSaver', category: 'Growth', avg_return: 0.08, liquidity: 'locked', description: 'Long-term retirement savings' },
              { type: 'Managed Fund', category: 'Global Index', avg_return: 0.07, liquidity: 'high', description: 'Liquid diversified fund' },
              { type: 'Cash', category: 'Savings', rate: 0.045, liquidity: 'immediate', description: 'Emergency buffer' }
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
      // Check if client supports streaming (we can look for a specific flag in body or header)
      if (req.headers.accept === 'text/event-stream' || req.body.stream) {
          console.log(`[Goal Engine] Entering Stream Mode (SSE)`);
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          let fullText = '';
          for await (const chunk of llmService.generateStream(prompt, context)) {
              if (chunk.type === 'text') {
                  fullText += chunk.content;
                  // Send chunk to client in SSE format
                  res.write(`data: ${JSON.stringify({ chunk: chunk.content })}\n\n`);
              }
          }

          console.log(`[Goal Engine] Stream Finished. Accumulated Length: ${fullText.length}`);

          // At the end, try to parse the full accumulated text to see if we have valid JSON
          let finalJson = null;
          try {
              // Try to find JSON in the full text if it's wrapped in markdown or just raw
              const jsonStr = fullText.match(/\{[\s\S]*\}/)?.[0] || fullText;
              finalJson = JSON.parse(jsonStr);
              
              if (injectedSchema && finalJson) {
                  finalJson.form_schema = injectedSchema;
              }

              // --- LOGGING: Print final JSON for debugging ---
              console.log(`[Goal Engine] Final Parsed JSON:`);
              console.log(JSON.stringify(finalJson, null, 2));

              // Log to memory (instead of DB for now)
              logDecision({
                  stage,
                  category: goalContext?.category,
                  input: userInput,
                  output: finalJson
              });
          } catch (e) {
              console.warn("Could not parse final JSON from stream", e);
              console.log("[Goal Engine] Raw Fallback Text:", fullText.slice(0, 500) + "...");
          }

          // Send a final message with the complete parsed data
          res.write(`data: ${JSON.stringify({ done: true, fullText, json: finalJson })}\n\n`);
          res.end();
          return;
      }

      // Legacy non-streaming path
      result = await llmService.generate(prompt, context);
      console.log(`[Goal Engine] Non-streaming Response JSON:`);
      console.log(JSON.stringify(result.json, null, 2));
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
