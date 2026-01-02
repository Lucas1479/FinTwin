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
1. Use context.goalContext.simulation_data (user_profile, financials, target_exposure, contribution_strategy_hint).
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
Stage: 3 · Product Selection (Vehicle)

Goal:
- Suggest what types of financial products or account types could implement this strategy (concept-level only, not specific issuers).

What you must do:
- Suggest 1–3 product_types (e.g. "KiwiSaver Growth Fund", "High-yield savings", "Managed fund").
- For each product_type, give short pros/cons and how well it matches the strategy and time horizon.
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

// Minimal JSON schema for dynamic forms + AI decision payload.
// This is intentionally simple; can be expanded as the UI matures.
function getStageResponseSchema(stage) {
  // For now, all stages share the same outer schema: { ai_decision, form_schema }
  // We put ai_decision first to ensure reasoning is streamed first.
  return {
    type: 'object',
    properties: {
      ai_decision: {
        type: 'object',
        description: 'AI decision payload containing specific values to pre-fill or update in the frontend context.',
        // EXPLICIT PROPERTIES DEFINITION (Required by Gemini)
        properties: {
            // CRITICAL: thought_process and rationale are first for streaming UX
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
            },

            // Risk Profile (goal-level)
            risk_profile: {
                type: 'object',
                properties: {
                    attitude: { type: 'string', description: "conservative | balanced | growth | high growth" },
                    volatility_tolerance_pct: { type: 'number' },
                    max_drawdown_allowed_pct: { type: 'number' },
                    notes: { type: 'string' }
                }
            },

            // Core Fields
            goal_name: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string', enum: ['need', 'want', 'wish'] },
            target_amount: { type: 'number' },
            current_amount: { type: 'number' },
            due_date: { type: 'string', description: "ISO Date String YYYY-MM-DD" },
            
            // Strategy Fields
            riskTolerance: { type: 'string', enum: ['low-risk', 'middle-risk', 'high-risk'] },
            inflationAdjust: { type: 'boolean' },
            
            // NEW: Strategy Recommendation Object
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
                        description: "Recommended split across product types (buckets)",
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['KiwiSaver', 'Managed Fund', 'Term Deposit', 'Savings Account', 'ETF', 'Shares'] },
                                percentage: { type: 'number', description: "0-100" },
                                rationale: { type: 'string' }
                            },
                            required: ['type', 'percentage']
                        }
                    },
                    economic_exposure: {
                        type: 'object',
                        properties: {
                            growth: { type: 'number', description: "Growth/equity-like exposure %" },
                            defensive: { type: 'number', description: "Defensive/fixed-income exposure %" },
                            liquidity: { type: 'number', description: "Cash/liquidity exposure %" }
                        }
                    },
                    glide_path: {
                        type: 'object',
                        properties: {
                            enabled: { type: 'boolean' },
                            start_years_before_goal: { type: 'number' },
                            end_state: {
                                type: 'object',
                                properties: {
                                    growth: { type: 'number' },
                                    defensive: { type: 'number' },
                                    liquidity: { type: 'number' }
                                }
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
                        properties: {
                            exposure_vs_products_ok: { type: 'boolean' },
                            notes: { type: 'string' }
                        }
                    }
                },
                required: ['recommended_risk', 'allocation', 'funding_structure']
            },

            // Goal Details (Flattened or specific common fields)
            // Note: Gemini struggles with 'mixed' types, so we define common specific fields here
            retirement_age: { type: 'number' },
            life_expectancy: { type: 'number' },
            living_expense_pa: { type: 'number' },
            property_price_estimate: { type: 'number' },
            deposit_percentage: { type: 'number' },
            location: { type: 'string' },
            
            // Generic fallback for unmapped fields (JSON string)
            other_details_json: { type: 'string', description: "Stringified JSON for any other goal_details" }
        },
        required: ['thought_process', 'rationale']
      },
      form_schema: {
        type: 'object',
        description:
          'Dynamic form description for the frontend. Each field controls one input widget on the canvas.',
        properties: {
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                label: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['number', 'text', 'select', 'date', 'slider', 'toggle', 'currency', 'textarea'],
                },
                required: { type: 'boolean' },
                min: { type: 'number' },
                max: { type: 'number' },
                step: { type: 'number' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                },
                helpText: { type: 'string' },
                placeholder: { type: 'string' },
                defaultValue: { type: 'string' }
              },
              required: ['name', 'label', 'type'],
            },
          },
        },
        required: ['fields'],
      },
    },
    required: ['ai_decision', 'form_schema'],
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
