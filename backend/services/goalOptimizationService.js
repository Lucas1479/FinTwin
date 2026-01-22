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
  reservePctDefault = 25,
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
  const current = Math.max(0, Number(currentAmount) || 0);  // currentAmount = allocated_amount (for NEW goals = 0)
  const n = Math.max(1, Math.round(Number(months) || 1));
  if (target <= current) return 0;
  const r = toRealMonthlyRate(expectedReturnPct, inflationPct);
  if (r <= 0) return Math.round((target - current) / n);
  // Calculate FV gap: target - FV(current allocation)
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

  // Check for over-allocation FIRST
  const currentTotal = items.reduce((sum, g) => sum + (g.current_monthly || 0), 0);
  const availableBudget = Math.max(0, Number(availableMonthly) || 0);
  const overAllocation = currentTotal - availableBudget;
  
  if (overAllocation > 0) {
    console.log(`[Over-Allocation Detected] Current total ($${currentTotal}) exceeds budget ($${availableBudget}) by $${overAllocation.toFixed(0)}`);
    console.log(`[Recommendation] Reduce allocations or increase reserve percentage`);
    
    // Return current as baseline, let user decide how to reduce
    const result = items.map(g => ({
      ...g,
      name: g.goal_name || g.name || 'Goal',
      goal_id: g._id || g.goal_id,
      recommended_monthly: 0,  // No additional allocation when over budget
      shortfall_monthly: g.ideal || 0,
      current_monthly: g.current_monthly || 0,
      over_allocation_warning: true
    }));
    return result;
  }

  let budget = availableBudget - currentTotal;  // Use REMAINING budget
  console.log(`[Budget Available] Total: $${availableBudget}, Current: $${currentTotal}, Remaining: $${budget.toFixed(0)}`);
  
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

  const result = items.map(g => {
    const recommended = Math.round(g.recommended || 0);
    const current = g.current_monthly || 0;
    
    console.log(`[allocateByWeights] ${g.goal_name}: ideal=${g.ideal}, min=${g.min}, recommended=${recommended}, current=${current}`);
    
    return {
      ...g,
      name: g.goal_name || g.name || 'Goal',
      goal_id: g._id || g.goal_id,
      recommended_monthly: recommended,  // This is the INCREMENTAL allocation
      shortfall_monthly: Math.max(0, Math.round((g.ideal || 0) - recommended)),
      current_monthly: current  // Pass through current allocation
    };
  });
  
  return result;
};

