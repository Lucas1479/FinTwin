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
- External Knowledge: If context.external_knowledge is provided, you MUST ground facts in it. Prefer its summary/passages, do not invent URLs. If no URL is given, still include title/source.

General rules for ALL stages:
- Always follow NZ retail investor context and plain-English explanations.
- Never make irreversible investment commitments; only propose configurations and trade-offs.
- Return ONLY JSON. Do not include commentary outside JSON.
- Be conservative with assumptions; prefer under-promising and over-delivering.
`.trim();

// ==========================================
// SUBSTAGE-SPECIFIC PROMPTS (Definition Stage)
// ==========================================

function getGoalDiscoverySubstagePrompt() {
  return `
Stage: 1.1 · Goal Discovery

Goal: Understand the user's lifestyle vision, categorize it, and draft initial parameters for their review.

What you must do:
1.  **Analyze & Categorize**: Determine goal category (retirement/home/education/wealth/travel/vehicle/emergency/custom), 'goal_name', and priority.
2.  **Draft Parameters (Auto-Fill)**:
    *   Extract explicit values (e.g., "$50k/year").
    *   **Intelligent Estimation**: If exact numbers aren't given but context exists (e.g., "comfortable lifestyle"), PROPOSE realistic starting values in the JSON fields rather than leaving them empty.
    *   *Retirement*: living_expense_pa, location
    *   *Home*: property_price_estimate, deposit_percentage, location, is_first_home
    *   *Other*: target_amount, due_date
3.  **Engage (User Guidance)**:
    *   **Persona**: Warm, visionary financial co-pilot.
    *   **Approach**: Instead of listing "Missing Fields", acknowledge the user's vision and explain *why* specific details (like location or budget) help make the plan real.
    *   **Call to Action**: Invite the user to review/adjust the drafted numbers in the form or provide more details in chat.

Rules:
- Return JSON only.
- If critical info is totally absent and you cannot estimate, ask conversationally (e.g., "To get us started, are you thinking of a local retirement or somewhere overseas?").
- **Do not** output a robotic checklist of missing fields.
- Set next_substage to 'assumptions'.
`.trim();
}

function getAssumptionsSubstagePrompt(substageData = {}) {
  const discovery = substageData?.goal_discovery || {};
  const category = discovery.category || 'general';
  
  return `
Stage: 1.2 · Assumptions

Goal: Define key financial assumptions for planning.

Background context from Goal Discovery:
- Category: ${category}
- Goal: ${discovery.goal_name || 'Financial goal'}
${discovery.living_expense_pa ? `- Living expense: $${discovery.living_expense_pa}/year` : ''}
${discovery.property_price_estimate ? `- Property price: $${discovery.property_price_estimate}` : ''}
${discovery.target_amount ? `- Target: $${discovery.target_amount}` : ''}

What you must do:
- Return common assumptions: expected_return_pct, inflation_pct, risk_attitude
- Category-specific assumptions:
  * Retirement: retirement_age, life_expectancy, include_superannuation
  * Home: mortgage_rate_pct, loan_term_years
- Provide user_guidance explaining the recommended assumptions
- Set next_substage to 'gap_analysis'

CRITICAL: NZ Super Eligibility Logic
- Analyze user context (age, residency cues if any) to determine NZ Super eligibility.
- Default 'include_superannuation' to true for NZ residents/citizens.
- If 'include_superannuation' is true, your 'rationale' MUST explain: "I've included NZ Super in your plan, which reduces your self-funding requirement by ~$24k/year."
- If false, explain why (e.g., "Assuming you may not meet the 10-year residency rule...").

Rules:
- Return JSON only. Focus on assumptions fields ONLY.
- Your rationale should explain why these assumptions make sense for this goal.
- Reference NZ context: typical returns 5-7%, inflation 2-3%, retirement age 65, NZ Super available.
`.trim();
}

function getGapAnalysisSubstagePrompt(substageData = {}) {
  const discovery = substageData?.goal_discovery || {};
  const assumptions = substageData?.assumptions || {};
  const category = discovery.category || 'general';
  
  return `
Stage: 1.3 · Gap Analysis & Feasibility Check

Goal: Display the user's REAL financial position and provide a GENTLE feasibility assessment.

