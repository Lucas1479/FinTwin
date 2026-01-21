const TO_ANNUAL = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  yearly: 1,
  'one-off': 0
};

const normalizeFrequency = (frequency = '') => {
  const f = String(frequency).toLowerCase();
  if (f.startsWith('week')) return 'weekly';
  if (f.startsWith('fort')) return 'fortnightly';
  if (f.startsWith('month')) return 'monthly';
  if (f.startsWith('year')) return 'yearly';
  if (f.includes('one')) return 'one-off';
  return 'monthly';
};

const toMonthly = (amount, frequency) => {
  const amt = Number(amount) || 0;
  if (!amt) return 0;
  const f = normalizeFrequency(frequency);
  const annual = amt * (TO_ANNUAL[f] || 0);
  return annual / 12;
};

const parseGoalDueDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed);
    const yearMatch = trimmed.match(/(\d+)\s*year/i);
    if (yearMatch) {
      const years = Number(yearMatch[1]);
      if (Number.isFinite(years) && years > 0) {
        const d = new Date();
        d.setFullYear(d.getFullYear() + years);
        return d;
      }
    }
    const monthMatch = trimmed.match(/(\d+)\s*month/i);
    if (monthMatch) {
      const months = Number(monthMatch[1]);
      if (Number.isFinite(months) && months > 0) {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        return d;
      }
    }
  }
  return null;
};

const computeFinancialSnapshot = ({
  cashFlows = [],
  existingFinancials = {},
  reservePctDefault = 40,
  liquidCapital
}) => {
  if (existingFinancials.monthly_surplus_total !== undefined) {
    return {
      monthly_income: existingFinancials.monthly_income ?? 0,
      monthly_outflow: existingFinancials.monthly_outflow ?? 0,
      monthly_surplus_total: existingFinancials.monthly_surplus_total,
      monthly_surplus_allocatable: existingFinancials.monthly_surplus_allocatable
        ?? existingFinancials.available_to_allocate
        ?? Math.max(0, Math.round(existingFinancials.monthly_surplus_total * (1 - (existingFinancials.reserve_for_other_goals_pct ?? reservePctDefault) / 100))),
      reserve_for_other_goals_pct: existingFinancials.reserve_for_other_goals_pct ?? reservePctDefault,
      reserved_other_goals: existingFinancials.reserved_other_goals ?? 0,
      available_to_allocate: Number.isFinite(Number(existingFinancials.available_to_allocate))
        ? Number(existingFinancials.available_to_allocate)
        : undefined,
      liquid_capital: existingFinancials.liquid_capital ?? liquidCapital ?? 0
    };
  }

  const incomes = cashFlows.filter(f => f.type === 'Income');
  const outflows = cashFlows.filter(f => f.type === 'Expense' || f.type === 'Subscription');

  const annualIncome = incomes.reduce((sum, f) => sum + toMonthly(f.amount, f.frequency) * 12, 0);
  const annualOutflow = outflows.reduce((sum, f) => sum + toMonthly(f.amount, f.frequency) * 12, 0);

  const monthlyIncome = annualIncome / 12;
  const monthlyOutflow = annualOutflow / 12;
  // Pre-investment surplus (do not subtract investment contributions here)
  const monthlySurplusTotal = Math.max(0, monthlyIncome - monthlyOutflow);

  const reservePct = existingFinancials.reserve_for_other_goals_pct ?? reservePctDefault;
  const monthlySurplusAllocatable = Math.max(0, Math.round(monthlySurplusTotal * (1 - reservePct / 100)));

  return {
    monthly_income: Math.round(monthlyIncome),
    monthly_outflow: Math.round(monthlyOutflow),
    monthly_surplus_total: Math.round(monthlySurplusTotal),
    monthly_surplus_allocatable: monthlySurplusAllocatable,
    reserve_for_other_goals_pct: reservePct,
    reserved_other_goals: existingFinancials.reserved_other_goals ?? 0,
    available_to_allocate: Number.isFinite(Number(existingFinancials.available_to_allocate))
      ? Number(existingFinancials.available_to_allocate)
      : undefined,
    liquid_capital: liquidCapital ?? 0
  };
};

