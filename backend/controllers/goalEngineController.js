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

// Build a stage-aware Vectara query to enrich LLM with grounded knowledge
const buildRagQueryForStage = (stage, goalContext = {}, userInput = {}) => {
    const userText = userInput?.text?.trim();
    if (userText) {
        // Prefer the user's exact question for more precise retrieval
        return userText;
    }

    const goalName = goalContext.goal_name || goalContext.goal_title || goalContext.category || 'financial goal';
    const category = goalContext.category || 'general';
    const base = `Stage: ${stage}. Goal: ${goalName}. Category: ${category}.`;
    switch (stage) {
        case GOAL_ENGINE_STAGES.DEFINITION:
            return `${base} Need NZ personal finance references for goal definition, gap analysis, typical targets, KiwiSaver basics.`;
        case GOAL_ENGINE_STAGES.STRATEGY:
            return `${base} Need NZ strategy guardrails: economic exposure patterns, KiwiSaver vs managed fund trade-offs, tax/fee considerations.`;
        case GOAL_ENGINE_STAGES.PRODUCT:
            return `${base} Need portfolio construction references, fee/return ranges, diversification heuristics for KiwiSaver/ETFs in NZ.`;
        case GOAL_ENGINE_STAGES.SIMULATION:
            return `${base} Need feasibility checks, projection assumptions, common pitfalls for NZ retail investors.`;
        default:
            return `${base} General NZ personal finance references.`;
    }
};

