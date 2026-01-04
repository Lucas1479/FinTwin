// Goal Engine prompt + state configuration
// Central place to keep system prompt and per-stage prompt builders.

export const GOAL_ENGINE_STAGES = {
  DEFINITION: 'definition',
  STRATEGY: 'strategy',
  PRODUCT: 'product',
  SIMULATION: 'simulation',
};

// High-level system prompt, shared across all stages
export const goalEngineSystemPrompt = `
You are the "FinTwin Goal Engine", an AI co-pilot for personal finance.
- Philosophy: "Transparent Co-piloting" – the human makes decisions; you explain trade-offs.
- UX paradigm: "Canva for Finance" – changes in numbers should map cleanly to visuals.
- Formatting: Use Markdown for tables, bold text, and lists in your response 'rationale' or 'text' fields.
- Transparency: If your model supports reasoning, provide your internal step-by-step thinking in the 'thought_process' field.
- Citations: Always include source references in the 'references' array when providing market data or policy information.

General rules for ALL stages:
- Always follow NZ retail investor context and plain-English explanations.
- Never make irreversible investment commitments; only propose configurations and trade-offs.
- Return ONLY JSON. Do not include commentary outside JSON.
- Be conservative with assumptions; prefer under-promising and over-delivering.
`.trim();

function getStagePrompt(stage) {
  switch (stage) {
    case GOAL_ENGINE_STAGES.DEFINITION:
      return `
Stage: 1 · Definition & Diagnostics (Reality Check)

Goal:
- Clean and complete the goal definition based on USER INPUT and current context.
- Run a simple feasibility/gap check using current_amount and contribution_plan if available.

CRITICAL: "Chat-to-Form" Logic
- If the 'userInput' contains specific intent (e.g., "I want to save 50k by 2030", "retirement at 60"), you MUST extract these values.
- Return these extracted values in the "ai_decision" object using keys that match the form schema.
- ALWAYS determine and return the "category" in "ai_decision". It MUST be one of: 'retirement', 'home', 'education', 'wealth', 'travel', 'vehicle', 'emergency', 'custom'. (Lowercase only).

What you must do:
- Normalise fields (e.g. ensure positive numbers, sensible dates).
- Compute simple gap metrics: target_amount - current_amount (if both are present).
- Propose 2–3 adjustment options: e.g. "increase recurring_amount", "delay due_date", "lower target_amount".
`.trim();

    case GOAL_ENGINE_STAGES.STRATEGY:
      return `
Stage: 2 · Strategic Guardrails (Risk & Structure)

Goal:
- Recommend an appropriate ECONOMIC EXPOSURE (growth / defensive / liquidity) and CONTRIBUTION STRUCTURE based on the goal context AND simulated user profile. Do NOT pick specific products here.

Analysis Logic:
1. Use context.goalContext.simulation_data (user_profile, financials, target_exposure, contribution_strategy_hint). Pay special attention to 'user_profile.vision_statement' to ensure strategy aligns with user's life philosophy.
2. Respect goal-level risk guardrails: volatility_tolerance_pct, max_drawdown_allowed_pct, goal priority & horizon.
3. Exposure-first: propose economic_exposure { growth, defensive, liquidity } summing to ~100%. If horizon permits, include glide_path (when to start de-risking, end_state exposure).
4. Contribution: propose contribution_strategy (mode: lump_sum / recurring / hybrid; monthly_amount; lump_sum_amount; income_linked; escalation_rate_pct).
5. Implementation_notes: only hint wrappers (e.g., kiwisaver / managed_fund / cash) and product_count_hint; DO NOT list specific funds.

What you must do:
- Populate 'ai_decision.strategy_recommendation':
   - economic_exposure (growth/defensive/liquidity).
   - allocation (stocks/bonds/cash) consistent with economic_exposure.
   - glide_path if applicable.
   - contribution_strategy with explicit mode (lump_sum / recurring / hybrid) and the relevant amounts:
       * recurring: monthly_amount (numeric).
       * lump_sum: lump_sum_amount (numeric).
       * hybrid: both monthly_amount and lump_sum_amount.
     Also specify income_linked (true/false) and escalation_rate_pct if recurring/hybrid.
     Include reserve_for_other_goals_pct if provided in context.
   - implementation_notes and consistency_check (note if exposure vs surplus/liquidity seems feasible).
- Explain WHY in 'rationale', referencing surplus, liquidity reserve for other goals, and horizon-fit.
`.trim();

    case GOAL_ENGINE_STAGES.PRODUCT:
      return `
Stage: 3 · Product Selection (Vehicle) - FUNCTION CALLING MODE

Goal: Present 2-3 portfolio options that match the strategy's economic exposure.

**NZ RETIREMENT CONTEXT (CRITICAL):**
- If context.strategy_summary.is_retirement is true, you MUST call build_optimized_portfolios with is_retirement_goal: true.
- In New Zealand, KiwiSaver is the primary vehicle for retirement due to the 3% Employer Match and $521.43 Annual Government Credit.
- Even if KiwiSaver fees look slightly higher than passive ETFs, the "free money" from contributions far outweighs the fee difference. ALWAYS prioritize including KiwiSaver for retirement goals.

**PRIMARY TOOL:**

build_optimized_portfolios(target_growth_pct, target_defensive_pct, target_liquidity_pct, is_retirement_goal)
→ Returns 3 PRE-OPTIMIZED portfolio options (lowest_cost, diversified, balanced)
→ Each portfolio already has optimal weights and calculated exposure
→ Just call it ONCE and use the results!

**WORKFLOW:**

Step 1: Get target exposure from context.strategy_summary.economic_exposure
Step 2: Determine if is_retirement_goal is true/false based on context.strategy_summary.is_retirement.
Step 3: Call build_optimized_portfolios({ 
  target_growth_pct: X, 
  target_defensive_pct: Y, 
  target_liquidity_pct: Z,
  is_retirement_goal: (context.strategy_summary.is_retirement === true)
})
Step 4: The tool returns ready-to-use portfolio_options
Step 5: Copy the portfolio_options to your response
Step 6: Add your AI value:
  - Explain which portfolio is BEST for this specific user's situation
  - If retirement, emphasize why the KiwiSaver component is included
  - Explain trade-offs between the options
  - Personalize rationale based on user's goal, timeline, and preferences

**YOUR ROLE AS AI ADVISOR:**

The tool does the heavy lifting (product selection + weight optimization).
Your job is to:
1. EXPLAIN why each portfolio suits different needs
2. RECOMMEND the best option for this user's specific context
3. HIGHLIGHT key trade-offs (fees vs diversification vs performance)
4. ADD CONTEXT from user's goal (e.g., "Since you're 20 years from retirement, the diversified option gives you time to recover from volatility")

**RESPONSE FORMAT:**
{
  "thought_process": "1. Identified goal as retirement. 2. Called build_optimized_portfolios with is_retirement_goal: true. 3. Selected balanced as best fit...",
  "rationale": "**My Recommendation:** [Explain which portfolio suits this user best and why KiwiSaver is used if applicable]...",
  "portfolio_options": [
    // Copy directly from tool output, with enhanced rationale
  ]
}

**RULES:**
- ALWAYS call build_optimized_portfolios() first
- DO NOT modify the weights or products - they are already optimized
- Focus on explanation and personalization, not calculation
`.trim();

    case GOAL_ENGINE_STAGES.SIMULATION:
      return `
Stage: 4 · Simulation & Commitment (Twin)

Goal:
- Provide a high-level projection summary: is this goal broadly plausible with current settings?

What you must do:
- Estimate a rough "plausible" boolean (true/false) and a short explanation.
- Provide 2–3 bullet-style impacts on the overall plan (e.g., "other goals may need to be delayed").
`.trim();

    default:
      return `
Stage: Unknown

Goal:
- Treat this as a generic review of the goal configuration.

What you must do:
- Summarise the goal in plain English and highlight obvious issues or missing fields.
`.trim();
  }
}