const buildGoalWeight = ({ goal, horizonYears }) => {
  const priority = goal.priority || 'want';
  const priorityWeight = priority === 'need' ? 1.3 : priority === 'wish' ? 0.7 : 1.0;
  const urgencyScore = 1 / Math.max(1, horizonYears);
  return priorityWeight * urgencyScore;
};

const toRealMonthlyRate = (expectedReturnPct, inflationPct) => {
  const r = (Number(expectedReturnPct) || 0) / 100;
  const i = (Number(inflationPct) || 0) / 100;
  const realAnnual = (1 + r) / (1 + i) - 1;
  return Math.pow(1 + realAnnual, 1 / 12) - 1;
};

const computeIdealMonthly = ({ targetAmount, currentAmount, months, expectedReturnPct, inflationPct }) => {
  const target = Math.max(0, Number(targetAmount) || 0);
  const current = Math.max(0, Number(currentAmount) || 0);
  const n = Math.max(1, Math.round(Number(months) || 1));
  if (target <= current) return 0;
  const r = toRealMonthlyRate(expectedReturnPct, inflationPct);
  if (r <= 0) return Math.round((target - current) / n);
  const fvGap = target - current * Math.pow(1 + r, n);
  const pmt = (fvGap * r) / (Math.pow(1 + r, n) - 1);
  return Math.max(0, Math.round(pmt));
};

const allocateByWeights = ({ goals, availableMonthly }) => {
  const items = goals.map(g => ({
    ...g,
    ideal: Math.max(0, Number(g.ideal_monthly) || 0),
    min: Math.max(0, Number(g.optimization_min_monthly) || 0),
    weight: Number(g.optimization_weight) || 0,
    recommended: 0
  }));

  let budget = Math.max(0, Number(availableMonthly) || 0);
  const minSum = items.reduce((sum, g) => sum + g.min, 0);

  if (budget > 0) {
    if (minSum > 0 && budget >= minSum) {
      items.forEach(g => { g.recommended = g.min; });
      budget -= minSum;
    } else if (minSum > 0 && budget < minSum) {
      const weightSum = items.reduce((sum, g) => sum + g.weight, 0) || 1;
      items.forEach(g => {
        g.recommended = Math.min(g.min, budget * (g.weight / weightSum));
      });
      budget = 0;
    }
  }

  let safety = 0;
  while (budget > 0 && safety < 50) {
    safety += 1;
    const candidates = items.filter(g => g.ideal > g.recommended + 1e-3);
    if (candidates.length === 0) break;
    const weightSum = candidates.reduce((sum, g) => sum + g.weight, 0) || 1;
    let spent = 0;
    candidates.forEach(g => {
      const remaining = g.ideal - g.recommended;
      const share = budget * (g.weight / weightSum);
      const alloc = Math.min(remaining, share);
      g.recommended += alloc;
      spent += alloc;
    });
    budget = Math.max(0, budget - spent);
  }

  return items.map(g => ({
    ...g,
    name: g.goal_name || g.name || 'Goal',  // Ensure name is present for UI
    goal_id: g._id || g.goal_id,
    recommended_monthly: Math.round(g.recommended || 0),
    shortfall_monthly: Math.max(0, Math.round((g.ideal || 0) - (g.recommended || 0))),
    current_monthly: g.current_monthly || 0  // Pass through current allocation
  }));
};

