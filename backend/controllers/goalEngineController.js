import asyncHandler from 'express-async-handler';
import llmService from '../services/llmService.js';
import { BadRequestError } from '../utils/errors.js';
import { buildGoalEnginePrompt, GOAL_ENGINE_STAGES } from '../services/goalEnginePrompts.js';
import { getFormSchemaForCategory } from '../services/goalFormSchemas.js';
import { logDecision } from '../utils/memoryLogger.js';
import FinancialAsset from '../models/financialAssetModel.js';
import CashFlow from '../models/cashFlowModel.js';
import User from '../models/userModel.js';
import Plan from '../models/planModel.js';
import Goal from '../models/goalModel.js';
import Product from '../models/productModel.js';
import GoalDecisionLog from '../models/goalDecisionLogModel.js';
import productTools from '../services/productTools.js';

/**
 * Persist decision to database (GoalDecisionLog)
 * This creates a permanent record for audit trail and analytics
 */
const persistDecisionLog = async (params) => {
    const {
        userId,
        goalId,
        sessionId,
        stage,
        stepIndex = 0,
        agentRole = 'advisor',
        llmModel,
        goalSnapshot,
        formSchema,
        userInput,
        aiDecision,
        userAction = null
    } = params;
    
    try {
        const log = await GoalDecisionLog.create({
            user_id: userId,
            goal_id: goalId || null,
            session_id: sessionId,
            stage,
            step_index: stepIndex,
            agent_role: agentRole,
            llm_model: llmModel,
            goal_snapshot: goalSnapshot,
            form_schema: formSchema,
            user_input: userInput,
            ai_decision: {
                recommendation: aiDecision?.ai_decision || aiDecision,
                rationale: aiDecision?.ai_decision?.rationale || aiDecision?.rationale,
                plausible: true
            },
            user_action: userAction,
            committed_to_goal: false
        });
        console.log(`[Goal Engine] ✅ Decision logged to DB: ${log._id}`);
        return log;
    } catch (err) {
        console.error(`[Goal Engine] ⚠️ Failed to persist decision log:`, err.message);
        // Don't throw - logging failure shouldn't break the main flow
        return null;
    }
};

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

      const [assets, cashFlows, userDoc, plans, goals] = await Promise.all([
          FinancialAsset.find({ user_id: userId }).lean(),
          CashFlow.find({ user_id: userId }).lean(),
          User.findById(userId).lean(),
          Plan.find({ user_id: userId }).lean(),
          Goal.find({ user_id: userId }).lean()
      ]);

      const totalAssets = assets.filter(a => a.record_type === 'Asset').reduce((sum, a) => sum + (a.value || 0), 0);
      const totalLiabilities = assets.filter(a => a.record_type === 'Liability').reduce((sum, a) => sum + (a.value || 0), 0);
      const liquidCapital = assets.filter(a => a.record_type === 'Asset' && a.is_liquid).reduce((sum, a) => sum + (a.value || 0), 0);

      // Cashflow summary (monthly)
      const incomes = cashFlows.filter(f => f.type === 'Income');
      // Include all outflows: Expenses, Subscriptions, and Investment contributions
      const outflows = cashFlows.filter(f => f.type === 'Expense' || f.type === 'Subscription' || f.type === 'Investment');
      
      const annualIncome = incomes.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
      const annualOutflow = outflows.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
      
      const monthlyIncome = annualIncome / 12;
      const monthlyOutflow = annualOutflow / 12;
      const monthlySurplus = Math.max(0, monthlyIncome - monthlyOutflow);

      // Avoid single goal consuming all surplus; reserve 40% of the REMAINING surplus by default.
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
          attitude: (userDoc?.riskProfile?.level || overallRisk),
          volatility_tolerance_pct: userDoc?.riskProfile?.volatilityTolerance ?? (overallRisk.includes('high') ? 22 : overallRisk.includes('growth') ? 18 : overallRisk.includes('balanced') ? 12 : 8),
          max_drawdown_allowed_pct: userDoc?.riskProfile?.maxDrawdown ?? (overallRisk.includes('high') ? 30 : overallRisk.includes('growth') ? 25 : overallRisk.includes('balanced') ? 15 : 10),
          notes: userDoc?.riskProfile?.notes || 'Derived from user profile; tighten if goal priority is high.'
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

      // Build other_goals from existing Plans (monthly normalized), excluding current goal if id known
      const toMonthly = (amount, freq) => {
          const annual = toAnnual(amount, freq);
          return annual / 12;
      };
      const currentGoalId = goalContext?._id || goalContext?.goal_id;
      const otherGoals = plans.map(p => {
          const goal = goals.find(g => g._id.toString() === p.goal_id.toString());
          const name = goal?.goal_name || 'Goal';
          const priority = goal?.priority || 'want';
          const monthly = p.contribution?.amount ? toMonthly(p.contribution.amount, p.contribution.frequency) : 0;
          return {
              goal_id: p.goal_id,
              name,
              priority,
              monthly_allocation: Math.round(monthly)
          };
      }).filter(g => g.monthly_allocation > 0 && (!currentGoalId || g.goal_id.toString() !== currentGoalId.toString()));

      const reservedOtherGoals = otherGoals.reduce((sum, g) => sum + (g.monthly_allocation || 0), 0);
      const allocatableSurplus = Math.max(0, monthlySurplus - reservedOtherGoals);

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
              monthly_outflow: Math.round(monthlyOutflow),
              monthly_surplus_total: Math.round(monthlySurplus),
              monthly_surplus_allocatable: Math.round(allocatableSurplus),
              reserve_for_other_goals_pct: 40,
              reserved_other_goals: reservedOtherGoals
          },
          target_exposure: targetExposure,
          contribution_strategy_hint: contributionStrategy,
          other_goals: (goalContext?.simulation_data?.other_goals?.length ? goalContext.simulation_data.other_goals : otherGoals),
          implementation_notes: implementationNotes,
          // Keep a minimal product list as hint; real selection happens in Stage 3.
          market_products: [
              { type: 'KiwiSaver', category: 'Growth', avg_return: 0.08, liquidity: 'locked', description: 'Long-term retirement savings' },
              { type: 'Managed Fund', category: 'Global Index', avg_return: 0.07, liquidity: 'high', description: 'Liquid diversified fund' },
              { type: 'Cash', category: 'Savings', rate: 0.045, liquidity: 'immediate', description: 'Emergency buffer' }
          ]
      };
  }

  // --- PRODUCT STAGE: Use Function Calling (NOT loading all products!) ---
  // Instead of loading 300+ products into context (expensive!),
  // we let AI call search_products() tool to find relevant products.
  // This is the "AI负责想参数，代码负责跑逻辑" architecture.
  if (stage === GOAL_ENGINE_STAGES.PRODUCT) {
      // We'll handle this with Function Calling below, not context injection
      console.log(`[Goal Engine] Product stage will use Function Calling for product search`);
      
      // Add strategy context for AI to reference when searching
      enrichedContext.strategy_summary = {
          target_exposure: goalContext.ai_decision?.strategy_recommendation?.economic_exposure || 
                          goalContext.simulation_data?.target_exposure,
          risk_profile: goalContext.ai_decision?.risk_profile,
          goal_horizon_years: goalContext.due_date 
              ? Math.max(0, (new Date(goalContext.due_date).getFullYear() - new Date().getFullYear()))
              : null,
          is_retirement: goalContext.category === 'retirement',
          contribution_mode: goalContext.ai_decision?.strategy_recommendation?.contribution_strategy?.mode
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
      // ==========================================
      // PRODUCT STAGE: Use Function Calling with SSE Progress
      // ==========================================
      if (stage === GOAL_ENGINE_STAGES.PRODUCT) {
          console.log(`[Goal Engine] 🔧 Product Stage: Using Function Calling architecture`);
          console.log(`[Goal Engine] → Available tools: ${productTools.definitions.map(t => t.name).join(', ')}`);
          
          // Use SSE to stream progress updates during Function Calling
          const useSSE = req.headers.accept === 'text/event-stream' || req.body.stream;
          
          if (useSSE) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              
              // Send initial progress
              res.write(`data: ${JSON.stringify({ 
                  chunk: '{"thought_process": "Analyzing your strategy to find matching products..."}' 
              })}\n\n`);
          }
          
        // Create a tool executor with progress updates
        const toolExecutorWithProgress = async (toolName, args) => {
            // Send progress update before tool execution
            if (useSSE) {
                const progressMsg = toolName === 'build_optimized_portfolios'
                    ? `Building optimized portfolios for ${args.target_growth_pct}% growth / ${args.target_defensive_pct}% defensive / ${args.target_liquidity_pct}% liquidity...`
                    : toolName === 'search_portfolio_candidates' 
                    ? `Searching products for ${args.target_growth_pct}% growth / ${args.target_defensive_pct}% defensive / ${args.target_liquidity_pct}% liquidity...`
                    : toolName === 'optimize_portfolio_weights'
                    ? `Optimizing weights for ${args.product_ids?.length || 0} products...`
                    : toolName === 'calculate_portfolio_exposure'
                    ? `Calculating portfolio exposure...`
                    : toolName === 'search_products'
                    ? `Searching ${args.category || args.strategy || 'products'}...`
                    : `Fetching product details...`;
                  
                  res.write(`data: ${JSON.stringify({ 
                      chunk: `{"thought_process": "${progressMsg}"}`,
                      toolCall: { name: toolName, args, status: 'executing' }
                  })}\n\n`);
              }
              
              // Execute the actual tool
              const result = await productTools.execute(toolName, args);
              
            // Send completion update
            if (useSSE) {
                const resultSummary = result?.portfolio_options?.length
                    ? `Built ${result.portfolio_options.length} optimized portfolios from ${result.summary?.candidates_searched || 0} products`
                    : result?.summary 
                    ? `Found ${result.summary.total_candidates} products (${result.summary.growth_count} growth, ${result.summary.defensive_count} defensive, ${result.summary.liquidity_count} liquidity)`
                    : result?.optimized_products?.length
                    ? `Optimized ${result.optimized_products.length} products`
                    : Array.isArray(result) 
                    ? `Found ${result.length} products`
                    : 'Search complete';
                  
                const resultCountNum = result?.portfolio_options?.length 
                    || result?.summary?.total_candidates 
                    || result?.optimized_products?.length 
                    || result?.length 
                    || 0;
                res.write(`data: ${JSON.stringify({ 
                    chunk: `{"thought_process": "${resultSummary}"}`,
                    toolCall: { name: toolName, status: 'complete', resultCount: resultCountNum }
                })}\n\n`);
              }
              
              return result;
          };
          
          result = await llmService.generateWithTools(
              prompt,
              context,
              productTools.definitions,
              toolExecutorWithProgress  // Tool executor with progress updates
          );
          
        console.log(`[Goal Engine] ✅ Function Calling complete. Tool calls made: ${result.toolCalls?.length || 0}`);
        if (result.toolCalls?.length > 0) {
            console.log(`[Goal Engine] Tool call summary:`);
            result.toolCalls.forEach((tc, i) => {
                // 根据不同工具类型正确计算结果数量
                const resultCount = tc.result?.portfolio_options?.length 
                    ? `${tc.result.portfolio_options.length} portfolios`
                    : tc.result?.summary?.total_candidates 
                    ? `${tc.result.summary.total_candidates} products`
                    : tc.result?.optimized_products?.length
                    ? `${tc.result.optimized_products.length} optimized`
                    : tc.result?.length || 0;
                console.log(`   ${i + 1}. ${tc.name}(${JSON.stringify(tc.args)}) → ${resultCount} results`);
            });
        }
          
          // If using SSE, send the final result and return
          if (useSSE) {
              // Send final rationale as streaming content
              if (result.json?.ai_decision?.rationale) {
                  res.write(`data: ${JSON.stringify({ 
                      chunk: `{"rationale": "${result.json.ai_decision.rationale.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}`
                  })}\n\n`);
              }
              
              // Log to memory
              logDecision({
                  stage,
                  category: goalContext?.category,
                  input: userInput,
                  output: result.json
              });
              
              // Persist to database (async, non-blocking)
              const sessionId = goalContext?.session_id || `session_${Date.now()}`;
              persistDecisionLog({
                  userId: req.user._id,
                  goalId: goalContext?.goal_id || null,
                  sessionId,
                  stage,
                  stepIndex: goalContext?.step_index || 0,
                  agentRole: 'advisor',
                  llmModel: process.env.LLM_PROVIDER || 'gemini',
                  goalSnapshot: {
                      goal_name: goalContext?.goal_name,
                      category: goalContext?.category,
                      target_amount: goalContext?.target_amount,
                      due_date: goalContext?.due_date
                  },
                  formSchema: result.json?.form_schema,
                  userInput: userInput,
                  aiDecision: result.json
              }).catch(err => console.error('[Goal Engine] Decision log persistence error:', err));
              
              // Send final complete message
              res.write(`data: ${JSON.stringify({ 
                  done: true, 
                  json: result.json,
                  toolCalls: result.toolCalls?.map(tc => ({ 
                      name: tc.name, 
                      resultCount: tc.result?.portfolio_options?.length 
                          || tc.result?.summary?.total_candidates 
                          || tc.result?.optimized_products?.length 
                          || tc.result?.length 
                          || 0 
                  }))
              })}\n\n`);
              res.end();
              return;
          }
      }
      // ==========================================
      // OTHER STAGES: Normal streaming/non-streaming
      // ==========================================
      else if (req.headers.accept === 'text/event-stream' || req.body.stream) {
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

              // Log to memory
              logDecision({
                  stage,
                  category: goalContext?.category,
                  input: userInput,
                  output: finalJson
              });
              
              // Persist to database (async, non-blocking)
              const sessionId = goalContext?.session_id || `session_${Date.now()}`;
              persistDecisionLog({
                  userId: req.user._id,
                  goalId: goalContext?.goal_id || null,
                  sessionId,
                  stage,
                  stepIndex: goalContext?.step_index || 0,
                  agentRole: 'advisor',
                  llmModel: process.env.LLM_PROVIDER || 'gemini',
                  goalSnapshot: {
                      goal_name: goalContext?.goal_name,
                      category: goalContext?.category,
                      target_amount: goalContext?.target_amount,
                      due_date: goalContext?.due_date
                  },
                  formSchema: finalJson?.form_schema,
                  userInput: userInput,
                  aiDecision: finalJson
              }).catch(err => console.error('[Goal Engine] Decision log persistence error:', err));
          } catch (e) {
              console.warn("Could not parse final JSON from stream", e);
              console.log("[Goal Engine] Raw Fallback Text:", fullText.slice(0, 500) + "...");
          }

          // Send a final message with the complete parsed data
          res.write(`data: ${JSON.stringify({ done: true, fullText, json: finalJson })}\n\n`);
          res.end();
          return;
      } else {
          // Legacy non-streaming path
          result = await llmService.generate(prompt, context);
          console.log(`[Goal Engine] Non-streaming Response JSON:`);
          console.log(JSON.stringify(result.json, null, 2));
      }
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
  if (injectedSchema && result?.json) {
      result.json.form_schema = injectedSchema;
  }

  // --- CLEANUP: Ensure 'text' is user-friendly, not raw JSON ---
  // If the LLM returned structured data, we want the chat bubble to show the 'rationale' or 'text' field,
  // not the entire JSON string.
  if (result?.json && result.json.ai_decision) {
      const decision = result.json.ai_decision;
      // Prefer explicit 'text' for chat, then 'rationale', then fallback to existing result.text
      if (decision.text) {
          result.text = decision.text;
      } else if (decision.rationale) {
          result.text = decision.rationale;
      }
      // If neither exists, we leave result.text as is (which might be the raw JSON, but better than nothing)
  }

  // Log to memory
  if (result) {
    logDecision({
        stage,
        category: goalContext?.category,
        input: userInput,
        output: result.json
    });
  }
  
  // Persist to database (async, non-blocking)
  const sessionId = goalContext?.session_id || `session_${Date.now()}`;
  if (result) {
    persistDecisionLog({
        userId: req.user._id,
        goalId: goalContext?.goal_id || null,
        sessionId,
        stage,
        stepIndex: goalContext?.step_index || 0,
        agentRole: 'advisor',
        llmModel: process.env.LLM_PROVIDER || 'gemini',
        goalSnapshot: {
            goal_name: goalContext?.goal_name,
            category: goalContext?.category,
            target_amount: goalContext?.target_amount,
            due_date: goalContext?.due_date,
            riskTolerance: goalContext?.riskTolerance
        },
        formSchema: result.json?.form_schema,
        userInput: userInput,
        aiDecision: result.json
    }).catch(err => console.error('[Goal Engine] Decision log persistence error:', err));
  }

  if (result) {
    res.json(result);
  } else {
    // If we reach here and result is still undefined, something went wrong but wasn't caught
    res.status(500).json({ message: 'Failed to generate goal decision' });
  }
});