const attachRagMetadata = (aiDecision, ragContext) => {
    if (!aiDecision) return aiDecision;

    const buildReferencesFromPassages = (passages = []) => {
        const seen = new Set();
        const unique = [];

        for (const p of passages) {
            const url = p?.url && p.url.trim() ? p.url.trim() : '';
            const title = p?.title || p?.source || 'Reference';
            const key = `${url || 'no-url'}::${title.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push({ ...p, url, title });
            if (unique.length >= 5) break;
        }

        return unique.map((p, idx) => {
            const url = p.url || '';
            const marker = `[${idx + 1}]`;
            let source = p?.source || (url ? (() => { try { return new URL(url).hostname; } catch { return 'Vectara'; } })() : 'Vectara');
            if (!source) source = 'Vectara';
            const snippet = p?.text;
            return { marker, title: p.title || 'Reference', url, source, snippet };
        });
    };

    let nextDecision = aiDecision;
    if (ragContext?.summary && !aiDecision.rag_summary) {
        nextDecision = {
            ...nextDecision,
            rag_summary: ragContext.summary
        };
    }

    if (ragContext?.passages?.length) {
        nextDecision = {
            ...nextDecision,
            references: buildReferencesFromPassages(ragContext.passages)
        };
    }

    return nextDecision;
};

const resolveTargetExposure = (goalContext = {}) => {
    const exposure =
        goalContext?.ai_decision?.strategy_recommendation?.economic_exposure ||
        goalContext?.simulation_data?.target_exposure ||
        goalContext?.strategy_summary?.target_exposure ||
        goalContext?.strategy_summary?.economic_exposure ||
        { growth: 60, defensive: 30, liquidity: 10 };

    return {
        growth: Number(exposure.growth) || 60,
        defensive: Number(exposure.defensive) || 30,
        liquidity: Number(exposure.liquidity) || 10
    };
};

const sanitizeProductSelection = (aiDecision, toolCalls = []) => {
    if (!aiDecision?.portfolio_options?.length) return aiDecision;
    const allowedIds = new Set();

    toolCalls.forEach((tc) => {
        const res = tc?.result;
        if (!res) return;
        if (res?.candidates) {
            const buckets = ['growth', 'defensive', 'liquidity'];
            buckets.forEach((bucket) => {
                (res.candidates?.[bucket] || []).forEach((p) => {
                    if (p?.id) allowedIds.add(String(p.id));
                });
            });
        }
        if (Array.isArray(res?.portfolio_options)) {
            res.portfolio_options.forEach((opt) => {
                (opt?.products || []).forEach((p) => {
                    if (p?.product_id) allowedIds.add(String(p.product_id));
                });
            });
        }
    });

    if (allowedIds.size === 0) return aiDecision;

    const sanitizedOptions = (aiDecision.portfolio_options || [])
        .map((opt) => {
            const products = (opt?.products || []).filter((p) => allowedIds.has(String(p.product_id)));
            if (products.length < 2) return null;
            return { ...opt, products };
        })
        .filter(Boolean);

    return {
        ...aiDecision,
        portfolio_options: sanitizedOptions
    };
};

const ASK_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        ai_decision: {
            type: 'object',
            properties: {
                thought_process: { type: 'string' },
                rationale: { type: 'string' },
                references: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            url: { type: 'string' },
                            source: { type: 'string' }
                        },
                        required: ['title']
                    }
                },
                rag_summary: { type: 'string' }
            },
            required: ['thought_process', 'rationale']
        }
    },
    required: ['ai_decision']
};

const SUMMARY_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: { type: 'string' }
    },
    required: ['summary']
};

const INTENT_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        intent: { type: 'string', enum: ['ask', 'auto'] },
        rationale: { type: 'string' }
    },
    required: ['intent']
};

const buildAskPrompt = () => `
You are the "FinTwin Copilot".

Task:
- Answer the user's question in English, clearly and concisely.
- Do NOT propose goal parameters or fill any forms.
- Do NOT assume you have chat history. If the user asks about prior messages you cannot see, say you do not have access.
- If external_knowledge is provided, ground factual statements in it and include references.

Output requirements:
- Return JSON only.
- The JSON MUST follow the "responseSchema" in context.responseSchema.
- Focus only on thought_process, rationale, references, and rag_summary.
`.trim();

const buildSummaryPrompt = () => `
You are generating a concise background summary for a financial planning assistant.

Rules:
- Write in English.
- Use ONLY facts stated explicitly by the user in ask_history and the current user_input.
- Do NOT infer, assume, or add advice.
- Do NOT write narrative sentences. Use short noun phrases only.
- Avoid "The user..." or "The request..." phrasing.
- Keep it short: 3-6 bullet fragments joined by " | ".
- If there is no useful information, return an empty summary.

Output requirements:
- Return JSON only.
- The JSON MUST follow the "responseSchema" in context.responseSchema.
`.trim();

const buildIntentPrompt = () => `
You are a routing assistant for a financial planning copilot.

Task:
- Decide whether the user's latest message should be handled as ASK (Q&A only) or AUTO (structured goal decision/fill).

Guidelines:
- Use ASK when the user is asking a factual question, clarification, or meta-question (e.g., "What was my last question?").
- Use AUTO when the user provides goal details, constraints, or requests planning decisions (e.g., "I want to retire at 65 with $60k/year").
- If ambiguous, prefer ASK to avoid unintended form filling.

Output requirements:
- Return JSON only.
- The JSON MUST follow the "responseSchema" in context.responseSchema.
`.trim();

const handleAskMode = async ({
    req,
    res,
    stage,
    goalContext,
    userInput,
    askHistory,
    useRag
}) => {
    const askPrompt = buildAskPrompt();
    let ragContext = null;
    let askContext = {
        stage,
        goalContext: goalContext || {},
        userInput: userInput || {},
        ask_history: askHistory,
        responseSchema: ASK_RESPONSE_SCHEMA
    };

    if (useRag) {
        const ragQuery = buildRagQueryForStage(stage, goalContext, userInput);
        try {
            ragContext = await llmService.fetchRagContext({
                query: ragQuery,
                stage,
                goalContext
            });
            if (ragContext) {
                askContext = {
                    ...askContext,
                    external_knowledge: ragContext
                };
                console.log(`[Goal Engine] RAG attached for ask mode: summary=${!!ragContext.summary}, passages=${ragContext.passages?.length || 0}`);
            }
        } catch (err) {
            console.warn('[Goal Engine] RAG fetch failed for ask mode:', err.message);
        }
    }

    if (req.headers.accept === 'text/event-stream' || req.body.stream) {
        console.log(`[Goal Engine] Ask Mode Stream (SSE)`);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullText = '';
        for await (const chunk of llmService.generateStream(askPrompt, askContext)) {
            if (chunk.type === 'text') {
                fullText += chunk.content;
                res.write(`data: ${JSON.stringify({ chunk: chunk.content })}\n\n`);
            }
        }

        let finalJson = null;
        try {
            const jsonStr = fullText.match(/\{[\s\S]*\}/)?.[0] || fullText;
            finalJson = JSON.parse(jsonStr);
            if (finalJson?.ai_decision) {
                finalJson.ai_decision = attachRagMetadata(finalJson.ai_decision, ragContext);
            }
        } catch (e) {
            console.warn('[Goal Engine] Ask mode JSON parse failed', e);
        }

        res.write(`data: ${JSON.stringify({ done: true, fullText, json: finalJson })}\n\n`);
        res.end();
        return;
    }

    const result = await llmService.generate(askPrompt, askContext);
    if (result?.json?.ai_decision) {
        result.json.ai_decision = attachRagMetadata(result.json.ai_decision, ragContext);
    }
    res.json(result);
};

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
  const { stage, goalContext, userInput, previousDecisions, substage, substageData } = req.body || {};
  const mode = req.body?.mode || 'auto';
  const askHistory = Array.isArray(req.body?.askHistory) ? req.body.askHistory : [];
  const useRagReq = req.body?.useRag;
  const useRagEnv = process.env.ENABLE_VECTARA_RAG === 'true';
  // request flag overrides env; otherwise env enables by default
  const useRag = useRagReq === true || (useRagReq === undefined && useRagEnv);

  console.log(`\n[Goal Engine] === Incoming Request ===`);
  console.log(`[Goal Engine] Stage: ${stage}`);
  console.log(`[Goal Engine] Category: ${goalContext?.category || 'Not specified'}`);
  console.log(`[Goal Engine] Mode: ${mode}`);
  if (userInput?.text) console.log(`[Goal Engine] User Input: "${userInput.text}"`);

  if (!stage || !Object.values(GOAL_ENGINE_STAGES).includes(stage)) {
    throw new BadRequestError('Valid stage is required', 'STAGE_REQUIRED');
  }

  const sanitizedAskHistory = askHistory
      .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string')
      .slice(-12)
      .map(item => ({ role: item.role, text: item.text }));

  // --- AGENT MODE: Route to ASK or AUTO ---
  if (mode === 'agent') {
      try {
          const intentPrompt = buildIntentPrompt();
          const intentContext = {
              userInput: userInput || {},
              goalContext: goalContext || {},
              ask_history: sanitizedAskHistory,
              responseSchema: INTENT_RESPONSE_SCHEMA
          };
          const intentResult = await llmService.generate(intentPrompt, intentContext);
          const intent = intentResult?.json?.intent || 'ask';
          console.log(`[Goal Engine] Agent intent: ${intent}`);
          if (intent === 'ask') {
              await handleAskMode({
                  req,
                  res,
                  stage,
                  goalContext,
                  userInput,
                  askHistory: sanitizedAskHistory,
                  useRag
              });
              return;
          }
      } catch (err) {
          console.warn('[Goal Engine] Agent intent routing failed, defaulting to ask mode:', err.message);
          await handleAskMode({
              req,
              res,
              stage,
              goalContext,
              userInput,
              askHistory: sanitizedAskHistory,
              useRag
          });
          return;
      }
  }

  // --- ASK MODE: No form filling, no summary generation ---
  if (mode === 'ask') {
      await handleAskMode({
          req,
          res,
          stage,
          goalContext,
          userInput,
          askHistory: sanitizedAskHistory,
          useRag
      });
      return;
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

  // --- REAL DATA ENRICHMENT (Definition Gap Analysis + Strategy Stage) ---
  let enrichedContext = { ...goalContext };
  const currentSubstage = substage || goalContext?.substage || goalContext?.currentSubstage || null;
  const confirmedSubstageData = substageData || goalContext?.substageData || goalContext?.substage_data || null;

  if (currentSubstage) {
      enrichedContext.substage = currentSubstage;
  }
  if (confirmedSubstageData) {
      enrichedContext.substage_data = confirmedSubstageData;
  }

  // === DEFINITION STAGE: Gap Analysis substage - Fetch real assets for display ===
  if (stage === GOAL_ENGINE_STAGES.DEFINITION && currentSubstage === 'gap_analysis') {
      const userId = req.user._id;
      
      try {
          const [assets, cashFlows] = await Promise.all([
              FinancialAsset.find({ user_id: userId }).lean(),
              CashFlow.find({ user_id: userId }).lean()
          ]);
          
          // Filter AVAILABLE assets using allocated_to_goal_id field
          // Assets are available if: (1) unallocated OR (2) allocated to current goal (re-editing case)
          const currentGoalId = goalContext?._id || goalContext?.goal_id;
          const availableAssets = assets.filter(a => {
              // Unallocated assets are available
              if (!a.allocated_to_goal_id) return true;
              
              // Assets allocated to current goal (when re-editing) are available
              if (currentGoalId && a.allocated_to_goal_id.toString() === currentGoalId.toString()) {
                  return true;
              }
              
              // Assets allocated to other goals are NOT available
              return false;
          });
          
          const allocatedCount = assets.length - availableAssets.length;
          console.log(`[Gap Analysis] Total assets: ${assets.length}, Available: ${availableAssets.length}, Allocated to other goals: ${allocatedCount}`);
          
          // Calculate AVAILABLE (unallocated) financial position
          const liquidAssets = availableAssets
              .filter(a => a.record_type === 'Asset' && a.is_liquid)
              .reduce((sum, a) => sum + (a.value || 0), 0);
          
          const investments = availableAssets
              .filter(a => a.record_type === 'Asset' && !a.is_liquid && 
                          !a.category?.toLowerCase().includes('property') &&
                          !a.category?.toLowerCase().includes('kiwisaver'))
              .reduce((sum, a) => sum + (a.value || 0), 0);
          
          // Debts are not goal-specific, so use all liabilities
          const debts = assets
              .filter(a => a.record_type === 'Liability')
              .reduce((sum, a) => sum + (a.value || 0), 0);
          
          const kiwiSaverAssets = availableAssets.filter(a => 
              a.record_type === 'Asset' && 
              (a.category?.toLowerCase().includes('kiwisaver') || 
               a.name?.toLowerCase().includes('kiwisaver'))
          );
          
          const currentSuperBalance = kiwiSaverAssets.reduce((sum, a) => sum + (a.value || 0), 0);
          
          // Calculate monthly income
          const incomes = cashFlows.filter(f => f.type === 'Income');
          const toAnnual = (amount, frequency) => {
              const multipliers = { 
                  weekly: 52, fortnightly: 26, monthly: 12, 
                  yearly: 1, annually: 1, annual: 1 
              };
              const freq = String(frequency || 'monthly').toLowerCase().replace(/\s+/g, '_');
              return (amount || 0) * (multipliers[freq] || 12);
          };
          const annualIncome = incomes.reduce((sum, f) => sum + toAnnual(f.amount, f.frequency), 0);
          const monthlyIncome = Math.round(annualIncome / 12);
          
          // Inject AVAILABLE (unallocated) assets for AI to reference
          // These are assets NOT already bound to other goals
          enrichedContext.real_financial_snapshot = {
              liquid_assets: Math.round(liquidAssets),
              investments: Math.round(investments),
              debts: Math.round(debts),
              current_super_balance: Math.round(currentSuperBalance),
              monthly_income: monthlyIncome,
              net_position: Math.round(liquidAssets + investments + currentSuperBalance - debts),
              data_source: 'wealth_centre',
              has_data: availableAssets.length > 0,
              asset_count: availableAssets.filter(a => a.record_type === 'Asset').length,
              note: 'These amounts exclude assets already allocated to other goals'
          };
          
          console.log(`[Gap Analysis] Real financial snapshot (available only):`, enrichedContext.real_financial_snapshot);
          console.log(`[Gap Analysis] Available asset breakdown:`, {
              available: availableAssets.length,
              byType: availableAssets.reduce((acc, a) => {
                  acc[a.record_type] = (acc[a.record_type] || 0) + 1;
                  return acc;
              }, {}),
              kiwisaver_detail: kiwiSaverAssets.map(a => ({
                  name: a.name,
                  value: a.value,
                  allocated_to: a.allocated_to_goal_id ? a.allocated_to_goal_id.toString() : 'unallocated'
              })),
              liquid_detail: availableAssets.filter(a => 
                  a.record_type === 'Asset' && a.is_liquid
              ).map(a => ({
                  name: a.name,
                  value: a.value,
                  category: a.category,
                  allocated_to: a.allocated_to_goal_id ? a.allocated_to_goal_id.toString() : 'unallocated'
              })),
              investments_detail: availableAssets.filter(a => 
                  a.record_type === 'Asset' && 
                  !a.is_liquid && 
                  !a.category?.toLowerCase().includes('property') &&
                  !a.category?.toLowerCase().includes('kiwisaver')
              ).map(a => ({
                  name: a.name,
                  value: a.value,
                  category: a.category,
                  allocated_to: a.allocated_to_goal_id ? a.allocated_to_goal_id.toString() : 'unallocated'
              }))
          });
      } catch (err) {
          console.warn('[Gap Analysis] Failed to fetch real assets, AI will provide guidance without pre-fill:', err.message);
          enrichedContext.real_financial_snapshot = {
              data_source: 'unavailable',
              has_data: false,
              error: err.message
          };
      }
  }

  // === EMERGENCY GOAL: Assumptions substage - Pre-fill financial profile ===
  if (stage === GOAL_ENGINE_STAGES.DEFINITION && goalContext?.category === 'emergency' && currentSubstage === 'assumptions') {
      const userId = req.user._id;
      try {
          console.log('[Emergency Goal] Fetching financial profile for assumptions pre-fill...');
          const [user, cashFlows, assets] = await Promise.all([
              User.findById(userId).lean(),
              CashFlow.find({ user_id: userId }).lean(),
              FinancialAsset.find({ user_id: userId }).lean()
          ]);

          // 1. Analyze CashFlows for Expenses (Fixed vs Variable)
          const expenses = cashFlows.filter(f => ['Expense', 'Liability', 'Subscription'].includes(f.type));
          
          let fixedSum = 0;
          let variableSum = 0;
          // Heuristic keywords for fixed expenses
          const fixedKeywords = ['rent', 'mortgage', 'insurance', 'loan', 'bill', 'utility', 'rates', 'council', 'power', 'internet', 'phone'];

          expenses.forEach(e => {
              // Normalize amount to monthly
              let multiplier = 1;
              const freq = (e.frequency || 'monthly').toLowerCase();
              if (freq.includes('week')) multiplier = 4.33;
              if (freq.includes('fortnight')) multiplier = 2.16;
              if (freq.includes('year') || freq.includes('annual')) multiplier = 1/12;
              
              const amount = (e.amount || 0) * multiplier;
              
              // Simple keyword matching for fixed vs variable
              const name = e.name?.toLowerCase() || '';
              const cat = e.category?.toLowerCase() || '';
              const isFixed = fixedKeywords.some(k => name.includes(k) || cat.includes(k));
              
              if (isFixed) fixedSum += amount;
              else variableSum += amount;
          });

          // 2. Risk Factors from Profile
          const dependents = user?.household?.dependents || 0;
          // Simple logic: if partnered, assume dual income potential; if dependents & single, single_parent
          const householdStructure = (user?.household?.partnered) ? 'dual_income' : (dependents > 0 ? 'single_parent' : 'single');
          
          // 3. Insurance Check (Income Protection)
          // Check expenses or assets for "Income Protection"
          const hasIP = expenses.some(e => e.name?.toLowerCase().includes('income protection')) || 
                        assets.some(a => a.name?.toLowerCase().includes('income protection'));

          // 4. Liquid Assets (for reference)
          const liquidAssets = assets
              .filter(a => a.record_type === 'Asset' && a.is_liquid)
              .reduce((s, a) => s + (a.value || 0), 0);

          // Inject into Context
          enrichedContext.user_financial_profile = {
              monthly_fixed_expenses: Math.round(fixedSum),
              monthly_variable_expenses: Math.round(variableSum),
              total_monthly_expenses: Math.round(fixedSum + variableSum),
              dependents,
              household_structure: householdStructure,
              has_income_protection: hasIP,
              liquid_assets: Math.round(liquidAssets),
              data_source: 'wealth_centre'
          };
          
          console.log(`[Emergency Goal] Injected financial profile:`, enrichedContext.user_financial_profile);

      } catch (err) {
          console.warn('[Emergency Goal] Failed to inject financial profile:', err);
      }
  }

  // === STRATEGY STAGE: Full enrichment ===
  if (stage === GOAL_ENGINE_STAGES.STRATEGY) {
      const userId = req.user._id;

      // Helper: convert amount to annual based on frequency
      // IMPORTANT:
      // - CashFlowModel uses: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Yearly' | 'One-Off'
      // - PlanModel uses: 'weekly' | 'fortnightly' | 'monthly' | 'lump_sum'
      // For multi-goal budgeting, we must support both (case-insensitive + synonyms).
      const normalizeFrequency = (frequency) => {
          if (!frequency) return null;
          const raw = String(frequency).trim();
          if (!raw) return null;

          const key = raw
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/-/g, '_');

          if (key === 'weekly') return 'weekly';
          if (key === 'fortnightly') return 'fortnightly';
          if (key === 'monthly') return 'monthly';
          if (key === 'yearly' || key === 'annually' || key === 'annual') return 'yearly';

          // Treat one-off / lump sum as non-recurring for surplus budgeting
          if (key === 'one_off' || key === 'oneoff') return 'one_off';
          if (key === 'lump_sum' || key === 'lumpsum') return 'lump_sum';

          return null;
      };

      const TO_ANNUAL = {
          weekly: 52,
          fortnightly: 26,
          monthly: 12,
          yearly: 1,
          one_off: 0,
          lump_sum: 0
      };

      const toAnnual = (amount, frequency) => {
          const amt = Number(amount) || 0;
          if (!amt) return 0;
          const f = normalizeFrequency(frequency);
          const multiplier = f ? (TO_ANNUAL[f] ?? 0) : 0;
          return amt * multiplier;
      };

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

  // --- Summary (Auto/Agent only, before decision prompt) ---
  const shouldGenerateSummary = (mode === 'auto' || mode === 'agent') && userInput?.text?.trim();
  if (shouldGenerateSummary) {
      try {
          const summaryPrompt = buildSummaryPrompt();
          const summaryContext = {
              user_input: userInput,
              ask_history: sanitizedAskHistory,
              goalContext: goalContext || {},
              responseSchema: SUMMARY_RESPONSE_SCHEMA
          };
          const summaryResult = await llmService.generate(summaryPrompt, summaryContext);
          const summaryText = summaryResult?.json?.summary ? String(summaryResult.json.summary).trim() : '';
          if (summaryText) {
              enrichedContext.ask_summary = summaryText;
          }
      } catch (err) {
          console.warn('[Goal Engine] Summary generation failed:', err.message);
      }
  }

  // --- RAG enrichment (Vectara) ---
  let ragContext = null;
  if (useRag) {
      const ragQuery = buildRagQueryForStage(stage, enrichedContext, userInput);
      try {
          ragContext = await llmService.fetchRagContext({
              query: ragQuery,
              stage,
              goalContext: enrichedContext
          });
          if (ragContext) {
              enrichedContext.external_knowledge = ragContext;
              console.log(`[Goal Engine] RAG attached from Vectara: summary=${!!ragContext.summary}, passages=${ragContext.passages?.length || 0}`);
          }
      } catch (err) {
          console.warn('[Goal Engine] RAG fetch failed, continue without RAG:', err.message);
      }
  }

  // Build stage-specific prompt + context (includes responseSchema)
  const { prompt, context } = buildGoalEnginePrompt({
    stage,
    goalContext: enrichedContext,
    userInput,
    previousDecisions,
    substage: currentSubstage,
    substageData: confirmedSubstageData,
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
          const productToolsForAI = productTools.definitions.filter(tool => tool.name === 'build_optimized_portfolios');
          console.log(`[Goal Engine] → Available tools: ${productToolsForAI.map(t => t.name).join(', ')}`);
          
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
              productToolsForAI,
              toolExecutorWithProgress  // Tool executor with progress updates
          );

          if (result?.json?.ai_decision) {
              // Enforce local portfolio optimization: AI should not construct portfolios.
              const exposure = resolveTargetExposure(enrichedContext);
              const localPortfolios = await productTools.buildOptimizedPortfolios({
                  target_growth_pct: exposure.growth,
                  target_defensive_pct: exposure.defensive,
                  target_liquidity_pct: exposure.liquidity,
                  max_fees: 2,
                  is_retirement_goal: enrichedContext?.category === 'retirement'
              });
              if (!localPortfolios?.error && Array.isArray(localPortfolios?.portfolio_options)) {
                  result.json.ai_decision.portfolio_options = localPortfolios.portfolio_options;
              }
              result.json.ai_decision = sanitizeProductSelection(result.json.ai_decision, result.toolCalls || []);
          }
          
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
          
          // If using SSE, stream rationale in chunks for smoother Stage 3 UX
          if (useSSE) {
              if (result.json?.ai_decision?.rationale) {
                  const normalized = result.json.ai_decision.rationale.replace(/\r\n/g, '\n');
                  const chunkSize = 200; // ~200 chars per SSE event
                  for (let i = 0; i < normalized.length; i += chunkSize) {
                      const slice = normalized.slice(i, i + chunkSize)
                          .replace(/\\/g, '\\\\')
                          .replace(/"/g, '\\"')
                          .replace(/\n/g, '\\n');
                      res.write(`data: ${JSON.stringify({ chunk: `{"rationale": "${slice}"}` })}\n\n`);
                  }
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
              
              if (result.json?.ai_decision) {
                  result.json.ai_decision = attachRagMetadata(result.json.ai_decision, ragContext);
              }

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
              
              // CRITICAL: Clean up known common LLM JSON syntax errors
              let cleanedJsonStr = jsonStr
                  .replace(/,\s*([\}\]])/g, '$1') // Remove trailing commas
                  .replace(/(\w+)\s*:\s*"/g, '"$1": "') // Ensure keys are quoted if missed (basic)
                  .replace(/\n/g, ' ') // Remove newlines within string for basic parsing
                  .trim();
              
              // If the regex above was too aggressive, we might have broken it. 
              // Let's try to parse the original first, then the cleaned one.
              try {
                  finalJson = JSON.parse(jsonStr);
              } catch (e1) {
                  console.warn("[Goal Engine] Direct JSON parse failed, trying cleaned version...");
                  finalJson = JSON.parse(cleanedJsonStr);
              }
              
              if (injectedSchema && finalJson) {
                  finalJson.form_schema = injectedSchema;
              }
              // [NEW] Inject Pre-Calculated Data if available (for Emergency Fund pre-fill)
              if (enrichedContext.user_financial_profile && finalJson) {
                  finalJson.ai_decision = {
                      ...(finalJson.ai_decision || {}),
                      user_financial_profile: enrichedContext.user_financial_profile
                  };
              }

          if (finalJson?.ai_decision) {
              finalJson.ai_decision = attachRagMetadata(finalJson.ai_decision, ragContext);
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

  // Ensure emergency profile data is returned inside ai_decision (not top-level)
  if (enrichedContext?.user_financial_profile && result?.json) {
      result.json.ai_decision = {
          ...(result.json.ai_decision || {}),
          user_financial_profile: enrichedContext.user_financial_profile
      };
  }

  if (result?.json?.ai_decision) {
      result.json.ai_decision = attachRagMetadata(result.json.ai_decision, ragContext);
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
