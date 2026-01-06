/**
 * FinTwin Evolution Engine (The Time Machine)
 * 
 * This engine takes a snapshot of the current financial state and "evolves" it 
 * into the future based on cash flow rules, investment plans, and market simulations.
 */

/**
 * Simple seeded random number generator (Mulberry32)
 * Ensures that for a given seed, we always get the same sequence of numbers.
 */
const seededRandom = (seed) => {
    return () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
};

/**
 * Evolves financial data by a given number of months.
 * 
 * @param {Object} data - { assets, liabilities, cashFlows, goals }
 * @param {number} months - Number of months to project forward
 * @param {string} marketCondition - 'Bull', 'Bear', 'Neutral' (Affects return skew)
 * @returns {Object} The evolved data snapshot
 */
export const evolveFinancials = (data, months, marketCondition = 'Neutral') => {
    const { assets = [], liabilities = [], cashFlows = [], goals = [] } = data;
    const years = months / 12;

    // Use a fixed seed or one based on user (if available) to ensure consistency across pages
    // For now, we use a constant so all users get the same "luck", 
    // but it's consistent for the same 'months' and 'marketCondition'.
    const baseSeed = 42; 

    // 1. Calculate Monthly Cash Flow Dynamics
    const incomes = cashFlows.filter(f => f.type === 'Income');
    const expenses = cashFlows.filter(f => f.type === 'Expense' || f.type === 'Subscription');
    const investments = cashFlows.filter(f => f.type === 'Investment');

    const toAnnual = (f) => f.amount * ({ 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Yearly': 1, 'One-Off': 0 }[f.frequency] || 0);
    
    const monthlyIncomeTotal = incomes.reduce((sum, f) => sum + toAnnual(f) / 12, 0);
    const monthlyLivingTotal = expenses.reduce((sum, f) => sum + toAnnual(f) / 12, 0);
    const monthlyInvestedTotal = investments.reduce((sum, f) => sum + toAnnual(f) / 12, 0);
    
    // Total monthly change for cash accounts (Income - Expenses - Committed Investments)
    const monthlySurplus = Math.max(0, monthlyIncomeTotal - monthlyLivingTotal - monthlyInvestedTotal);

    // 2. Evolve Assets
    const evolvedAssets = assets.map(asset => {
        let newValue = asset.value;
        const isCash = ['Cash_Bank', 'Cash_Physical'].includes(asset.category);
        const isInvestment = ['KiwiSaver', 'Invest_ManagedFund', 'Invest_Shares'].includes(asset.category);
        
        // --- A. Cash Growth (Surplus & Savings Interest) ---
        if (isCash) {
            const interestRate = (asset.asset_details?.interest_rate || 1) / 100;
            const cashAccountCount = assets.filter(a => ['Cash_Bank', 'Cash_Physical'].includes(a.category)).length || 1;
            
            // Apply monthly compound interest and monthly surplus addition
            for (let i = 0; i < months; i++) {
                newValue = newValue * (1 + interestRate / 12) + (monthlySurplus / cashAccountCount);
            }
        }

        // --- B. Investment Growth (Deterministic Market Engine) ---
        if (isInvestment) {
            // Create a seed unique to this asset and the simulation parameters
            // This ensures each asset has its own "luck" but it's consistent across renders
            const assetSeed = baseSeed + (asset.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
            const rng = seededRandom(assetSeed);

            // Base returns (Annualized)
            let baseReturn = 0.07; // Default 7%
            if (asset.category === 'KiwiSaver') baseReturn = 0.08;
            if (asset.category === 'Invest_ManagedFund') baseReturn = 0.06;
            
            // Apply Market Mode Offset
            if (marketCondition === 'Bull') baseReturn += 0.05;
            if (marketCondition === 'Bear') baseReturn -= 0.10;

            // Generate a random volatility component that is seeded
            // We want to simulate the cumulative effect of random months
            let cumulativeReturn = 1;
            const monthlyBaseReturn = Math.pow(1 + baseReturn, 1/12) - 1;
            
            for (let i = 0; i < months; i++) {
                // Seeded random fluctuation between -2% and +2% per month
                // (rng() - 0.5) * 0.04 gives range [-0.02, 0.02]
                const fluctuation = (rng() - 0.5) * 0.04; 
                cumulativeReturn *= (1 + monthlyBaseReturn + fluctuation);
            }
            
            newValue = newValue * cumulativeReturn;

            // Add Recurring Contributions (from CashFlow)
            const linkedGoalId = asset.asset_details?.linked_goal_id;

            // 仅按严格关联匹配定投，避免因模糊匹配把无关投资流叠加进来
            const relevantFlows = investments.filter(f => {
                const flowGoalId = f.goal_id || f.linked_goal_id || f.asset_details?.linked_goal_id;
                const matchesGoalId = linkedGoalId && flowGoalId && flowGoalId.toString() === linkedGoalId.toString();
                const matchesAssetId = f.asset_id && asset._id && f.asset_id.toString() === asset._id.toString();
                const matchesExactName = f.name && asset.name && f.name.trim() === asset.name.trim();
                return matchesGoalId || matchesAssetId || matchesExactName;
            });
            
            const monthlyContribution = relevantFlows.reduce((sum, f) => sum + toAnnual(f) / 12, 0);
            
            // Contributions also grow over time (simplified: add at start of month and grow)
            let contributionsValue = 0;
            for (let i = 0; i < months; i++) {
                // Add this month's contribution
                contributionsValue += monthlyContribution;
                // Grow the accumulated contributions for one month
                const fluctuation = (rng() - 0.5) * 0.04;
                contributionsValue *= (1 + monthlyBaseReturn + fluctuation);
            }
            newValue += contributionsValue;
        }

        return { ...asset, value: Math.round(newValue * 100) / 100 };
    });

    // 3. Evolve Liabilities (Mortgages pay down over time)
    const evolvedLiabilities = liabilities.map(l => {
        let newValue = l.value;
        if (l.category === 'Mortgage' || l.category === 'Loan_Personal') {
            // Assume a standard 25-year paydown slope (linear simplification for simulator)
            const annualPaydown = l.value / 25; 
            newValue = Math.max(0, newValue - (annualPaydown * years));
        }
        return { ...l, value: Math.round(newValue * 100) / 100 };
    });

    // 4. Evolve Goals (Sync current_amount with evolved assets)
    const evolvedGoals = goals.map(goal => {
        const associatedAssets = evolvedAssets.filter(a => a.asset_details?.linked_goal_id?.toString() === goal._id.toString());
        const liveCurrentAmount = associatedAssets.reduce((sum, a) => sum + (a.value || 0), 0);
        
        return {
            ...goal,
            current_amount: liveCurrentAmount,
            is_evolved: true
        };
    });

    // 5. Final Authoritative Wealth Summary (Ensures all pages match)
    const totalAssetsVal = evolvedAssets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilitiesVal = evolvedLiabilities.reduce((sum, l) => sum + l.value, 0);
    const liquidCapitalVal = evolvedAssets
        .filter(a => a.is_liquid || ['Invest_ManagedFund'].includes(a.category))
        .reduce((sum, a) => sum + a.value, 0);

    const evolvedWealth = {
        netWorth: Math.round((totalAssetsVal - totalLiabilitiesVal) * 100) / 100,
        liquidCapital: Math.round(liquidCapitalVal * 100) / 100,
        totalAssets: Math.round(totalAssetsVal * 100) / 100,
        totalLiabilities: Math.round(totalLiabilitiesVal * 100) / 100
    };

    return {
        assets: evolvedAssets,
        liabilities: evolvedLiabilities,
        goals: evolvedGoals,
        wealth: evolvedWealth,
        monthsProjected: months
    };
};