const buildTimeline = ({ allocations, financials, incomeGrowthPct = 3, inflationPct = 2.5 }) => {
  const toInt = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
  const reservePct = toInt(financials.reserve_for_other_goals_pct, 40);
  const baseIncome = toInt(financials.monthly_income, 0);
  const baseOutflow = toInt(financials.monthly_outflow, 0);
  const bufferShortfall = toInt(financials.buffer_shortfall, 0);
  const bufferRebuildMonthly = toInt(financials.buffer_rebuild_monthly, 0);

  const calcMortgageMonthly = (a) => {
    if (a.category !== 'home') return 0;
    const details = a.goal_details || {};
    const price = toInt(details.property_price_estimate, 0);
    const depositPct = toInt(details.deposit_percentage, 20) / 100;
    const ratePct = toInt(details.mortgage_rate_pct, 6.5) / 100;
    const loanYears = toInt(details.loan_term_years, 0);
    if (!price || !loanYears) return 0;
    const loanPrincipal = Math.max(0, price * (1 - depositPct));
    const r = ratePct / 12;
    const n = loanYears * 12;
    if (r <= 0) return Math.round(loanPrincipal / n);
    const payment = loanPrincipal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(payment);
  };

  const goalHorizon = (a) => {
    const base = toInt(a.horizon_years, 1);
    const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
    return Math.max(1, base + loanYears);
  };

  const maxHorizon = Math.max(1, ...allocations.map(goalHorizon));
  let remainingBuffer = bufferShortfall;
  const timeline = [];
  const cumulative = {};
  const cumulativeTimeline = [];

  for (let year = 1; year <= maxHorizon; year += 1) {
    const incomeFactor = Math.pow(1 + Math.max(0, incomeGrowthPct) / 100, year - 1);
    const inflationFactor = Math.pow(1 + Math.max(0, inflationPct) / 100, year - 1);
    const income = baseIncome * incomeFactor;
    const outflow = baseOutflow * inflationFactor;
    const surplus = Math.max(0, income - outflow);
    let allocatable = Math.max(0, surplus * (1 - reservePct / 100));

    if (remainingBuffer > 0 && bufferRebuildMonthly > 0) {
      const annualRebuild = Math.min(remainingBuffer, bufferRebuildMonthly * 12);
      allocatable = Math.max(0, allocatable - annualRebuild / 12);
      remainingBuffer -= annualRebuild;
    }

    const row = { year, allocatable: Math.round(allocatable * 12), free_surplus: 0 };
    let allocatedSum = 0;

    allocations.forEach((a) => {
      const purchaseYears = toInt(a.horizon_years, 1);
      const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
      const mortgageMonthly = calcMortgageMonthly(a);
      const isSavingsPhase = year <= purchaseYears;
      const isLoanPhase = loanYears > 0 && year > purchaseYears && year <= purchaseYears + loanYears;
      const amount = isSavingsPhase
        ? Math.round((a.recommended_monthly || 0) * 12)
        : isLoanPhase
        ? Math.round(mortgageMonthly * 12)
        : 0;
      row[a.goal_key] = amount;
      allocatedSum += amount;
    });

    row.free_surplus = Math.max(0, row.allocatable - allocatedSum);
    timeline.push(row);

    cumulative.allocatable = (cumulative.allocatable || 0) + row.allocatable;
    const cumRow = { year, total_allocatable: Math.round(cumulative.allocatable) };
    let totalAllocated = 0;
    allocations.forEach((a) => {
      const key = a.goal_key;
      const amount = row[key] || 0;
      cumulative[key] = (cumulative[key] || 0) + amount;
      cumRow[key] = Math.round(cumulative[key]);
      totalAllocated += amount;
    });
    cumulative.allocated = (cumulative.allocated || 0) + totalAllocated;
    cumRow.total_allocated = Math.round(cumulative.allocated);
    cumulativeTimeline.push(cumRow);
  }

  return { timeline, cumulativeTimeline };
};

