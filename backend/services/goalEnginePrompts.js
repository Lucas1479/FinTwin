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
You are the "FinTwin Goal Engine", an expert AI advisor for personal finance.
- Philosophy: "Confident Co-piloting" – provide clear recommendations and explain trade-offs professionally. The human has final say, but you lead with expertise.
- Tone: Professional, assertive, and clear. State decisions directly. Avoid tentative language ("I recommend...", "you might consider..."). Instead: "Allocate...", "This requires...", "Your strategy is...".
- UX paradigm: "Canva for Finance" – changes in numbers should map cleanly to visuals.
- Formatting: Use Markdown for tables, bold text, and lists in your response 'rationale' or 'text' fields.
- Transparency: If your model supports reasoning, provide your internal step-by-step thinking in the 'thought_process' field.
- Citations: Always include source references in the 'references' array when providing market data or policy information.
- External Knowledge: If context.external_knowledge is provided, you MUST ground facts in it. Use its summary and passages as your primary source of truth.
- If external_knowledge is missing or weak, you MAY add 1-3 widely known public URLs as "ModelSuggested" sources, and clearly label them in the 'source' field as "ModelSuggested".
- If context.goalContext.ask_summary is provided, use it as background only. Do not quote or restate it in your response, and do not treat it as verified facts unless confirmed elsewhere.

General rules for ALL stages:
- Always follow NZ retail investor context and plain-English explanations.
- Never make irreversible investment commitments; only propose configurations and trade-offs.
- Return ONLY JSON. Do not include commentary outside JSON.
- Be confident but accurate with calculations; show your expertise through precise numbers and clear reasoning.
`.trim();

// ==========================================
// SUBSTAGE-SPECIFIC PROMPTS (Definition Stage)
// ==========================================

function getGoalDiscoverySubstagePrompt() {
  return `
Stage: 1.1 · Goal Discovery

Goal: Understand the user's lifestyle vision, categorize it, and draft initial parameters for their review.

What you must do:
1.  **Analyze & Categorize**: Determine goal category (retirement/home/education/wealth/travel/vehicle/emergency/big_purchase/custom), 'goal_name', and priority. Use 'big_purchase' for major purchases/events (wedding, luxury item, etc.), 'custom' only for truly undefined goals.
2.  **Draft Parameters (Auto-Fill)**:
    *   Extract explicit values (e.g., "$50k/year").
    *   **Intelligent Estimation**: If exact numbers aren't given but context exists (e.g., "comfortable lifestyle"), PROPOSE realistic starting values in the JSON fields rather than leaving them empty.
    *   *Retirement*: living_expense_pa (MUST include ALL annual costs: base living + regular travel/car/lumpy expenses), location
        - **CRITICAL**: For "annual travel" or frequent expenses, ADD them directly to living_expense_pa (e.g., 50k base + 10k travel = 60k total)
        - **lumpy_expenses**: ONLY use ['travel_biannual'] if user explicitly mentions "travel every 2 years" (adds 5k/year), or ['new_car_5y'] for car replacement (adds 4k/year). For annual travel, DO NOT use lumpy_expenses, include cost directly in living_expense_pa.
        - **Example**: "retirement with annual overseas travel" → living_expense_pa: 60000, explain "50k base living + 10k annual travel" in rationale
    *   *Home*: property_price_estimate, deposit_percentage, location, is_first_home
    *   *Education*: study_country (NZ/AU/UK/US), institution_tier (public/private), tuition_fees_pa, living_costs_pa
    *   *Vehicle*: tier (economy/family/luxury/performance/utility), brand (toyota/tesla/ford/mazda/byd/bmw/mercedes/other - lowercase only), condition (new/used), fuel_type (ev/hybrid/petrol/diesel)
    *   *Travel*: destination, adults, children, duration_days
    *   *Emergency*: monthly_spend_est, target_months_rough (3-6 months typical)
    *   *Wealth*: target_amount (portfolio size), target_passive_income (monthly), time_horizon_years
    *   *Big Purchase* (wedding/luxury item/event): target_amount, due_date, purchase_category, description
    *   *Custom/Other*: target_amount, due_date
3.  **Engage (User Guidance)**:
    *   **Persona**: Confident financial expert who understands their vision.
    *   **Approach**: Acknowledge the user's goal directly, and state what additional details would strengthen the plan (not "missing fields" - they're "refinements").
    *   **Call to Action**: Guide them to review/adjust the drafted numbers. Be direct: "Review these numbers" not "You might want to consider reviewing..."

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