const buildTimeline = ({ allocations, financials, incomeGrowthPct = 3, inflationPct = 2.5 }) => {
  const toInt = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
  const reservePct = toInt(financials.reserve_for_other_goals_pct, 25);
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
    console.log(`[Mortgage Calc] ${a.name}: price=$${price}, deposit=${(depositPct*100).toFixed(0)}%, loan=$${loanPrincipal}, rate=${(ratePct*100).toFixed(2)}%, term=${loanYears}y, monthly=$${Math.round(payment)}`);
    return Math.round(payment);
  };

  // Calculate goal-specific portfolio return based on economic_exposure
  const calcGoalReturnRate = (allocation) => {
    const exposure = allocation.ai_decision?.strategy_recommendation?.economic_exposure;
    
    if (exposure && Number.isFinite(exposure.growth) && Number.isFinite(exposure.defensive) && Number.isFinite(exposure.liquidity)) {
      // Use asset class returns: growth=8%, defensive=4%, liquidity=2%
      const RETURNS = { growth: 8, defensive: 4, liquidity: 2 };
      const portfolioReturn = (exposure.growth * RETURNS.growth + exposure.defensive * RETURNS.defensive + exposure.liquidity * RETURNS.liquidity) / 100;
      
      // Return nominal rate (before inflation) for growth calculation
      // Inflation is already handled separately in the timeline
      return portfolioReturn / 100; // Convert to decimal (e.g., 6.2% -> 0.062)
    }
    
    // Default to 6% if no exposure data
    return 0.06;
  };

  const goalHorizon = (a) => {
    const base = toInt(a.horizon_years, 1);
    const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
    return Math.max(1, base + loanYears);
  };

  const maxHorizon = Math.max(1, ...allocations.map(goalHorizon));
  let remainingBuffer = bufferShortfall;
  let cumulativeDeficit = 0; // Track cumulative budget shortfalls that eat into liquid capital
  const timeline = [];
  const cumulative = {};
  const cumulativeTimeline = [];
  
  // Track which goals are completed and their freed resources
  const goalStatus = {}; // { [goal_key]: { completed: false, freedBudget: 0 } }
  allocations.forEach(a => {
    // Use name as the primary key for consistency with frontend
    const key = a.name || a.goal_name || a.goal_key;
    goalStatus[key] = { 
      completed: false, 
      completedYear: null,
      targetAmount: toInt(a.target_amount || a.effective_target_amount, 0),
      currentMonthly: toInt(a.current_monthly, 0),
      additionalMonthly: toInt(a.recommended_monthly, 0)
    };
  });

  for (let year = 1; year <= maxHorizon; year += 1) {
    const incomeFactor = Math.pow(1 + Math.max(0, incomeGrowthPct) / 100, year - 1);
    const inflationFactor = Math.pow(1 + Math.max(0, inflationPct) / 100, year - 1);
    const income = baseIncome * incomeFactor;
    const outflow = baseOutflow * inflationFactor;
    const surplus = Math.max(0, income - outflow);
    let totalAllocatable = Math.max(0, surplus * (1 - reservePct / 100));

    if (remainingBuffer > 0 && bufferRebuildMonthly > 0) {
      const annualRebuild = Math.min(remainingBuffer, bufferRebuildMonthly * 12);
      totalAllocatable = Math.max(0, totalAllocatable - annualRebuild / 12);
      remainingBuffer -= annualRebuild;
    }

    // === DYNAMIC REALLOCATION: Detect freed resources and reallocate ===
    // Check if any goals completed in the previous year and calculate resource changes
    let freedBudgetThisYear = 0;
    const freedGoalsInfo = [];
    
    allocations.forEach(a => {
      const key = a.name || a.goal_name || a.goal_key;
      const status = goalStatus[key];
      const isHomeGoal = a.category === 'home';
      const loanYears = isHomeGoal ? toInt(a.goal_details?.loan_term_years, 0) : 0;
      
      // If goal completed last year, resources become available this year
      if (status.completed && status.completedYear === year - 1) {
        if (!isHomeGoal) {
          // Non-home goals: fully free up resources
          const monthlyToFree = status.currentMonthly + status.additionalMonthly;
          freedBudgetThisYear += monthlyToFree;
          freedGoalsInfo.push({ name: a.name, amount: monthlyToFree });
        } else if (loanYears === 0) {
          // Home goal without loan (cash purchase): free up resources
          const monthlyToFree = status.currentMonthly + status.additionalMonthly;
          freedBudgetThisYear += monthlyToFree;
          freedGoalsInfo.push({ name: a.name, amount: monthlyToFree, note: 'cash purchase' });
        } else {
          // Home goals WITH loans: calculate net resource change
          const mortgageMonthly = calcMortgageMonthly(a);
          const previousAllocation = status.currentMonthly + status.additionalMonthly;
          const netChange = previousAllocation - mortgageMonthly;
          
          if (netChange > 0) {
            // Mortgage is LESS than previous savings → resources freed
            freedBudgetThisYear += netChange;
            freedGoalsInfo.push({ 
              name: a.name, 
              amount: netChange, 
              note: `mortgage $${Math.round(mortgageMonthly)}/month < previous $${Math.round(previousAllocation)}/month` 
            });
          } else if (netChange < 0) {
            // Mortgage is MORE than previous savings → needs additional resources
            console.log(`[Resource Squeeze Year ${year}] ${a.name}: mortgage requires additional $${Math.round(-netChange)}/month (was $${Math.round(previousAllocation)}, now $${Math.round(mortgageMonthly)})`);
            // This reduces available budget for other goals (handled by totalCurrentAllocations calculation)
          } else {
            console.log(`[No Resource Change Year ${year}] ${a.name}: mortgage = previous allocation ($${Math.round(mortgageMonthly)}/month)`);
          }
        }
      }
    });
    
    // Reallocate freed resources to remaining active goals
    if (freedBudgetThisYear > 0) {
      const activeGoals = allocations.filter(a => {
        const key = a.name || a.goal_name || a.goal_key;
        const status = goalStatus[key];
        return !status.completed; // Only allocate to incomplete goals
      });
      
      if (activeGoals.length > 0) {
        const totalWeight = activeGoals.reduce((sum, g) => 
          sum + (g.optimization_weight || 1), 0) || 1;
        
        console.log(`[Freed Resources Year ${year}] Total freed: $${Math.round(freedBudgetThisYear)}/month from:`, 
          freedGoalsInfo.map(f => `${f.name} ($${Math.round(f.amount)}${f.note ? ', ' + f.note : ''})`).join(', '));
        
        activeGoals.forEach(a => {
          const key = a.name || a.goal_name || a.goal_key;
          const weight = a.optimization_weight || 1;
          const share = (weight / totalWeight) * freedBudgetThisYear;
          const oldAdditional = goalStatus[key].additionalMonthly || 0;
          
          // Safety check: ensure share is valid
          if (!Number.isFinite(share) || share < 0) {
            console.warn(`[Reallocation Year ${year}] Invalid share for ${a.name}: ${share}, skipping`);
            return;
          }
          
          // Update dynamic additionalMonthly
          goalStatus[key].additionalMonthly = oldAdditional + share;
          
          console.log(`[Reallocation Year ${year}] ${a.name}: $${Math.round(oldAdditional)} → $${Math.round(goalStatus[key].additionalMonthly)}/month (+$${Math.round(share)})`);
        });
      } else {
        console.log(`[Freed Resources Year ${year}] $${Math.round(freedBudgetThisYear)}/month freed, but no active goals to reallocate to (will show as free_surplus)`);
      }
    }

    // Calculate total current allocations (already committed funds)
    // For completed goals: if they're home goals in loan phase, use mortgage payment; otherwise 0
    let totalCurrentAllocations = 0;
    allocations.forEach(a => {
      const key = a.name || a.goal_name || a.goal_key;
      const status = goalStatus[key];
      const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
      const completedYear = status.completedYear;
      const isLoanPhase = status.completed && loanYears > 0 && 
                          year > completedYear && year <= completedYear + loanYears;
      
      if (!status.completed) {
        // Still in savings phase: count current allocation
        totalCurrentAllocations += status.currentMonthly;
      } else if (isLoanPhase) {
        // In loan phase: count mortgage payment as "current allocation"
        const mortgageMonthly = calcMortgageMonthly(a);
        totalCurrentAllocations += mortgageMonthly;
      }
      // If completed and not in loan phase: resources are freed (don't count)
    });

    // Available for NEW allocations = total allocatable - current allocations
    // Allow negative values to indicate budget overrun (for frontend warning display)
    const availableForNewAllocations = totalAllocatable - totalCurrentAllocations;
    
    // === BUDGET OVERRUN DETECTION & AUTO DE-ALLOCATION ===
    // Check if current allocations exceed available budget
    if (totalCurrentAllocations > totalAllocatable) {
      let overrun = totalCurrentAllocations - totalAllocatable;
      console.warn(`[Budget Overrun Year ${year}] Total required: $${Math.round(totalCurrentAllocations)}/month, Available: $${Math.round(totalAllocatable)}/month, Shortfall: $${Math.round(overrun)}/month`);
      
      // Identify flexible goals that can be reduced
      const flexibleGoals = allocations
        .filter(a => {
          const key = a.name || a.goal_name || a.goal_key;
          const status = goalStatus[key];
          const isHomeGoal = a.category === 'home';
          // Flexible = not home, not completed, has additional allocation
          return !isHomeGoal && !status.completed && status.additionalMonthly > 0;
        })
        .map(a => {
          const key = a.name || a.goal_name || a.goal_key;
          return {
            key,
            name: a.name,
            priority: a.priority || 5,
            additionalMonthly: goalStatus[key].additionalMonthly,
            // Lower priority number = higher importance (1=high, 10=low)
            flexibility: (a.priority || 5) * goalStatus[key].additionalMonthly
          };
        })
        .sort((a, b) => b.priority - a.priority); // Sort by priority DESC (reduce low priority first)
      
      if (flexibleGoals.length > 0) {
        console.log(`[Auto De-allocation Year ${year}] Attempting to reduce flexible goals to cover $${Math.round(overrun)}/month shortfall`);
        
        for (const goal of flexibleGoals) {
          if (overrun <= 0) break;
          
          const reduction = Math.min(goal.additionalMonthly, overrun);
          goalStatus[goal.key].additionalMonthly -= reduction;
          overrun -= reduction;
          
          console.log(`[Auto De-allocation Year ${year}] ${goal.name}: reduced by $${Math.round(reduction)}/month (from $${Math.round(goal.additionalMonthly)} to $${Math.round(goalStatus[goal.key].additionalMonthly)})`);
        }
        
        if (overrun > 0) {
          console.error(`[Budget Gap Year ${year}] After reducing all flexible goals, still short $${Math.round(overrun)}/month. Consider: 1) Increase income, 2) Use liquid capital, 3) Extend timelines`);
          
          // Track cumulative deficit - this will be deducted from liquid capital
          const annualShortfall = overrun * 12;
          cumulativeDeficit += annualShortfall;
          console.warn(`[Budget Deficit Year ${year}] Annual shortfall: $${Math.round(annualShortfall)}, Cumulative deficit: $${Math.round(cumulativeDeficit)}`);
        } else {
          console.log(`[Auto De-allocation Year ${year}] Successfully adjusted budget. Plan is now sustainable.`);
        }
      } else {
        console.error(`[Budget Gap Year ${year}] No flexible goals to reduce. Shortfall of $${Math.round(overrun)}/month must be covered by: 1) Increasing income, 2) Using liquid capital reserves, 3) Re-evaluating goals`);
        
        // Track cumulative deficit - no flexible goals to reduce, all shortfall from reserves
        const annualShortfall = overrun * 12;
        cumulativeDeficit += annualShortfall;
        console.warn(`[Budget Deficit Year ${year}] Annual shortfall: $${Math.round(annualShortfall)}, Cumulative deficit: $${Math.round(cumulativeDeficit)}`);
      }
    }

    // DYNAMIC REALLOCATION: Freed budget from completed goals is automatically 
    // reallocated to remaining active goals (see reallocation logic above).
    // This maximizes resource utilization across the timeline.

    // IMPORTANT: For incremental chart consistency:
    // - allocatable = available for NEW allocations (after deducting current commitments)
    // - Bars show incremental allocations
    // - free_surplus = remaining incremental budget
    const row = { 
      year, 
      total_budget: Math.round(totalAllocatable * 12),  // Total available budget (for reference)
      allocatable: Math.round(availableForNewAllocations * 12),  // Available for new allocations
      free_surplus: 0
      // liquid_capital_balance will be set after cumulative calculation
    };
    let allocatedIncrementalSum = 0;

    allocations.forEach((a) => {
      // Use name as the primary key for consistency
      const key = a.name || a.goal_name || a.goal_key;
      const status = goalStatus[key];
      
      const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
      const mortgageMonthly = calcMortgageMonthly(a);
      
      // Determine phase based on ACTUAL completion, not horizon_years
      const completedYear = status.completedYear;
      const isLoanPhase = status.completed && loanYears > 0 && 
                          year > completedYear && year <= completedYear + loanYears;
      const isSavingsPhase = !status.completed;
      
      // For completed non-home goals: skip (truly completed, resources freed)
      if (status.completed && !isLoanPhase) {
        row[key] = 0;
        return;
      }
      
      // Timeline shows ADDITIONAL monthly contributions (savings phase) or incremental change (loan phase)
      let amount = 0;
      if (isSavingsPhase) {
        // Savings phase: use DYNAMIC additionalMonthly (may increase when other goals complete)
        const additionalMonthly = status.additionalMonthly ?? 0;
        amount = Math.round(additionalMonthly * 12);
      } else if (isLoanPhase) {
        // Loan phase: show INCREMENTAL change from savings phase
        // Incremental = mortgage payment - previous savings
        const previousSavings = status.currentMonthly + status.additionalMonthly;
        const incrementalChange = mortgageMonthly - previousSavings;
        amount = Math.round(incrementalChange * 12);
        if (year === completedYear + 1) {
          console.log(`[Loan Phase Start] ${a.name} Year ${year}: mortgage=$${Math.round(mortgageMonthly)}/month, previous savings=$${Math.round(previousSavings)}/month, incremental change=$${Math.round(incrementalChange)}/month (${incrementalChange > 0 ? 'additional cost' : 'freed resources'})`);
        }
      }
      
      row[key] = amount;
      allocatedIncrementalSum += amount;
    });

    // free_surplus = available for new allocations - actual new allocations
    row.free_surplus = Math.max(0, row.allocatable - allocatedIncrementalSum);
    
    if (year === 1) {
      console.log(`[Timeline Year 1] total_budget=$${row.total_budget}, totalCurrent=$${Math.round(totalCurrentAllocations * 12)}, availableForNew=$${row.allocatable}, allocatedIncremental=$${allocatedIncrementalSum}, free_surplus=$${row.free_surplus}`);
      console.log(`[Timeline Year 1 Keys] timeline keys in row:`, Object.keys(row));
      allocations.forEach(a => {
        const key = a.name || a.goal_name || a.goal_key;
        console.log(`  - ${a.name}: $${row[key]} (key="${key}", additional_monthly: ${a.recommended_monthly}, current_monthly: ${a.current_monthly}, exposure: ${JSON.stringify(a.ai_decision?.strategy_recommendation?.economic_exposure || 'default')})`);
      });
    }
    
    timeline.push(row);

    // ==== CUMULATIVE CALCULATION WITH INVESTMENT GROWTH ====
    cumulative.allocatable = (cumulative.allocatable || 0) + row.allocatable;
    const cumRow = { year, total_allocatable: Math.round(cumulative.allocatable) };
    let totalAllocatedValue = 0;
    
    allocations.forEach((a) => {
      // Use name as the primary key for consistency
      const key = a.name || a.goal_name || a.goal_key;
      const status = goalStatus[key];
      
      // Initialize cumulative with current_amount (existing principal) in year 1
      if (year === 1 && !cumulative[key]) {
        cumulative[key] = toInt(a.current_amount, 0);
      }
      
      const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
      const completedYear = status.completedYear;
      const isLoanPhase = status.completed && loanYears > 0 && 
                          year > completedYear && year <= completedYear + loanYears;
      
      // For completed non-home goals, freeze the value
      if (status.completed && !isLoanPhase) {
        cumRow[key] = Math.round(cumulative[key]);
        totalAllocatedValue += cumulative[key];
        return;
      }
      
      // Get previous balance
      const previousBalance = cumulative[key] || 0;
      
      // For home goals in loan phase, balance should be 0 (money used for deposit)
      if (isLoanPhase) {
        cumulative[key] = 0;
        cumRow[key] = 0;
        // Don't add to totalAllocatedValue in loan phase
        return;
      }
      
      // Calculate portfolio return rate for this goal
      const returnRate = calcGoalReturnRate(a);
      
      // Apply investment growth to existing balance
      const growthOnBalance = previousBalance * returnRate;
      
      // Get contributions for this year
      const additionalAmount = row[key] || 0;  // ADDITIONAL contribution from timeline
      let currentMonthlyAnnual = toInt(a.current_monthly, 0) * 12;
      
      // CRITICAL: If goal had budget overrun this year, check if current_monthly can actually be funded
      // If totalCurrentAllocations > totalAllocatable, some current_monthly contributions are unfunded
      // and should NOT be added to account balance (they're covered by deficit)
      const budgetOverrun = totalCurrentAllocations > totalAllocatable;
      if (budgetOverrun && !status.completed) {
        // For non-completed goals in overrun scenario, actual contribution = 0 (no additional funds available)
        // The account balance should only grow from existing balance, not new contributions
        // This ensures liquid_capital_balance correctly reflects the depletion
        const canAfford = totalAllocatable >= totalCurrentAllocations;
        if (!canAfford && a.category !== 'home') {
          // Non-home goals: stop current_monthly contribution when budget insufficient
          // The deficit tracking already accounts for this gap
          console.log(`[Contribution Suspended Year ${year}] ${a.name}: current_monthly contribution $${Math.round(currentMonthlyAnnual)} suspended due to budget constraints`);
          currentMonthlyAnnual = 0;
        }
      }
      
      const totalYearlyContribution = additionalAmount + currentMonthlyAnnual;
      
      // Assume contributions are made evenly throughout the year, so apply half-year growth
      const growthOnContributions = totalYearlyContribution * (returnRate / 2);
      
      // New balance = old balance + growth on balance + contributions + growth on contributions
      const newBalance = previousBalance + growthOnBalance + totalYearlyContribution + growthOnContributions;
      
      cumulative[key] = newBalance;
      cumRow[key] = Math.round(newBalance);
      totalAllocatedValue += newBalance;
      
      // Check if goal is completed this year
      if (!status.completed && status.targetAmount > 0 && newBalance >= status.targetAmount) {
        status.completed = true;
        status.completedYear = year;
        console.log(`[Goal Completed] ${a.name} reached target $${status.targetAmount} in year ${year} (balance: $${Math.round(newBalance)}). Entering ${a.category === 'home' ? 'loan repayment' : 'completion'} phase.`);
        
        // Note: For home goals, the down payment withdrawal is automatically reflected 
        // by the account balance dropping to 0 in loan phase.
        // No need to manually track withdrawals - Total Saved already reflects the change.
      }
      
      if (year === 1) {
        console.log(`  - ${a.name}: balance=$${Math.round(newBalance)} (previous=$${Math.round(previousBalance)}, growth=$${Math.round(growthOnBalance + growthOnContributions)}, contribution=$${totalYearlyContribution}, return_rate=${(returnRate * 100).toFixed(2)}%)`);
      }
    });
    
    // Initialize total_allocated with sum of all current_amounts in year 1
    if (year === 1 && !cumulative.allocated) {
      cumulative.allocated = allocations.reduce((sum, a) => sum + toInt(a.current_amount, 0), 0);
    }
    
    // Update total_allocated with actual portfolio values (not just contributions)
    cumulative.allocated = totalAllocatedValue;
    cumRow.total_allocated = Math.round(totalAllocatedValue);
    
    // Liquid capital balance = Total Saved MINUS cumulative budget deficits
    // This is correct because:
    // - For active goals: balance = investments + returns
    // - For completed home goals in loan phase: balance = 0 (funds used for property)
    // - For completed non-home goals: balance = frozen at target
    // - When budget shortfalls occur (mortgage > income), they are covered from reserves
    // - cumulativeDeficit tracks all shortfalls that deplete liquid capital
    const liquidCapitalBalance = totalAllocatedValue - cumulativeDeficit;
    
    // Debug log for critical years
    if (year >= 5 && year <= 14) {
      console.log(`[Liquid Capital Year ${year}] totalAllocated=$${Math.round(totalAllocatedValue)}, cumulativeDeficit=$${Math.round(cumulativeDeficit)}, liquidCapital=$${Math.round(liquidCapitalBalance)}`);
    }
    
    // Update both timeline and cumulative rows with liquid capital balance
    row.liquid_capital_balance = Math.round(liquidCapitalBalance);
    cumRow.liquid_capital_balance = Math.round(liquidCapitalBalance);
    
    if (year === 1) {
      console.log(`[Cumulative Year 1] total_allocated=$${cumRow.total_allocated}, total_allocatable=$${cumRow.total_allocatable}, liquid_capital=$${Math.round(liquidCapitalBalance)}`);
      console.log(`[Cumulative Year 1 Keys] cumulative keys in row:`, Object.keys(cumRow));
      allocations.forEach(a => {
        const key = a.name || a.goal_name || a.goal_key;
        console.log(`  - ${a.name}: balance=$${cumRow[key]} (key="${key}")`);
      });
    }
    
    cumulativeTimeline.push(cumRow);
  }

  return { timeline, cumulativeTimeline, goalStatus };
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
  reservePctDefault = 25,
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
  
  console.log(`[OptimizationService] Budget: availableMonthly=${availableMonthly}, bufferRebuild=${bufferRebuildMonthly}, availableForGoals=${availableForGoals}`);

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
      
      // Place this BEFORE the debug block so idealForOptimizer is available
      // ENHANCED LOGIC: When only ONE goal exists, allow allocating entire available budget
      // (capped at 2.5x the minimum required to avoid over-concentration)
      // When multiple goals exist, use shortfall to ensure fair distribution
      const isSingleGoal = goalsWithTargets.length === 1;
      const idealForOptimizer = isSingleGoal
        ? Math.min(availableForGoals, idealMonthly * 2.5)  // Single goal: use all budget (up to 2.5x minimum)
        : shortfallMonthly;  // Multiple goals: use shortfall for fair distribution
      
      if (isSingleGoal) {
        console.log(`[Single Goal Optimization] ${g.goal_name}: idealMonthly=$${Math.round(idealMonthly)}, shortfall=$${Math.round(shortfallMonthly)}, available=$${Math.round(availableForGoals)}, idealForOptimizer=$${Math.round(idealForOptimizer)}`);
      }
      
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
          shortfall_monthly: shortfallMonthly,
          ideal_for_optimizer: idealForOptimizer
        });
      }
      return {
        ...g,
        ideal_monthly: idealForOptimizer,  // FIXED: Use full budget when single goal, shortfall when multiple
        current_monthly: currentMonthly,   // Keep current for display
        goal_key: g.goal_key || g.goal_label
      };
    });
    allocations = allocateByWeights({ goals: solverGoals, availableMonthly: availableForGoals });
    algoUsed = 'solver';
    
    console.log(`[OptimizationService] Allocations result:`, allocations.map(a => ({
      name: a.name,
      currentMonthly: a.current_monthly,
      recommendedMonthly: a.recommended_monthly,
      ideal: solverGoals.find(g => g.goal_name === a.name)?.ideal_monthly
    })));
    debugInfo = debug ? {
      available_monthly: availableForGoals,
      reserve_pct: reservePctDefault,
      goals: solverDebug
    } : null;
  }

  const { timeline, cumulativeTimeline, goalStatus } = buildTimeline({
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
  
  // Enrich allocations with completion year info
  const allocationsWithCompletionYear = allocations.map(a => {
    const key = a.name || a.goal_name || a.goal_key;
    const status = goalStatus[key];
    return {
      ...a,
      completion_year: status?.completedYear || null,
      is_completed: status?.completed || false
    };
  });

  const totalPriority = allocationsWithCompletionYear.reduce((sum, g) => sum + (g.optimization_weight || 0), 0) || 1;
  const compositeSuccess = allocationsWithCompletionYear.reduce((sum, g) => {
    const ideal = g.ideal_monthly || g.target_monthly || 0;
    const ratio = ideal > 0 ? Math.min(1, (g.recommended_monthly || 0) / ideal) : 1;
    return sum + ratio * (g.optimization_weight || 0);
  }, 0) / totalPriority;

  const result = {
    algorithm: algoUsed,
    financials: {
      ...financials,
      buffer_target: bufferTarget,
      buffer_shortfall: bufferShortfall,
      buffer_rebuild_monthly: bufferRebuildMonthly,
      available_for_goals: availableForGoals
    },
    allocations: allocationsWithCompletionYear,
    lp_status: lpStatus,
    lp_objective: lpObjective,
    timeline,
    cumulative_timeline: cumulativeTimeline,
    composite_success: Number((compositeSuccess * 100).toFixed(1)),
    debug: debugInfo
  };
  
  console.log(`[OptimizationService] Returning data:`, {
    timelineLength: timeline.length,
    cumulativeTimelineLength: cumulativeTimeline.length,
    firstTimelineRow: timeline[0],
    firstCumulativeRow: cumulativeTimeline[0],
    allocationsCount: allocationsWithCompletionYear.length,
    completionYears: allocationsWithCompletionYear.map(a => ({ name: a.name, year: a.completion_year }))
  });
  
  return result;
};