const optimizeAllocationsHeuristic = ({ goals, availableMonthly }) => {
  const weighted = goals.map(goal => {
    const dueDate = parseGoalDueDate(goal.due_date);
    const horizonYears = dueDate
      ? Math.max(1, Math.round((dueDate - new Date()) / (365.25 * 24 * 60 * 60 * 1000)))
      : 10;
    return {
      ...goal,
      horizon_years: horizonYears,
      weight: buildGoalWeight({ goal, horizonYears })
    };
  });

  const totalWeight = weighted.reduce((sum, g) => sum + g.weight, 0);
  const normalized = totalWeight > 0 ? weighted : weighted.map(g => ({ ...g, weight: 1 }));
  const weightSum = normalized.reduce((sum, g) => sum + g.weight, 0) || 1;

  const allocations = normalized.map(g => ({
    goal_id: g._id || g.goal_id,
    name: g.goal_name || 'Goal',
    category: g.category,
    goal_details: g.goal_details,
    goal_key: g.goal_key || g._id?.toString?.() || g.goal_id?.toString?.() || g.goal_name,
    goal_label: g.goal_label || g.goal_name || 'Goal',
    priority: g.priority,
    horizon_years: g.horizon_years,
    target_amount: g.target_amount || 0,
    current_amount: g.current_amount || 0,
    recommended_monthly: Math.round((availableMonthly * g.weight) / weightSum),
    target_monthly: Number(g.optimization_target_monthly) || 0,
    min_monthly: Number(g.optimization_min_monthly) || 0
  }));

  return allocations;
};

const buildLpModel = ({ glpk, goals, availableMonthly }) => {
  const objectiveVars = [];
  const subjectTo = [];
  const bounds = [];

  subjectTo.push({
    name: 'budget',
    vars: goals.map(g => ({ name: `x_${g._id || g.goal_id}`, coef: 1 })),
    bnds: { type: glpk.GLP_UP, ub: availableMonthly, lb: 0 }
  });

  goals.forEach((g, idx) => {
    const id = g._id || g.goal_id || `goal_${idx}`;
    const xName = `x_${id}`;
    const dName = `d_${id}`;
    const target = Number(g.optimization_target_monthly) || 0;
    const weight = g.optimization_weight || 1;
    const minMonthly = Number(g.optimization_min_monthly) || 0;

    objectiveVars.push({ name: dName, coef: weight });

    bounds.push({ name: xName, type: glpk.GLP_LO, lb: 0 });
    bounds.push({ name: dName, type: glpk.GLP_LO, lb: 0 });

    if (minMonthly > 0) {
      subjectTo.push({
        name: `min_${id}`,
        vars: [{ name: xName, coef: 1 }],
        bnds: { type: glpk.GLP_LO, lb: minMonthly, ub: 0 }
      });
    }

    subjectTo.push({
      name: `dev_pos_${id}`,
      vars: [
        { name: xName, coef: 1 },
        { name: dName, coef: -1 }
      ],
      bnds: { type: glpk.GLP_UP, ub: target, lb: 0 }
    });

    subjectTo.push({
      name: `dev_neg_${id}`,
      vars: [
        { name: xName, coef: 1 },
        { name: dName, coef: 1 }
      ],
      bnds: { type: glpk.GLP_LO, lb: target, ub: 0 }
    });
  });

  return {
    name: 'goal_allocation_lp',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'total_deviation',
      vars: objectiveVars
    },
    subjectTo,
    bounds
  };
};

const solveAllocationsLp = async ({ goals, availableMonthly }) => {
  const module = await import('glpk.js');
  const GLPK = module.GLPK || module.default || module;
  const glpk = await GLPK();

  const model = buildLpModel({ glpk, goals, availableMonthly });
  const result = glpk.solve(model, { msgLevel: glpk.GLP_MSG_OFF });

  const allocations = goals.map((g, idx) => {
    const id = g._id || g.goal_id || `goal_${idx}`;
    const value = result?.result?.vars?.[`x_${id}`];
    return {
      goal_id: g._id || g.goal_id,
      name: g.goal_name || 'Goal',
      category: g.category,
      goal_details: g.goal_details,
      goal_key: g.goal_key || g._id?.toString?.() || g.goal_id?.toString?.() || g.goal_name,
      goal_label: g.goal_label || g.goal_name || 'Goal',
      priority: g.priority,
      horizon_years: g.horizon_years,
      target_amount: g.target_amount || 0,
      current_amount: g.current_amount || 0,
      recommended_monthly: Math.max(0, Math.round(value ?? 0)),
      target_monthly: Number(g.optimization_target_monthly) || 0,
      min_monthly: Number(g.optimization_min_monthly) || 0
    };
  });

  return {
    allocations,
    status: result?.result?.status,
    objective: result?.result?.z
  };
};

