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
- UX paradigm: "Canva for Finance" – changes in numbers should map cleanly to visuals (Gap Bridge, Risk Speedometer, Twin Projection).

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
- Clean and complete the goal definition: target amount, target date, priority (need/want/wish).
- Run a simple feasibility/gap check using current_amount and contribution_plan if available.

What you must do:
- Normalise fields (e.g. ensure positive numbers, sensible dates).
- Compute simple gap metrics: target_amount - current_amount (if both are present).
- Propose 2–3 adjustment options: e.g. "increase recurring_amount", "delay due_date", "lower target_amount".
`.trim();

    case GOAL_ENGINE_STAGES.STRATEGY:
      return `
Stage: 2 · Strategic Guardrails (Risk & Allocation)

Goal:
- Recommend an appropriate risk strategy for this goal, based on time horizon, priority and user/global risk tolerance.

What you must do:
- Suggest recommended_risk (low-risk / middle-risk / high-risk).
- Explain the rationale in user-friendly language (inflation, volatility, horizon).
- Indicate if the current riskTolerance on the goal is outside the recommended guardrail zone.
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
                  enum: ['number', 'text', 'select', 'date', 'slider', 'toggle'],
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
              },
              required: ['name', 'label', 'type'],
            },
          },
        },
        required: ['fields'],
      },
      ai_decision: {
        type: 'object',
        description: 'AI decision payload for this stage.',
        additionalProperties: true,
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