Background context:
- Category: ${category}
- Goal: ${discovery.goal_name || 'Financial goal'}
${discovery.living_expense_pa ? `- Living expense: $${discovery.living_expense_pa}/year` : ''}
${discovery.target_amount ? `- Target: $${discovery.target_amount}` : ''}
${assumptions.expected_return_pct ? `- Expected return: ${assumptions.expected_return_pct}%` : ''}
${assumptions.retirement_age ? `- Retirement age: ${assumptions.retirement_age}` : ''}
${assumptions.life_expectancy ? `- Life expectancy: ${assumptions.life_expectancy}` : ''}
${assumptions.include_superannuation !== undefined ? `- Include NZ Super: ${assumptions.include_superannuation}` : ''}

CRITICAL: Real Financial Data (AVAILABLE Assets Only)
- Check context.real_financial_snapshot for AVAILABLE (unallocated) assets
- IMPORTANT: These amounts EXCLUDE assets already bound to other goals (similar to how monthly_surplus excludes contributions to other goals)
- If real_financial_snapshot.has_data === true:
  * Return those EXACT values (liquid_assets, investments, debts, current_super_balance, monthly_income)
  * Your rationale should say: "Based on your available assets from Wealth Centre (excluding amounts already allocated to other goals)..."
  * If user has multiple retirement goals, only show unallocated KiwiSaver
- If real_financial_snapshot.has_data === false:
  * Return null/0 for asset fields
  * Your rationale should say: "We don't have your financial data yet. Please update in Wealth Centre."

What you must do:
1. Return available asset fields (use real_financial_snapshot if available):
   - liquid_assets: Cash & savings (immediate access, unallocated)
   - investments: Other investments excluding KiwiSaver (unallocated)
   - current_super_balance: Available KiwiSaver balance (unallocated)
   - debts: Total liabilities (all debts, not goal-specific)
   - monthly_income: Monthly income from cash flow

2. Calculate required amount (if not already in context):
   - Retirement: (living_expense_pa - (include_superannuation ? 24000 : 0)) × 25
     * NZ Super (~$24k) reduces the self-funding requirement significantly.
   - Home: property_price_estimate
   - Other: target_amount

3. Calculate gap (required - current_total)

4. Provide GENTLE user_guidance:
   - Explicitly mention if you adjusted for NZ Super in your calculation explanation.
   - If gap is large: "Consider adjusting your timeline or target. Gap is common for long-term goals."
   - If gap is manageable: "Your goal looks achievable with consistent contributions."
   - NEVER say the goal is impossible
   - ALWAYS offer constructive next steps

5. Set next_substage to 'done'

Rules:
- Return JSON only. Focus on gap_analysis fields ONLY.
- Be ENCOURAGING, not discouraging. Gap is normal for low-net-worth individuals.
- Your rationale should be 2-3 sentences, empathetic and constructive.
- Reference NZ context: KiwiSaver, NZ Super baseline, typical savings rates.
`.trim();
}

function getStagePrompt(stage, substage = null, substageData = {}) {
  if (stage === GOAL_ENGINE_STAGES.DEFINITION) {
    // Substage-specific prompts for Definition stage
    if (substage === 'assumptions') {
      return getAssumptionsSubstagePrompt(substageData);
    }
    if (substage === 'gap_analysis') {
      return getGapAnalysisSubstagePrompt(substageData);
    }
    // Default: goal_discovery or initial input
    return getGoalDiscoverySubstagePrompt();
  }
  
  // Other stages remain the same
  switch (stage) {

    case GOAL_ENGINE_STAGES.STRATEGY:
      return `
Stage: 2 · Strategic Guardrails (Risk & Structure)

Goal:
- Recommend an appropriate ECONOMIC EXPOSURE (growth / defensive / liquidity) and CONTRIBUTION STRUCTURE based on the goal context AND simulated user profile. Do NOT pick specific products here.

