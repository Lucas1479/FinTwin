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
- Recommend an appropriate ASSET ALLOCATION (Stocks/Bonds/Cash) and FUNDING STRUCTURE (Product Types) based on the goal context AND simulated user profile.

Analysis Logic:
1. Context Check: Look at 'context.goalContext.simulation_data' for 'user_profile' (existing assets, surplus) and 'market_products'.
2. Time Horizon & Risk: 
   - < 3 years: Defensive.
   - 10+ years: Growth.
3. Structure (The "How"):
   - Utilize existing assets first if applicable.
   - If 'retirement': Prioritise 'KiwiSaver' (Tax efficient, locked) + 'Managed Funds' (Liquidity).
   - If 'home': 'KiwiSaver' (First Home Grant) + 'Term Deposits' or 'Savings' (Stable capital).
   - If 'wealth'/'custom': 'Managed Funds' or 'ETFs'.
   - If 'emergency': 'Savings' (High liquidity).
   - Match products from 'market_products' list to the buckets.

What you must do:
- Populate 'ai_decision.strategy_recommendation'.
- Suggest 'allocation' percentages (Asset Class Mix: Stocks/Bonds/Cash).
- Suggest 'funding_structure' (Product Type Mix): e.g. 50% KiwiSaver, 50% Managed Fund.
- Explain WHY in 'rationale', referencing the user's specific assets or surplus if relevant (e.g., "Use your $1200 monthly surplus to fund...").
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
  // For now, all stages share the same outer schema: { form_schema, ai_decision }
  return {
    type: 'object',
    properties: {
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
      ai_decision: {
        type: 'object',
        description: 'AI decision payload containing specific values to pre-fill or update in the frontend context.',
        // EXPLICIT PROPERTIES DEFINITION (Required by Gemini)
        properties: {
            rationale: { type: 'string', description: "Explanation of the AI's recommendation. Use Markdown for formatting (tables, lists)." },
            
            // --- NEW: Reasoning & References (Optional for compatibility) ---
            thought_process: { type: 'string', description: "Internal step-by-step reasoning (Chain of Thought). Optional." },
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
        required: ['rationale']
      },
    },
    required: ['form_schema', 'ai_decision'],
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