export const optimizeGoalAllocations = async ({
  goals = [],
  cashFlows = [],
  existingFinancials = {},
  liquidCapital,
  reservePctDefault = 40,
  minCashReserveMonths = 3,
  algorithm = 'solver',
  incomeGrowthPct = 3,
  inflationPct = 2.5,
  debug = false
}) => {
  const financials = computeFinancialSnapshot({
    cashFlows,
    existingFinancials,
    reservePctDefault,
    liquidCapital
  });

  const hasExternalBudget = Number.isFinite(Number(financials.available_to_allocate));
  const availableMonthly = hasExternalBudget
    ? Number(financials.available_to_allocate)
    : financials.monthly_surplus_allocatable;
  const monthlyOutflow = financials.monthly_outflow || 0;
  const liquidCapitalValue = financials.liquid_capital ?? 0;

  const bufferTarget = monthlyOutflow > 0 ? Math.round(monthlyOutflow * minCashReserveMonths) : 0;
  const bufferShortfall = hasExternalBudget ? 0 : Math.max(0, bufferTarget - liquidCapitalValue);
  const bufferRebuildMonthly = hasExternalBudget
    ? 0
    : bufferShortfall > 0
      ? Math.min(Math.round(availableMonthly * 0.5), Math.round(bufferShortfall / 12))
      : 0;
  const availableForGoals = hasExternalBudget
    ? Math.max(0, availableMonthly)
    : Math.max(0, availableMonthly - bufferRebuildMonthly);

  const weightedGoals = goals.map(goal => {
    const dueDate = parseGoalDueDate(goal.due_date);
    const horizonYears = dueDate
      ? Math.max(1, Math.round((dueDate - new Date()) / (365.25 * 24 * 60 * 60 * 1000)))
      : 10;
    return {
      ...goal,
      horizon_years: horizonYears,
      optimization_weight: buildGoalWeight({ goal, horizonYears })
    };
  });

  const totalWeight = weightedGoals.reduce((sum, g) => sum + (g.optimization_weight || 0), 0) || 1;
  const goalsWithTargets = weightedGoals.map(g => {
    const hasTarget = Number.isFinite(Number(g.optimization_target_monthly)) && Number(g.optimization_target_monthly) > 0;
    const fallbackTarget = Math.round((availableForGoals * (g.optimization_weight || 0)) / totalWeight);
    return {
      ...g,
      optimization_target_monthly: hasTarget ? Number(g.optimization_target_monthly) : fallbackTarget
    };
  });

  let allocations = [];
  let algoUsed = algorithm;
  let lpStatus = null;
  let lpObjective = null;

  let debugInfo = null;
  if (algorithm === 'lp') {
    try {
      const lpResult = await solveAllocationsLp({ goals: goalsWithTargets, availableMonthly: availableForGoals });
      allocations = lpResult.allocations;
      lpStatus = lpResult.status ?? null;
      lpObjective = lpResult.objective ?? null;
    } catch (err) {
      console.warn('[Goal Optimizer] LP solve failed, falling back to heuristic', err?.message || err);
      algoUsed = 'heuristic';
      allocations = optimizeAllocationsHeuristic({ goals: goalsWithTargets, availableMonthly: availableForGoals });
    }
  } else {
    const solverDebug = [];
    const solverGoals = goalsWithTargets.map(g => {
      const months = Math.max(1, Math.round((g.horizon_years || 1) * 12));
      const targetAmount = g.effective_target_amount ?? g.target_amount ?? 0;
      const hasTargetAmount = Number(targetAmount) > 0;
      
      // Calculate portfolio expected return from economic exposure if available
      const exposure = g.ai_decision?.strategy_recommendation?.economic_exposure;
      let portfolioExpectedReturn = g.expected_return_pct ?? 6;
      
      if (exposure && Number.isFinite(exposure.growth) && Number.isFinite(exposure.defensive) && Number.isFinite(exposure.liquidity)) {
        // Use asset class returns: growth=8%, defensive=4%, liquidity=2%
        const RETURNS = { growth: 8, defensive: 4, liquidity: 2 };
        portfolioExpectedReturn = 
          (exposure.growth * RETURNS.growth + 
           exposure.defensive * RETURNS.defensive + 
           exposure.liquidity * RETURNS.liquidity) / 100;
      }
      
      const idealMonthly = hasTargetAmount
        ? computeIdealMonthly({
            targetAmount,
            currentAmount: g.current_amount ?? 0,
            months,
            expectedReturnPct: portfolioExpectedReturn,
            inflationPct: g.inflation_pct ?? 2.5
          })
        : 0;
      
      // Calculate shortfall considering current monthly allocation
      const currentMonthly = Number(g.current_monthly_allocation) || 0;
      const shortfallMonthly = Math.max(0, idealMonthly - currentMonthly);
      
      if (debug) {
        solverDebug.push({
          goal_id: g._id || g.goal_id,
          name: g.goal_name,
          category: g.category,
          horizon_years: g.horizon_years,
          months,
          target_amount: g.target_amount ?? 0,
          effective_target_amount: targetAmount,
          current_amount: g.current_amount ?? 0,
          expected_return_pct: g.expected_return_pct ?? 6,
          portfolio_expected_return_pct: portfolioExpectedReturn,
          inflation_pct: g.inflation_pct ?? 2.5,
          economic_exposure: exposure || null,
          optimization_weight: g.optimization_weight,
          ideal_monthly: idealMonthly,
          current_monthly_allocation: currentMonthly,
          shortfall_monthly: shortfallMonthly
        });
      }
      return {
        ...g,
        ideal_monthly: shortfallMonthly,  // Use shortfall instead of ideal
        current_monthly: currentMonthly,   // Keep current for display
        goal_key: g.goal_key || g.goal_label
      };
    });
    allocations = allocateByWeights({ goals: solverGoals, availableMonthly: availableForGoals });
    algoUsed = 'solver';
    debugInfo = debug ? {
      available_monthly: availableForGoals,
      reserve_pct: reservePctDefault,
      goals: solverDebug
    } : null;
  }

  const { timeline, cumulativeTimeline } = buildTimeline({
    allocations,
    financials: {
      ...financials,
      buffer_target: bufferTarget,
      buffer_shortfall: bufferShortfall,
      buffer_rebuild_monthly: bufferRebuildMonthly,
      available_for_goals: availableForGoals,
      available_to_allocate: Number.isFinite(Number(financials.available_to_allocate))
        ? Number(financials.available_to_allocate)
        : availableForGoals
    },
    incomeGrowthPct,
    inflationPct
  });

  const totalPriority = allocations.reduce((sum, g) => sum + (g.optimization_weight || 0), 0) || 1;
  const compositeSuccess = allocations.reduce((sum, g) => {
    const ideal = g.ideal_monthly || g.target_monthly || 0;
    const ratio = ideal > 0 ? Math.min(1, (g.recommended_monthly || 0) / ideal) : 1;
    return sum + ratio * (g.optimization_weight || 0);
  }, 0) / totalPriority;

  return {
    algorithm: algoUsed,
    financials: {
      ...financials,
      buffer_target: bufferTarget,
      buffer_shortfall: bufferShortfall,
      buffer_rebuild_monthly: bufferRebuildMonthly,
      available_for_goals: availableForGoals
    },
    allocations,
    lp_status: lpStatus,
    lp_objective: lpObjective,
    timeline,
    cumulative_timeline: cumulativeTimeline,
    composite_success: Number((compositeSuccess * 100).toFixed(1)),
    debug: debugInfo
  };
};