If context.user_financial_profile exists (emergency fund pre-fill):
- It contains factual monthly expenses, dependents/household structure, income protection flag, and liquid assets pulled from Wealth Centre.
- **Do not invent or overwrite these numbers.** If present, echo them into ai_decision.user_financial_profile and reference them in your rationale (e.g., burn rate, volatility, insurance buffer).

What you must do:
- Return common assumptions: expected_return_pct, inflation_pct, risk_attitude
- Category-specific assumptions:
  * Retirement: retirement_age, life_expectancy, include_superannuation
  * Home: mortgage_rate_pct, loan_term_years
  * Emergency: use user_financial_profile to justify conservative, highly liquid assumptions; call out burn-rate implications and insurance presence/absence.
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

3. Calculate reference_gap for FEASIBILITY ASSESSMENT ONLY:
   - reference_gap = target_amount - (liquid_assets + current_super_balance + investments)
   - **CRITICAL: DO NOT subtract debts from available assets**
   - RATIONALE: Debt servicing costs are already reflected in monthly_surplus (cash flow impact). Debts affect cash flow, not investment capital availability. We handle debt through reduced surplus, not by reducing available assets.
   - Also calculate net_position = (assets - debts) as a separate risk indicator
   - IMPORTANT: This is a REFERENCE number to show feasibility. It does NOT represent actual allocation commitment.
   - For NEW goals, no assets are allocated yet, so this gap represents "how far you are from the target with available resources"
   - The actual allocation decision happens in Strategy stage (Stage 2)

4. Provide CLEAR, PROFESSIONAL user_guidance:
   - Use direct, confident language
   - If reference_gap is large: "Gap of $XXX from your $YYY available assets. This will be addressed through strategic allocation and monthly contributions in the next stage. Your $ZZZ monthly surplus (after debt servicing) provides strong foundation."
   - If reference_gap is manageable or negative: "Your available assets of $XXX cover the target. Next stage will optimize allocation strategy."
   - If net_position is negative or debts are substantial: "Net position: $XXX after $YYY debts. Your debt servicing is already factored into monthly surplus of $ZZZ."
   - Special notes (be factual, not cautionary):
     * For HOME goals with negative net_position: "Banks will assess debt-to-income ratio for loan approval."
     * For RETIREMENT goals: State NZ Super adjustment directly - "NZ Super (~$24k/year) reduces self-funding requirement."
   - Present facts clearly, not as warnings
   - Always end with: "Next stage: strategic allocation from your available assets."
   
   DO NOT:
   - Use tentative phrases ("this is common...", "you might want to consider...")
   - Over-explain or apologize for gaps
   - Present information as gentle suggestions
   
   DO:
   - State facts directly and professionally
   - Show path forward clearly
   - Demonstrate expertise through precision

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
- Determine the optimal ECONOMIC EXPOSURE (growth / defensive / liquidity) - THIS IS YOUR PRIMARY OUTPUT
- Calculate CONTRIBUTION STRUCTURE (lump sum + monthly) based on goal context and user profile
- Present your strategy with confidence and precision using structured markdown format
- Do NOT pick specific products here - that happens in Stage 3

**PRIMARY OUTPUT: Economic Exposure**
You MUST determine and clearly present the economic exposure allocation (growth/defensive/liquidity percentages) based on:
1. Goal timeline (longer = more growth potential)
2. User's risk_attitude (conservative/balanced/growth)
3. Growth requirement (how much the portfolio needs to grow)
4. Goal priority (need = conservative, wish = aggressive)

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
3. **Calculate contribution requirement (CRITICAL - Multi-Goal Resource Allocation)**:
   - For NEW goals: allocated_amount = 0 (no assets have been allocated yet)
   - Step 1: Recommend lump_sum allocation from available assets (liquid_assets from Gap Analysis)
     * Keep emergency fund buffer (typically 3-6 months expenses)
     * **DEBT CONSIDERATION (UNIVERSAL):**
       - DO NOT subtract debts from available assets for ANY goal type
       - RATIONALE: Debt servicing costs are already reflected in monthly_surplus (reduced cash flow). Debts affect monthly budget, not investment capital.
       - Debts are a RISK indicator (net_position, debt-to-income ratio), not an investment constraint
     * Example: From $349k available assets, recommend $60k allocation (保留 $289k for emergency/other goals)
     * Note: If user has $781k debts, their net_position is negative, but this doesn't reduce the $349k cash available for investment
   - Step 2: Calculate FUNDING GAP based on allocation decision
     * funding_gap = target_amount - lump_sum_allocation - allocated_amount
     * For NEW goal with $60k lump_sum: funding_gap = $480k - $60k - $0 = $420k
     * NOT: target_amount - (all available assets) ❌
     * NOT: target_amount - (available assets - debts) ❌
   - Step 3: Calculate required monthly_amount to fill funding_gap
     * Use portfolio_expected_return (from economic_exposure), inflation_pct, and years_to_goal
     * FV(lump_sum_allocation, years) + FV(monthly_amount, years) = target_amount
   - Step 4: Ensure monthly_amount ≤ available monthly_surplus (from simulation_data.financials)
