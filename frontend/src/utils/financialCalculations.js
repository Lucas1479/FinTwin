/**
 * 财务计算工具函数
 * 作为前端的 Single Source of Truth
 */

const TO_ANNUAL = {
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Quarterly': 4,
  'Yearly': 1,
  'Annually': 1,
  'Annual': 1,
  'One-Off': 0
};

/**
 * 标准化频率字段（兼容大小写和变体）
 */
export const normalizeFrequency = (frequency) => {
  if (!frequency) return 'Monthly';
  const f = String(frequency).toLowerCase().trim();
  if (f.startsWith('week')) return 'Weekly';
  if (f.startsWith('fort')) return 'Fortnightly';
  if (f.startsWith('month')) return 'Monthly';
  if (f.startsWith('quart')) return 'Quarterly';
  if (f.includes('year') || f.includes('annual')) return 'Yearly';
  if (f.includes('one')) return 'One-Off';
  return 'Monthly';
};

/**
 * 转换为月度金额
 */
export const toMonthly = (amount, frequency) => {
  const amt = Number(amount) || 0;
  if (!amt) return 0;
  const freq = normalizeFrequency(frequency);
  const annual = amt * (TO_ANNUAL[freq] || 0);
  return annual / 12;
};

/**
 * 从 CashFlows 计算财务快照
 * @param {Array} cashFlows - CashFlow 数组
 * @param {Object} options - 配置选项
 * @returns {Object} 财务快照
 */
export const computeFinancialsFromCashFlows = (cashFlows = [], options = {}) => {
  const incomes = cashFlows.filter(f => f.type === 'Income');
  
  // ⚠️ CRITICAL: 只计算 Expense 和 Subscription，不包含 Investment
  // Investment 是对盈余的分配，不是支出
  // 这样 monthly_surplus_total 才是"投资前盈余"
  const outflows = cashFlows.filter(f => 
    f.type === 'Expense' || 
    f.type === 'Subscription'
  );

  const monthlyIncome = incomes.reduce((sum, f) => 
    sum + toMonthly(f.amount, f.frequency), 0
  );
  
  const monthlyOutflow = outflows.reduce((sum, f) => 
    sum + toMonthly(f.amount, f.frequency), 0
  );

  // 投资前盈余 = Income - (Expense + Subscription)
  const monthlySurplusTotal = Math.max(0, monthlyIncome - monthlyOutflow);

  return {
    monthly_income: Math.round(monthlyIncome),
    monthly_outflow: Math.round(monthlyOutflow),
    monthly_surplus_total: Math.round(monthlySurplusTotal),
    calculation_source: 'frontend_real_time'
  };
};

/**
 * 从 Goals 提取其他目标的月度分配
 */
export const extractOtherGoalsMonthly = (goals = [], currentGoalId = null) => {
  return goals
    .filter(g => {
      const gid = g._id?.toString?.() || g.goal_id?.toString?.();
      const cid = currentGoalId?.toString?.();
      
      // 如果currentGoalId是undefined/null（新goal创建），包含所有existing goals
      if (!cid) {
        return true;
      }
      
      // 否则排除当前goal
      return gid && gid !== cid;
    })
    .map(g => {
      // 多个fallback路径提取月度投资额
      let monthlyAmount = 0;
      
      // 1. 从 ai_decision.strategy_recommendation.contribution_strategy
      if (g.ai_decision?.strategy_recommendation?.contribution_strategy?.monthly_amount) {
        monthlyAmount = g.ai_decision.strategy_recommendation.contribution_strategy.monthly_amount;
      }
      // 2. 从 simulation_data.contribution_strategy_hint
      else if (g.simulation_data?.contribution_strategy_hint?.monthly_amount) {
        monthlyAmount = g.simulation_data.contribution_strategy_hint.monthly_amount;
      }
      // 3. 从 plan.contribution_strategy
      else if (g.plan?.contribution_strategy?.monthly_amount) {
        monthlyAmount = g.plan.contribution_strategy.monthly_amount;
      }
      // 4. 从 plan.contribution (with frequency conversion)
      else if (g.plan?.contribution?.amount) {
        monthlyAmount = toMonthly(g.plan.contribution.amount, g.plan.contribution.frequency);
      }
      
      return {
        goal_id: g._id || g.goal_id,
        name: g.goal_name,
        priority: g.priority || 'want',
        monthly_allocation: Math.round(monthlyAmount)
      };
    })
    .filter(g => g.monthly_allocation > 0);
};