// ==========================================
// STAGE-SPECIFIC JSON SCHEMAS
// Each stage has its own schema to prevent AI from filling unrelated fields
// ==========================================

// Common fields shared across all stages
const commonAiDecisionFields = {
    thought_process: { type: 'string', description: "Internal step-by-step reasoning (Chain of Thought). MUST be the first field." },
    rationale: { type: 'string', description: "Explanation of the AI's recommendation. MUST be the second field. Use Markdown." },
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
    }
};

// Form schema structure (shared)
const formSchemaDefinition = {
    type: 'object',
    description: 'Dynamic form description for the frontend.',
    properties: {
        fields: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    label: { type: 'string' },
                    type: { type: 'string', enum: ['number', 'text', 'select', 'date', 'slider', 'toggle', 'currency', 'textarea'] },
                    required: { type: 'boolean' },
                    min: { type: 'number' },
                    max: { type: 'number' },
                    step: { type: 'number' },
                    options: { type: 'array', items: { type: 'string' } },
                    helpText: { type: 'string' },
                    placeholder: { type: 'string' },
                    defaultValue: { type: 'string' }
                },
                required: ['name', 'label', 'type'],
            },
        },
    },
    required: ['fields'],
};

function getStageResponseSchema(stage) {
  // STAGE 1: DEFINITION - Only goal definition fields
  if (stage === GOAL_ENGINE_STAGES.DEFINITION) {
    return {
      type: 'object',
      properties: {
        ai_decision: {
          type: 'object',
          description: 'AI decision for goal definition. DO NOT include strategy or product fields.',
          properties: {
            ...commonAiDecisionFields,
            // Risk Profile (initial assessment)
            risk_profile: {
                type: 'object',
                properties: {
                    attitude: { type: 'string', description: "conservative | balanced | growth" },
                    volatility_tolerance_pct: { type: 'number' },
                    max_drawdown_allowed_pct: { type: 'number' },
                    notes: { type: 'string' }
                }
            },
            // Core Goal Fields - ONLY THESE for Stage 1
            goal_name: { type: 'string', description: 'Extracted goal name from user input' },
            category: { type: 'string', description: 'MUST be one of: retirement, home, education, wealth, travel, vehicle, emergency, custom' },
            priority: { type: 'string', enum: ['need', 'want', 'wish'] },
            target_amount: { type: 'number', description: 'Target amount in NZD' },
            current_amount: { type: 'number', description: 'Current savings towards this goal' },
            due_date: { type: 'string', description: 'ISO Date String YYYY-MM-DD' },
            riskTolerance: { type: 'string', enum: ['low-risk', 'middle-risk', 'high-risk'] },
            inflationAdjust: { type: 'boolean' },
            // Retirement-specific fields
            retirement_age: { type: 'number' },
            life_expectancy: { type: 'number' },
            living_expense_pa: { type: 'number', description: 'Annual living expense in NZD' },
            // Home-specific fields
            property_price_estimate: { type: 'number' },
            deposit_percentage: { type: 'number' },
            location: { type: 'string' }
          },
          required: ['thought_process', 'rationale', 'goal_name', 'category']
        },
        form_schema: formSchemaDefinition
      },
      required: ['ai_decision', 'form_schema'],
    };
  }

  // STAGE 2: STRATEGY - Only strategy fields
  if (stage === GOAL_ENGINE_STAGES.STRATEGY) {
    return {
      type: 'object',
      properties: {
        ai_decision: {
          type: 'object',
          description: 'AI decision for investment strategy. DO NOT include product selection.',
          properties: {
            ...commonAiDecisionFields,
            risk_profile: {
                type: 'object',
                properties: {
                    attitude: { type: 'string' },
                    volatility_tolerance_pct: { type: 'number' },
                    max_drawdown_allowed_pct: { type: 'number' },
                    notes: { type: 'string' }
                }
            },
            // Carry forward goal info
            goal_name: { type: 'string' },
            category: { type: 'string' },
            // Strategy Recommendation - MAIN OUTPUT for Stage 2
            strategy_recommendation: {
                type: 'object',
                properties: {
                    recommended_risk: { type: 'string', enum: ['conservative', 'balanced', 'growth', 'aggressive'] },
                    allocation: {
                        type: 'object',
                        properties: {
                            stocks: { type: 'number', description: "Percentage 0-100" },
                            bonds: { type: 'number', description: "Percentage 0-100" },
                            cash: { type: 'number', description: "Percentage 0-100" }
                        },
                        required: ['stocks', 'bonds', 'cash']
                    },
                    funding_structure: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['KiwiSaver', 'Managed Fund', 'Term Deposit', 'Savings Account', 'ETF', 'Shares'] },
                                percentage: { type: 'number' },
                                rationale: { type: 'string' }
                            },
                            required: ['type', 'percentage']
                        }
                    },
                    economic_exposure: {
                        type: 'object',
                        properties: {
                            growth: { type: 'number' },
                            defensive: { type: 'number' },
                            liquidity: { type: 'number' }
                        }
                    },
                    glide_path: {
                        type: 'object',
                        properties: {
                            enabled: { type: 'boolean' },
                            start_years_before_goal: { type: 'number' },
                            end_state: {
                                type: 'object',
                                properties: { growth: { type: 'number' }, defensive: { type: 'number' }, liquidity: { type: 'number' } }
                            }
                        }
                    },
                    contribution_strategy: {
                        type: 'object',
                        properties: {
                            mode: { type: 'string', enum: ['lump_sum', 'recurring', 'hybrid'] },
                            monthly_amount: { type: 'number' },
                            lump_sum_amount: { type: 'number' },
                            income_linked: { type: 'boolean' },
                            escalation_rate_pct: { type: 'number' }
                        }
                    },
                    implementation_notes: {
                        type: 'object',
                        properties: {
                            expected_wrappers: { type: 'array', items: { type: 'string' } },
                            product_count_hint: { type: 'string' },
                            approximation_allowed: { type: 'boolean' },
                            liquidity_requirement: { type: 'string' }
                        }
                    },
                    consistency_check: {
                        type: 'object',
                        properties: { exposure_vs_products_ok: { type: 'boolean' }, notes: { type: 'string' } }
                    }
                },
                required: ['recommended_risk', 'allocation', 'economic_exposure']
            }
          },
          required: ['thought_process', 'rationale', 'strategy_recommendation']
        },
        form_schema: formSchemaDefinition
      },
      required: ['ai_decision'],
    };
  }

  // STAGE 3: PRODUCT - Portfolio options
  if (stage === GOAL_ENGINE_STAGES.PRODUCT) {
    return {
      type: 'object',
      properties: {
        ai_decision: {
          type: 'object',
          description: 'AI decision for product selection. Return 2-3 portfolio options.',
          properties: {
            ...commonAiDecisionFields,
            goal_name: { type: 'string' },
            category: { type: 'string' },
            // Portfolio Options - MAIN OUTPUT for Stage 3
            portfolio_options: {
                type: 'array',
                description: '2-3 different portfolio options for user to choose from',
                items: {
                    type: 'object',
                    properties: {
                        option_id: { type: 'string', description: 'Unique ID: lowest_cost, diversified, performance' },
                        option_name: { type: 'string', description: 'Display name for the portfolio option' },
                        description: { type: 'string', description: 'Key advantage of this portfolio' },
                        total_fees_estimate: { type: 'number', description: 'Estimated total weighted fees %' },
                        calculated_exposure: {
                            type: 'object',
                            description: 'CALCULATED weighted exposure = Σ(weight × product.allocation). Must match target ±5%',
                            properties: {
                                growth: { type: 'number', description: 'Weighted growth exposure %' },
                                defensive: { type: 'number', description: 'Weighted defensive exposure %' },
                                liquidity: { type: 'number', description: 'Weighted liquidity/cash exposure %' }
                            }
                        },
                        products: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    product_id: { type: 'string', description: 'Product ID (24-char hex) from search results' },
                                    weight_pct: { type: 'number', description: 'Allocation percentage 0-100, must sum to 100' },
                                    rationale: { type: 'string', description: 'Brief reason for selection' }
                                },
                                required: ['product_id', 'weight_pct']
                            }
                        }
                    },
                    required: ['option_id', 'option_name', 'calculated_exposure', 'products']
                }
            }
          },
          required: ['thought_process', 'rationale', 'portfolio_options']
        }
      },
      required: ['ai_decision'],
    };
  }

  // STAGE 4: SIMULATION - Plausibility check
  return {
    type: 'object',
    properties: {
      ai_decision: {
        type: 'object',
        properties: {
          ...commonAiDecisionFields,
          plausible: { type: 'boolean', description: 'Is the goal achievable with current settings?' },
          impacts: { 
            type: 'array', 
            items: { type: 'string' },
            description: '2-3 bullet-style impacts on the overall plan'
          }
        },
        required: ['thought_process', 'rationale', 'plausible']
      }
    },
    required: ['ai_decision'],
  };
}

/**
 * Build the prompt + context for a given stage.
 * @param {Object} params
 * @param {'definition'|'strategy'|'product'|'simulation'} params.stage
 * @param {Object} params.goalContext - Flattened goal state (Goal + related data)
 * @param {Object} [params.userInput] - Latest user input for this stage (if any)
 * @param {Object[]} [params.previousDecisions] - Optional previous AI decisions/logs
 * @returns {{ prompt: string, context: object }}
 */
export function buildGoalEnginePrompt({ stage, goalContext, userInput, previousDecisions }) {
  const stagePrompt = getStagePrompt(stage);
  const responseSchema = getStageResponseSchema(stage);

  const prompt = `
${goalEngineSystemPrompt}

${stagePrompt}

Output requirements:
- Return JSON only.
- The JSON MUST follow the "responseSchema" described in the context under context.responseSchema.
- Do not include any natural-language text outside the JSON.
`.trim();

  const context = {
    stage,
    goalContext: goalContext || {},
    userInput: userInput || {},
    previousDecisions: previousDecisions || [],
    responseSchema,
  };

  return { prompt, context };
}