4. **Risk alignment**: Use risk_attitude from goal_details (not derived profile) to set economic_exposure. If user selected 'balanced', don't override to 'growth' without justification.
5. **Glide path**: If horizon > 15 years and goal is retirement, include glide_path to de-risk before goal date.
6. **Implementation_notes**: Only hint wrappers (e.g., kiwisaver / managed_fund / cash) and product_count_hint; DO NOT list specific funds.

CRITICAL CONSISTENCY RULES (apply to all outputs):
- Use ONE surplus number only: monthly_surplus_allocatable if provided; otherwise compute from monthly_surplus_total after reserve_for_other_goals_pct and reserved_other_goals. Do NOT display multiple surplus variants.
- **EXPECTED RETURN CALCULATION (CRITICAL for consistency)**:
  Calculate portfolio expected return based on economic exposure:
  - growth_return = 8% (equities, property)
  - defensive_return = 4% (bonds, fixed income)
  - liquidity_return = 2% (cash, money market)
  
  portfolio_expected_return = (growth% × 8% + defensive% × 4% + liquidity% × 2%) / 100
  real_return = portfolio_expected_return - inflation_pct
  
  Example: 60/30/10 exposure with 2.5% inflation
  - Portfolio return: (60×8 + 30×4 + 10×2)/100 = 6.2%
  - Real return: 6.2% - 2.5% = 3.7%
  