**CRITICAL - Use Definition Stage Data:**
You MUST use the parameters that the user provided in Definition stage (Stage 1), which are in context.goalContext.goal_details:
- retirement_age, life_expectancy, living_expense_pa (for retirement goals)
- expected_return_pct, inflation_pct (user's assumptions for projections)
- risk_attitude, cashflow_flexibility (user's risk profile)
- target_amount, due_date, priority (goal parameters)
- liquid_assets, investments, debts, current_super_balance, monthly_income (AVAILABLE assets from Gap Analysis)

IMPORTANT: The asset amounts (liquid_assets, investments, current_super_balance) represent AVAILABLE (unallocated) assets only - they exclude amounts already bound to other goals. This is similar to how monthly_surplus excludes contributions to other goals.

These are the REAL values the user confirmed. DO NOT fabricate or re-estimate these values.

Analysis Logic:
1. **Start with Definition data**: Read context.goalContext.goal_details for all user-confirmed parameters (retirement_age, living_expense_pa, expected_return_pct, inflation_pct, risk_attitude, etc.).
2. **Enrich with real financial position**: Use context.goalContext.simulation_data.financials for current cash flow and surplus (monthly_income, monthly_surplus, liquid_capital).
3. **Calculate contribution requirement**:
   - For retirement: Use living_expense_pa × (life_expectancy - retirement_age), adjust for inflation_pct and NZ Super if applicable
   - Calculate funding gap: target_amount - (current_super_balance + liquid_assets + investments - debts)
   - Use expected_return_pct and years_to_goal to calculate required monthly_amount
   - Ensure monthly_amount ≤ available monthly_surplus (from simulation_data.financials)
4. **Risk alignment**: Use risk_attitude from goal_details (not derived profile) to set economic_exposure. If user selected 'balanced', don't override to 'growth' without justification.
5. **Glide path**: If horizon > 15 years and goal is retirement, include glide_path to de-risk before goal date.
6. **Implementation_notes**: Only hint wrappers (e.g., kiwisaver / managed_fund / cash) and product_count_hint; DO NOT list specific funds.

What you must do:
- Populate 'ai_decision':
   - target_amount: For retirement, output the CALCULATED total funding need. For others, carry forward user's target.
- Populate 'ai_decision.strategy_recommendation':
   - economic_exposure (growth/defensive/liquidity) - aligned with user's risk_attitude from goal_details
   - allocation (stocks/bonds/cash) consistent with economic_exposure
   - glide_path if applicable (for long-term goals)
   - contribution_strategy with CALCULATED amounts:
       * mode: lump_sum / recurring / hybrid (based on available surplus and lump sum capital)
       * monthly_amount: MUST be calculated based on gap, expected_return_pct, and horizon. If calculation shows required amount > monthly_surplus, set to max affordable and note the shortfall.
       * lump_sum_amount: Use liquid_assets if mode includes lump_sum
       * income_linked: true if recurring/hybrid
       * escalation_rate_pct: Use inflation_pct from goal_details as baseline
       * reserve_for_other_goals_pct: if provided in simulation_data
   - implementation_notes and consistency_check (note if required contribution > available surplus, or if goal may be underfunded)
- Explain WHY in 'rationale', referencing:
   - Specific numbers from goal_details (e.g., "Your target of $800k over 35 years...")
   - Calculation logic (e.g., "With 6% expected return and 2.5% inflation...")
   - Feasibility (e.g., "This requires $X/month, you have $Y surplus available")
   - Risk alignment (e.g., "Your 'balanced' risk preference suggests...")
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

// ==========================================
// SUBSTAGE-SPECIFIC SCHEMAS (Definition Stage)
// ==========================================

function getGoalDiscoverySchema() {
  return {
    type: 'object',
    properties: {
      ai_decision: {
        type: 'object',
        description: 'Goal Discovery: Extract core goal details only. DO NOT include form_schema - forms are predefined in frontend.',
        properties: {
          ...commonAiDecisionFields,
          substage: { type: 'string', const: 'goal_discovery' },
          next_substage: { type: 'string', const: 'assumptions' },
          user_guidance: { type: 'string' },
          // Core fields
          goal_name: { type: 'string', description: 'REQUIRED: Extracted goal name' },
          category: { type: 'string', enum: ['retirement', 'home', 'education', 'wealth', 'travel', 'vehicle', 'emergency', 'custom'], description: 'REQUIRED' },
          priority: { type: 'string', enum: ['need', 'want', 'wish'] },
          // Category-specific discovery
          living_expense_pa: { type: 'number', description: '[retirement] Annual living expense' },
          location: { type: 'string', description: '[retirement/home] Location' },
          property_price_estimate: { type: 'number', description: '[home] Property price' },
          deposit_percentage: { type: 'number', description: '[home] Deposit %' },
          is_first_home: { type: 'boolean', description: '[home] First home buyer' },
          target_amount: { type: 'number', description: '[other] Target amount' },
          due_date: { type: 'string', description: '[other] Target date' }
        },
        required: ['thought_process', 'rationale', 'substage', 'next_substage', 'goal_name', 'category']
      }
    },
    required: ['ai_decision']
  };
}

function getAssumptionsSchema() {
  return {
    type: 'object',
    properties: {
      ai_decision: {
        type: 'object',
        description: 'Assumptions: Define planning assumptions only. DO NOT include form_schema - forms are predefined in frontend.',
        properties: {
          ...commonAiDecisionFields,
          substage: { type: 'string', const: 'assumptions' },
          next_substage: { type: 'string', const: 'gap_analysis' },
          user_guidance: { type: 'string' },
          // Common assumptions
          expected_return_pct: { type: 'number', description: 'Expected annual return %' },
          inflation_pct: { type: 'number', description: 'Expected inflation %' },
          risk_attitude: { type: 'string', enum: ['conservative', 'balanced', 'growth'], description: 'Risk attitude' },
          cashflow_flexibility: { type: 'string', enum: ['low', 'medium', 'high'] },
          // Retirement assumptions
          retirement_age: { type: 'number', description: '[retirement] Target retirement age' },
          life_expectancy: { type: 'number', description: '[retirement] Planning until age' },
          include_superannuation: { type: 'boolean', description: '[retirement] Include NZ Super' },
          // Home assumptions
          mortgage_rate_pct: { type: 'number', description: '[home] Mortgage rate %' },
          loan_term_years: { type: 'number', description: '[home] Loan term years' }
        },
        required: ['thought_process', 'rationale', 'substage', 'next_substage', 'expected_return_pct', 'inflation_pct', 'risk_attitude']
      }
    },
    required: ['ai_decision']
  };
}

function getGapAnalysisSchema() {
  return {
    type: 'object',
    properties: {
      ai_decision: {
        type: 'object',
        description: 'Gap Analysis: Quantify current position and gap. DO NOT include form_schema - forms are predefined in frontend.',
        properties: {
          ...commonAiDecisionFields,
          substage: { type: 'string', const: 'gap_analysis' },
          next_substage: { type: 'string', const: 'done' },
          user_guidance: { type: 'string' },
          // Common gap fields
          liquid_assets: { type: 'number', description: 'Liquid savings/cash' },
          investments: { type: 'number', description: 'Other investments' },
          debts: { type: 'number', description: 'Total debts/loans' },
          monthly_income: { type: 'number', description: 'Monthly income' },
          current_amount: { type: 'number', description: 'Current savings toward goal' },
          target_amount: { type: 'number', description: 'Calculated required amount (Gap + Current)' },
          // Retirement gap
          current_super_balance: { type: 'number', description: '[retirement] KiwiSaver balance' },
          annual_contribution: { type: 'number', description: '[retirement] Annual KiwiSaver contribution' }
        },
        required: ['thought_process', 'rationale', 'substage', 'next_substage', 'liquid_assets']
      }
    },
    required: ['ai_decision']
  };
}

function getStageResponseSchema(stage, substage = null) {
  // STAGE 1: DEFINITION - Substage-specific schemas
  if (stage === GOAL_ENGINE_STAGES.DEFINITION) {
    if (substage === 'assumptions') return getAssumptionsSchema();
    if (substage === 'gap_analysis') return getGapAnalysisSchema();
    // Default: goal_discovery
    return getGoalDiscoverySchema();
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
 * @param {string} [params.substage] - Current substage id (frontend state machine)
 * @param {Object} [params.substageData] - Confirmed substage data (background context)
 * @returns {{ prompt: string, context: object }}
 */
export function buildGoalEnginePrompt({ stage, goalContext, userInput, previousDecisions, substage, substageData }) {
  // Pass substage and substageData to get substage-specific prompt and schema
  const stagePrompt = getStagePrompt(stage, substage, substageData);
  const responseSchema = getStageResponseSchema(stage, substage);

  const prompt = `
${goalEngineSystemPrompt}

${stagePrompt}

Output requirements:
- Return JSON only.
- The JSON MUST follow the "responseSchema" described in the context under context.responseSchema.
- Do not include any natural-language text outside the JSON.
- Focus ONLY on the fields specified in the current substage schema.
`.trim();

  const context = {
    stage,
    goalContext: goalContext || {},
    userInput: userInput || {},
    previousDecisions: previousDecisions || [],
    substage: substage || 'goal_discovery',  // Default to goal_discovery if not specified
    substageData: substageData || {},
    responseSchema,
  };

  return { prompt, context };
}