- **HYBRID CONTRIBUTION CALCULATION (CRITICAL)**:
  If you recommend "hybrid", you MUST apply Time Value of Money consistently:
  1) Determine lump_sum allocation from available assets (e.g., $60k from $349k available)
  2) Calculate funding_gap = target_amount - lump_sum_allocation - allocated_amount
  3) Calculate expected portfolio return from exposure (see above)
  4) Calculate lump_sum FV: lump_sum_allocation × (1 + real_return)^years
  5) Calculate remaining_gap: funding_gap - (lump_sum_FV - lump_sum_allocation)
  6) Compute monthly_amount using FV annuity formula based on remaining_gap
  
  Example: Target=$480k, allocated=$0 (new goal), available_assets=$349k, debts=$781k, years=6
  - Lump allocation: $60k from $349k available (debts don't reduce available investment capital)
  - Funding gap: $480k - $60k - $0 = $420k
  - Real return: 3.7% (60/30/10 → 6.2% - 2.5% inflation)
  - Lump FV: $60k × 1.037^6 = $73.6k (growth: $13.6k)
  - Remaining: $420k - $13.6k = $406.4k
  - Monthly: Solve FV_annuity($X, 6 years, 3.7%) = $406.4k → $4,560/mo
  - Note: $781k debts affect monthly_surplus (through debt servicing), not lump sum calculation
  
  NOTE: The funding_gap is based on ALLOCATION DECISION ($60k), not available assets ($349k) or net position ($349k - $781k = -$431k). Debts are already accounted for in monthly_surplus.
  
- If lump_sum_amount >= gap (after considering FV), set monthly_amount = 0 and explain briefly.
- **IMPORTANT**: Do NOT use user's expected_return_pct directly for contribution calculations. The portfolio_expected_return derived from economic exposure is more accurate because it reflects the actual investment strategy. The user's expected_return_pct is only a general assumption from Stage 1 before strategy was determined.
- **EXPOSURE LANGUAGE ONLY**: Use ONLY economic exposure terms (growth/defensive/liquidity) in your rationale. DO NOT mention asset classes like stocks, bonds, cash, equities, or fixed income. These are implementation details handled later in product selection.

What you must do:
- Populate 'ai_decision':
   - target_amount: For retirement, output the CALCULATED total funding need. For others, carry forward user's target.
- Populate 'ai_decision.strategy_recommendation':
   - **economic_exposure (growth/defensive/liquidity) - THIS IS YOUR PRIMARY OUTPUT. ALWAYS INCLUDE IT PROMINENTLY.**
     * Determine based on: goal timeline (shorter = less growth), user's risk_attitude (conservative/balanced/growth), and growth requirement
     * Present clearly in rationale with percentages and expected returns
     * Aligned with user's risk_attitude from goal_details
   - glide_path if applicable (for long-term goals, especially retirement with 15+ year horizons)
   - contribution_strategy with CALCULATED amounts:
       * mode: lump_sum / recurring / hybrid (based on available surplus and lump sum capital)
      * lump_sum_amount: Recommended allocation from available liquid_assets, keeping emergency buffer (e.g., $60k from $349k available)
      * monthly_amount: MUST be calculated based on funding_gap (target - lump_sum - allocated), real_return_pct, and horizon. If calculation shows required amount > monthly_surplus_allocatable, set to max affordable and note the shortfall.
       * income_linked: true if recurring/hybrid
       * escalation_rate_pct: Use inflation_pct from goal_details as baseline
       * reserve_for_other_goals_pct: if provided in simulation_data
   - implementation_notes and consistency_check (note if required contribution > available surplus, or if goal may be underfunded)
- Explain WHY in 'rationale' with CONFIDENT, PROFESSIONAL tone:
   - Use assertive language: state decisions directly, not tentatively
   - CRITICAL: Use structured markdown format with clear headings
   - Structure: Economic Exposure → Allocation Decision → Funding Gap → Monthly Feasibility → Risk Notes
   
   **ECONOMIC EXPOSURE (MANDATORY - PRIMARY OUTPUT):**
   - This is your MOST IMPORTANT output - always include it prominently at the start of rationale
   - Determine based on: goal timeline, growth requirement, user's risk_attitude
   - Present in clear, structured markdown format with bold headings
   
   Required format:
   **Investment Strategy:**
   - **Growth:** 60% (equities, property, high-growth assets)
   - **Defensive:** 30% (bonds, fixed income)
   - **Liquidity:** 10% (cash, money market)
   - **Expected Return:** 6.2% (before inflation)
   - **Real Return:** 3.7% (after 2.5% inflation)
   
   Rationale: Your 'balanced' risk preference with 6-year timeline supports moderate growth exposure. 60% growth provides capital appreciation while 30% defensive reduces volatility.
   
   - Link exposure to goal characteristics: "6-year timeline allows for X% growth exposure", "Conservative preference suggests Y% defensive"
   - Show the portfolio return calculation clearly
   - Always calculate and show both expected return and real return (after inflation)
   
   **ALLOCATION DECISION:**
   - Lead with the decision: "Allocate $XXXk to this goal: $YYk liquid assets + $ZZk KiwiSaver."
   - Or: "Allocate $XXXk liquid assets (keeping $YYYk for emergency fund and other goals)."
   - Be direct and clear about the allocation strategy
   
   **FUNDING GAP:**
   - State the gap calculation: "After this $XXXk allocation, the remaining gap is $YYYk, which needs monthly contributions."
   - Show the math clearly and confidently
   
   **MONTHLY FEASIBILITY:**
   - Show calculation: "Using real return = X% - Y% = Z%, this requires $X/month."
   - State available surplus: "You have $Y monthly surplus available after other goals (already reduced by debt servicing)."
   - If shortfall: "Shortfall: $Z/month under target. Options: reduce target, extend timeline, or reallocate from other goals."
   - If sufficient: "This is well within your available surplus."
   - Be direct about feasibility - don't hedge
   
   **RISK NOTES (if applicable):**
   - For HOME goals with debts: "Banks will assess your debt-to-income ratio (current: $XXXk debts vs. $YYYk income)."
   - For RETIREMENT goals: State NZ Super impact directly if applicable
   - Keep it factual and professional, not cautionary
   
   DO NOT:
   - Use tentative language ("I recommend...", "you might consider...", "perhaps...")
   - Hedge decisions ("this could work...", "you may want to...")
   - Over-explain rationale for not subtracting debts (it's already correct in the calculation)
   - Skip or bury the economic exposure - it MUST be prominent
   
   DO:
   - ALWAYS lead with Economic Exposure in structured format
   - Be assertive and direct ("Allocate...", "This requires...", "Your strategy is...")
   - Show expertise through clear calculations
   - Present options when there are trade-offs, but do so confidently
   - Use markdown formatting (bold, bullets) for clarity
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

**Formatting (Markdown):**
- In your 'rationale', output each key section on its own line as a bullet: "**Retirement Funding Need:** ...", "**Funding Gap:** ...", "**Contribution Strategy:** ...", "**Risk Alignment:** ...", "**Glide Path:** ...".
- Avoid running them together in a single paragraph; each bullet should be a separate line to preserve layout.

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
- Give the user a brief conversational readout of the simulation (no tables needed; charts are handled locally).
- Anchor your explanation strictly on the provided simulation data; do NOT invent numbers or probabilities.

What you must do:
- Use local simulation outputs from context.goalContext (e.g., projection curves, confidence_level, funding_strategy, glide_path) and explain them in plain English.
- Use ONLY the provided summary fields in context.goalContext.simulation_data.projection_summary when available. Typical fields: success_probability_pct, p50_final, p90_final, p10_final, contributions_final, expected_return_pct, volatility_pct, horizon_years, monthly_contribution, lump_sum, target_amount, current_amount, glide_path_enabled.
- NEVER re-estimate success probability or exposures; if a field is missing, say it's not available rather than guessing.
- Estimate a rough "plausible" boolean (true/false) based on provided success_probability_pct (e.g., >=70% → true) and a short explanation.
- Provide 2–3 bullet-style impacts on the overall plan (e.g., "other goals may need to be delayed").
- Keep the response streaming-friendly: short sentences, bullet-style markdown, no tables.
- Do NOT return or reconstruct numeric tables/series; those are already computed client-side.
- Reference key figures that the client provides (e.g., confidence %, monthly contribution, glide path status) to add color, but avoid re-tabulating.
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
          category: { type: 'string', enum: ['retirement', 'home', 'education', 'wealth', 'travel', 'vehicle', 'emergency', 'big_purchase', 'custom'], description: 'REQUIRED. Use big_purchase for Major Purchase/Event, custom for truly custom goals' },
          priority: { type: 'string', enum: ['need', 'want', 'wish'] },
          // Category-specific discovery
          // Retirement
          living_expense_pa: { type: 'number', description: '[retirement] TOTAL annual living expense. MUST include ALL regular annual costs: base living + annual travel (if mentioned) + other recurring costs. Example: 50k base + 10k annual travel = 60k total' },
          lumpy_expenses: { type: 'array', items: { type: 'string', enum: ['travel_biannual', 'new_car_5y'] }, description: '[retirement] Optional: ONLY use if user explicitly says "travel every 2 years" (travel_biannual adds 5k/year) or "replace car every 5 years" (new_car_5y adds 4k/year). For ANNUAL travel, DO NOT use this, add to living_expense_pa instead' },
          location: { type: 'string', description: '[retirement/home] Location' },
          // Home
          property_price_estimate: { type: 'number', description: '[home] Property price' },
          deposit_percentage: { type: 'number', description: '[home] Deposit %' },
          is_first_home: { type: 'boolean', description: '[home] First home buyer' },
          // Education
          study_country: { type: 'string', enum: ['NZ', 'AU', 'UK', 'US'], description: '[education] Study destination country' },
          institution_tier: { type: 'string', enum: ['public', 'private'], description: '[education] Public/state vs private institution' },
          living_situation: { type: 'string', enum: ['home', 'flat'], description: '[education] Living at home vs independent accommodation' },
          tuition_fees_pa: { type: 'number', description: '[education] Annual tuition fees estimate' },
          living_costs_pa: { type: 'number', description: '[education] Annual living costs estimate (accommodation, food, transport)' },
          // Vehicle
          tier: { type: 'string', enum: ['economy', 'family', 'utility', 'luxury', 'performance'], description: '[vehicle] Vehicle tier/segment' },
          brand: { type: 'string', enum: ['toyota', 'tesla', 'ford', 'mazda', 'byd', 'bmw', 'mercedes', 'other'], description: '[vehicle] Vehicle brand (lowercase)' },
          model_id: { type: 'string', description: '[vehicle] Specific model identifier' },
          model_name: { type: 'string', description: '[vehicle] Model name for display' },
          condition: { type: 'string', enum: ['new', 'used'], description: '[vehicle] New or used vehicle' },
          fuel_type: { type: 'string', enum: ['ev', 'hybrid', 'petrol', 'diesel'], description: '[vehicle] Fuel/power type' },
          // Travel
          destination: { type: 'string', description: '[travel] Travel destination' },
          flight_class: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'], description: '[travel] Flight class preference' },
          accommodation_style: { type: 'string', enum: ['hotel', 'hostel', 'airbnb', 'friend'], description: '[travel] Accommodation type' },
          lifestyle_level: { type: 'string', enum: ['budget', 'moderate', 'comfort', 'luxury'], description: '[travel] Travel lifestyle level' },
          adults: { type: 'number', description: '[travel] Number of adults' },
          children: { type: 'number', description: '[travel] Number of children' },
          duration_days: { type: 'number', description: '[travel] Trip duration in days' },
          // Emergency
          primary_motivation: { type: 'string', enum: ['job_loss', 'medical', 'unexpected_bills', 'peace_of_mind'], description: '[emergency] Primary reason for emergency fund' },
          monthly_spend_est: { type: 'number', description: '[emergency] Estimated monthly essential expenses' },
          target_months_rough: { type: 'number', description: '[emergency] Target months of coverage (typically 3-6)' },
          // Wealth
          target_passive_income: { type: 'number', description: '[wealth] Target monthly passive income (if income-focused)' },
          time_horizon_years: { type: 'number', description: '[wealth] Investment time horizon in years' },
          current_net_worth: { type: 'number', description: '[wealth] Current net worth / portfolio value' },
          growth_objective: { type: 'string', enum: ['capital_appreciation', 'passive_income', 'balanced', 'financial_freedom'], description: '[wealth] Primary growth objective' },
          // Big Purchase (Major Purchase / Event)
          purchase_category: { type: 'string', enum: ['wedding', 'luxury_item', 'instrument', 'art', 'watch', 'event', 'other'], description: '[big_purchase] Purchase category' },
          estimated_amount: { type: 'number', description: '[big_purchase] Estimated purchase amount' },
          description: { type: 'string', description: '[big_purchase/wealth/custom] Description or motivation' },
          // Generic fallback
          target_amount: { type: 'number', description: '[all] Target amount' },
          due_date: { type: 'string', description: '[all] Target date' }
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
          loan_term_years: { type: 'number', description: '[home] Loan term years' },
          // Emergency (pre-filled profile echo)
          user_financial_profile: {
            type: 'object',
            description: '[emergency] Real financial profile (do not invent). Echo from context.user_financial_profile.',
            properties: {
              monthly_fixed_expenses: { type: 'number' },
              monthly_variable_expenses: { type: 'number' },
              total_monthly_expenses: { type: 'number' },
              dependents: { type: 'number' },
              household_structure: { type: 'string' },
              has_income_protection: { type: 'boolean' },
              liquid_assets: { type: 'number' },
              data_source: { type: 'string' }
            }
          }
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
          // Available assets (for feasibility reference)
          liquid_assets: { type: 'number', description: 'Available liquid savings/cash (unallocated)' },
          investments: { type: 'number', description: 'Available other investments (unallocated)' },
          debts: { type: 'number', description: 'Total debts/loans' },
          monthly_income: { type: 'number', description: 'Monthly income' },
          // Target and gap
          target_amount: { type: 'number', description: 'Calculated required amount for goal' },
          reference_gap: { type: 'number', description: 'Reference gap = target - available_assets (WITHOUT subtracting debts). Debts are handled through monthly_surplus, not asset reduction. NOT an allocation commitment.' },
          net_position: { type: 'number', description: 'Net financial position (assets - debts). Risk indicator only - does not affect investment calculations. Important for assessing financial health and loan approval.' },
          // Current allocation (NEW goals = 0)
          allocated_amount: { type: 'number', description: 'Amount already allocated to this goal. For NEW goals, this is 0.' },
          // Retirement specific
          current_super_balance: { type: 'number', description: '[retirement] Available KiwiSaver balance (unallocated)' },
          annual_contribution: { type: 'number', description: '[retirement] Annual KiwiSaver contribution' }
        },
        required: ['thought_process', 'rationale', 'substage', 'next_substage', 'liquid_assets', 'target_amount']
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
                    economic_exposure: {
                        type: 'object',
                        description: 'PRIMARY OUTPUT (MANDATORY): Economic exposure allocation (growth/defensive/liquidity). MUST be presented prominently in rationale with structured markdown format. Do NOT use asset class terms (stocks/bonds/cash) in rationale - use growth/defensive/liquidity terminology.',
                        properties: {
                            growth: { type: 'number', description: 'Growth exposure percentage (0-100): equities, property, alternatives. Based on timeline + risk_attitude + growth requirement.' },
                            defensive: { type: 'number', description: 'Defensive exposure percentage (0-100): fixed income, bonds. Provides stability and reduces volatility.' },
                            liquidity: { type: 'number', description: 'Liquidity exposure percentage (0-100): cash, money market. Ensures short-term access.' }
                        },
                        required: ['growth', 'defensive', 'liquidity']
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
                required: ['recommended_risk', 'economic_exposure']
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

/**
 * Generate a prompt for AI to explain optimization results in plain language
 * @param {Object} optimizationResult - The result from optimizeGoalAllocations
 * @returns {Object} Prompt object for LLM
 */
export function getOptimizationExplanationPrompt(optimizationResult) {
  const {
    allocations = [],
    financials = {},
    timeline = [],
    composite_success = 0
  } = optimizationResult;

  const totalCurrent = allocations.reduce((sum, a) => sum + (a.current_monthly || 0), 0);
  const totalRecommended = allocations.reduce((sum, a) => sum + (a.recommended_monthly || 0), 0);
  const budgetAvailable = financials.available_for_goals || 0;
  const budgetRemaining = budgetAvailable - totalRecommended;
  const overAllocated = allocations.some(a => a.over_allocation_warning);

  const goalsContext = allocations.map(a => {
    const change = (a.recommended_monthly || 0) - (a.current_monthly || 0);
    const loanTerm = a.category === 'home' && a.goal_details?.loan_term_years ? a.goal_details.loan_term_years : null;
    return {
      name: a.name,
      category: a.category,
      current_monthly: a.current_monthly,
      recommended_monthly: a.recommended_monthly,
      change: change,
      completion_year: a.completion_year,
      loan_term_years: loanTerm,
      mortgage_payment_year: a.completion_year && loanTerm ? a.completion_year + loanTerm : null,
      target_amount: a.target_amount,
      current_amount: a.current_amount,
      priority: a.priority
    };
  }).filter(g => g.target_amount > 0);

  // Detect budget overruns and reserve depletion
  const budgetOverruns = timeline.filter(t => t.allocatable < 0);
  const firstOverrunYear = budgetOverruns.length > 0 ? budgetOverruns[0].year : null;
  const liquidCapitalData = timeline.filter(t => t.liquid_capital_balance !== undefined);
  const initialReserves = financials.liquid_capital || 0;
  const finalReserves = liquidCapitalData.length > 0 ? liquidCapitalData[liquidCapitalData.length - 1].liquid_capital_balance : initialReserves;
  const reservesUsed = initialReserves - finalReserves;
  const hasBudgetCrisis = firstOverrunYear !== null;

  const prompt = `You are a financial planning assistant generating a technical explanation of optimization results. Your goal is to help users understand the charts and data on this page using clear markdown formatting.

📊 OPTIMIZATION RESULTS:
${JSON.stringify({
  budget_available_monthly: budgetAvailable,
  current_total_investment: totalCurrent,
  recommended_total_investment: totalRecommended,
  budget_remaining: budgetRemaining,
  over_allocated: overAllocated,
  confidence_level: composite_success,
  budget_crisis: hasBudgetCrisis ? {
    first_overrun_year: firstOverrunYear,
    initial_reserves: initialReserves,
    final_reserves: finalReserves,
    reserves_used: reservesUsed
  } : null,
  goals: goalsContext
}, null, 2)}

⚠️ CRITICAL: The "Goal Allocation Timeline" chart displays the "change" field (recommended - current), NOT the "recommended_monthly" field!
- If change = $0, the chart shows $0 (no additional allocation needed)
- If change = $364, the chart shows $364 (additional monthly contribution)
- This is an INCREMENTAL chart, not a total allocation chart!

🎯 YOUR TASK:
Generate a structured markdown explanation (200-300 words) that helps users understand:
1. What the optimization calculated
2. How the allocations work for each goal
3. How to interpret the charts below (timeline, cumulative growth)
4. Key technical insights (completion years, mortgage phases, success confidence)

📝 MARKDOWN STRUCTURE:
## 💡 Optimization Results Explained

### Budget Allocation Overview
- Current monthly allocations vs. recommended changes
- Budget utilization rate
- Remaining buffer

### Goal Breakdown
For each goal:
- **[Goal Name]**: Current $X → Recommended $Y (+/-$Z change)
  - Target: $[amount] by Year [N]
  - Key insight: [mortgage phase, completion timeline, or priority reasoning]

### How to Read the Charts
- **Goal Allocation Timeline (Surplus Allocation Projection)**: Shows ADDITIONAL/INCREMENTAL monthly changes (can be positive or negative).
  - The solid LINE represents "Available for New Allocations" = monthly surplus (after reserves) minus current commitments.
  - Each colored BAR shows the incremental change for that goal:
    - Positive values (above 0): additional contributions needed (e.g., $364 = add $364/month)
    - $0: no change from current allocation
    - Negative values (below 0): additional burden (e.g., mortgage payment exceeds previous savings)
  - The grey BAR "Unallocated (Remaining)" shows unused incremental budget.
  - For mortgage goals: After down payment (e.g., Year 5), shows incremental cost = mortgage payment minus previous savings. If mortgage > savings, bar goes below 0.
- **Liquid Investment Growth**: Shows the balance of liquid investments (KiwiSaver, savings, investment accounts) over time with compound returns. 
  - The BLUE AREA "Liquid Assets (Total Saved)" shows total liquid capital balance (all account balances summed).
  - IMPORTANT: This does NOT show total wealth. For home goals, when the down payment is reached, liquid assets drop sharply (account goes to $0 as funds convert to property), then the property becomes equity (not shown on this chart).
  - Your total wealth includes: liquid investments (shown in blue) + property equity (not shown) + debt reduction (not shown).
- [Special phases like "mortgage repayment starts in Year X after down payment"]

### Confidence & Risk Assessment
- Composite success rate: [X]%
- [Any over-allocation warnings or risk notes]
${hasBudgetCrisis ? `- **Budget Overrun**: Starting Year ${firstOverrunYear}, expenses exceed budget. ${reservesUsed > 0 ? `$${Math.round(reservesUsed).toLocaleString()} of emergency reserves used to cover gaps.` : ''}` : ''}
${hasBudgetCrisis && finalReserves < initialReserves * 0.3 ? `- **Sustainability Warning**: Plan significantly depletes reserves. Consider income increase or goal adjustments.` : ''}

📐 STYLE GUIDELINES:
- Use markdown headers (##, ###), bold (**text**), and lists
- Be concise and technical but clear
- Focus on explaining HOW to read the page, not telling users what to do
- Include specific numbers ($, years) from the data
- NO emojis in body text (only in section headers if needed)
- NO conversational tone ("you should", "let's", "exciting!")
- YES explanatory tone ("This shows...", "The optimizer calculated...", "After Year X...")

❌ AVOID:
- Friendly advice or motivational language
- Questions to the user
- Call-to-action phrases
- Excessive emojis
- Code blocks or code fences (backticks) - output plain markdown text only
- Wrapping your entire response in a code block

✅ GOOD EXAMPLES:
"The optimizer allocated an additional $364/month to retirement, bringing the total to $1,414/month. This achieves the $1,025,000 target by Year 26 with 82% confidence."

"**Villa Purchase**: Maintains current $2,450/month contribution ($0 change). Down payment ($420k) reached in Year 4, triggering a 30-year mortgage phase with monthly payments continuing."

"**Surplus Allocation Projection**: The line shows available budget. Year 1-4: villa bar = $0 (no change), retirement bar = $364 (additional). Year 5+: villa bar goes NEGATIVE (e.g., -$2,800/year) because mortgage payment ($5,265/month) exceeds previous savings ($2,450/month), creating an incremental burden of $2,815/month. This negative bar appears below the 0-axis."

"**Liquid Investment Growth Chart**: Shows individual goal balances stacked together. The blue area 'Liquid Assets (Total Saved)' is the sum of all account balances. Year 1-4: grows from $312k to $550k as investments compound. Year 5: drops sharply to ~$20k when villa account goes to $0 (down payment used for property). This chart tracks ACTUAL liquid wealth - property equity is NOT included."

Now generate the markdown explanation:`;

  return {
    prompt,
    responseFormat: {
      type: 'text',
      max_tokens: 500
    }
  };
}
