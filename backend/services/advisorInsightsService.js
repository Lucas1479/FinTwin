/**
 * Advisor Insights Service
 * 
 * 轻量级服务，基于真实数据生成AI建议
 * - Goal Milestone: 目标里程碑庆祝
 * - PIR Mismatch: PIR税率优化建议
 * - Contribution Boost: 贡献增加建议
 */

import Goal from '../models/goalModel.js';
import User from '../models/userModel.js';
import CashFlow from '../models/cashFlowModel.js';
import FinancialAsset from '../models/financialAssetModel.js';

/**
 * 生成 Advisor Pulse 建议
 * @param {ObjectId} userId 
 * @returns {Promise<Array>} insights
 */
export const generateAdvisorInsights = async (userId) => {
  const insights = [];

  try {
    // 并行获取所有需要的数据
    const [user, goals, cashFlows, assets] = await Promise.all([
      User.findById(userId).select('compliance riskProfile household').lean(),
      Goal.find({ user_id: userId, status: { $in: ['planning', 'active', 'in_progress'] } })
        .select('goal_name category target_amount current_amount due_date status')
        .lean(),
      CashFlow.find({ user_id: userId }).lean(),
      FinancialAsset.find({ user_id: userId }).lean()
    ]);

    // 🔧 计算每个目标的实际 current_amount（从关联的资产）
    goals.forEach(goal => {
      const linkedAssets = assets.filter(a => 
        a.record_type === 'Asset' && 
        a.asset_details?.linked_goal_id?.toString() === goal._id.toString()
      );
      const calculatedAmount = linkedAssets.reduce((sum, a) => sum + (a.value || 0), 0);
      goal.current_amount = calculatedAmount; // 覆盖数据库中的值（通常为0）
    });

    // 生成各类建议（按优先级排序）
    const allChecks = [
      () => checkEmergencyFund(assets, cashFlows),           // 1. 应急基金检查（最重要）
      () => checkCashFlowHealth(cashFlows),                  // 2. 现金流健康度
      () => checkDebtLevel(assets, cashFlows),               // 3. 债务水平警告
      () => checkAssetAllocation(assets, goals),             // 4. 资产配置建议
      () => checkGoalMilestone(goals),                       // 5. 目标里程碑
      () => suggestContributionBoost(goals, cashFlows),      // 6. 贡献增加建议
      () => checkPIRMismatch(user, cashFlows),               // 7. PIR税率优化
      () => checkGoalPriority(goals),                        // 8. 目标优先级建议
    ];

    // 执行所有检查，收集非空结果
    for (const check of allChecks) {
      try {
        const insight = check();
        if (insight) insights.push(insight);
        if (insights.length >= 3) break; // 最多返回3条
      } catch (error) {
        console.error('[AdvisorInsights] Check failed:', error.message);
      }
    }

    console.log(`[AdvisorInsights] Generated ${insights.length} insights for user ${userId}`);
    
    // 返回最多3条建议（按优先级排序）
    return insights.slice(0, 3);

  } catch (error) {
    console.error('[AdvisorInsights] Error generating insights:', error);
    return []; // 失败时返回空数组，不影响Dashboard
  }
};

// ==========================================
// 新增：财务健康分析
// ==========================================

/**
 * 1. 应急基金检查（最重要的财务健康指标）
 */
function checkEmergencyFund(assets, cashFlows) {
  // 计算月度支出
  const monthlyExpenses = cashFlows
    .filter(cf => cf.type === 'Expense')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
  
  // 计算流动资产（现金、储蓄）
  const liquidAssets = assets
    .filter(a => a.record_type === 'Asset' && a.is_liquid)
    .reduce((sum, a) => sum + (a.value || 0), 0);
  
  const monthsCovered = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
  
  // 建议：至少3-6个月支出的应急基金
  if (monthsCovered < 3) {
    const shortfall = Math.round((3 * monthlyExpenses) - liquidAssets);
    return {
      type: 'warning',
      title: 'Emergency Fund',
      content: `⚠️ Your liquid assets ($${Math.round(liquidAssets).toLocaleString()}) cover only ${monthsCovered.toFixed(1)} months of expenses. Financial advisors recommend 3-6 months. Consider building up $${shortfall.toLocaleString()} more in accessible savings.`,
      action: 'Build Fund',
      metadata: {
        months_covered: monthsCovered.toFixed(1),
        shortfall,
        monthly_expenses: Math.round(monthlyExpenses)
      }
    };
  }
  
  if (monthsCovered >= 6) {
    return {
      type: 'success',
      title: 'Emergency Fund',
      content: `✅ Excellent! Your liquid assets cover ${monthsCovered.toFixed(1)} months of expenses ($${Math.round(liquidAssets).toLocaleString()}). Your emergency fund is well-established.`,
      action: 'View Assets',
      metadata: {
        months_covered: monthsCovered.toFixed(1),
        liquid_assets: Math.round(liquidAssets)
      }
    };
  }
  
  return null;
}

/**
 * 2. 现金流健康度分析
 */
function checkCashFlowHealth(cashFlows) {
  const monthlyIncome = cashFlows
    .filter(cf => cf.type === 'Income')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
    
  const monthlyExpenses = cashFlows
    .filter(cf => cf.type === 'Expense')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
    
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySurplus / monthlyIncome) * 100 : 0;
  
  // 储蓄率低于10% - 警告
  if (savingsRate < 10 && monthlySurplus > 0) {
    return {
      type: 'warning',
      title: 'Savings Rate',
      content: `💰 Your savings rate is ${savingsRate.toFixed(1)}% ($${Math.round(monthlySurplus)}/$${Math.round(monthlyIncome)}). Aim for at least 20% to build wealth effectively. Review your expense categories to find optimization opportunities.`,
      action: 'Analyze Spending',
      metadata: {
        savings_rate: savingsRate.toFixed(1),
        monthly_surplus: Math.round(monthlySurplus),
        monthly_income: Math.round(monthlyIncome)
      }
    };
  }
  
  // 储蓄率超过30% - 表扬
  if (savingsRate >= 30) {
    return {
      type: 'success',
      title: 'Savings Rate',
      content: `🌟 Outstanding! You're saving ${savingsRate.toFixed(0)}% of your income ($${Math.round(monthlySurplus)}/month). This discipline will accelerate your wealth building significantly.`,
      action: 'Optimize Investments',
      metadata: {
        savings_rate: savingsRate.toFixed(1),
        monthly_surplus: Math.round(monthlySurplus)
      }
    };
  }
  
  // 负现金流 - 严重警告
  if (monthlySurplus < 0) {
    return {
      type: 'warning',
      title: 'Cash Flow Alert',
      content: `🚨 Your monthly expenses ($${Math.round(monthlyExpenses)}) exceed income ($${Math.round(monthlyIncome)}) by $${Math.round(Math.abs(monthlySurplus))}. This is unsustainable. Review essential vs. discretionary spending immediately.`,
      action: 'Review Budget',
      metadata: {
        monthly_deficit: Math.round(Math.abs(monthlySurplus)),
        monthly_income: Math.round(monthlyIncome),
        monthly_expenses: Math.round(monthlyExpenses)
      }
    };
  }
  
  return null;
}

/**
 * 3. 债务水平检查
 */
function checkDebtLevel(assets, cashFlows) {
  const totalDebt = assets
    .filter(a => a.record_type === 'Liability')
    .reduce((sum, a) => sum + (a.value || 0), 0);
  
  const monthlyIncome = cashFlows
    .filter(cf => cf.type === 'Income')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
  
  const annualIncome = monthlyIncome * 12;
  
  if (totalDebt === 0) return null; // 没有债务，不显示
  
  const debtToIncomeRatio = annualIncome > 0 ? (totalDebt / annualIncome) : 0;
  
  // 债务收入比 > 3 - 警告（不包括房贷的话）
  // 房贷通常允许更高的比率
  const hasProperty = assets.some(a => 
    a.record_type === 'Asset' && 
    (a.category?.toLowerCase().includes('property') || a.category?.toLowerCase().includes('home'))
  );
  
  const threshold = hasProperty ? 5 : 3; // 有房产的话阈值更高
  
  if (debtToIncomeRatio > threshold) {
    return {
      type: 'warning',
      title: 'Debt Level',
      content: `⚠️ Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(1)}x ($${Math.round(totalDebt).toLocaleString()} debt vs $${Math.round(annualIncome).toLocaleString()} annual income). Consider prioritizing debt reduction to improve financial flexibility.`,
      action: 'View Liabilities',
      metadata: {
        debt_to_income_ratio: debtToIncomeRatio.toFixed(1),
        total_debt: Math.round(totalDebt),
        annual_income: Math.round(annualIncome)
      }
    };
  }
  
  return null;
}

/**
 * 4. 资产配置建议
 */
function checkAssetAllocation(assets, goals) {
  const assetList = assets.filter(a => a.record_type === 'Asset');
  const totalAssetValue = assetList.reduce((sum, a) => sum + (a.value || 0), 0);
  
  if (totalAssetValue === 0) return null;
  
  // 计算流动性比例
  const liquidValue = assetList
    .filter(a => a.is_liquid)
    .reduce((sum, a) => sum + (a.value || 0), 0);
  
  const liquidityRatio = (liquidValue / totalAssetValue) * 100;
  
  // 计算未分配资产比例
  const unallocatedValue = assetList
    .filter(a => !a.asset_details?.linked_goal_id)
    .reduce((sum, a) => sum + (a.value || 0), 0);
  
  const unallocatedRatio = (unallocatedValue / totalAssetValue) * 100;
  
  // 流动性过高（>50%）且有长期目标 - 建议投资
  const hasLongTermGoals = goals.some(g => {
    const yearsRemaining = (new Date(g.due_date) - new Date()) / (1000 * 60 * 60 * 24 * 365);
    return yearsRemaining > 3;
  });
  
  if (liquidityRatio > 50 && hasLongTermGoals) {
    return {
      type: 'opportunity',
      title: 'Asset Allocation',
      content: `📊 ${liquidityRatio.toFixed(0)}% of your assets ($${Math.round(liquidValue).toLocaleString()}) are in cash/liquid form. With your long-term goals, consider shifting some to growth investments for better returns.`,
      action: 'Optimize Portfolio',
      metadata: {
        liquidity_ratio: liquidityRatio.toFixed(1),
        liquid_value: Math.round(liquidValue),
        total_assets: Math.round(totalAssetValue)
      }
    };
  }
  
  // 大量未分配资产（>30%）
  if (unallocatedRatio > 30 && unallocatedValue > 5000) {
    return {
      type: 'opportunity',
      title: 'Unallocated Assets',
      content: `🎯 You have $${Math.round(unallocatedValue).toLocaleString()} (${unallocatedRatio.toFixed(0)}%) in unallocated assets. Link these to your goals for clearer progress tracking and strategic allocation.`,
      action: 'Allocate Assets',
      metadata: {
        unallocated_value: Math.round(unallocatedValue),
        unallocated_ratio: unallocatedRatio.toFixed(1)
      }
    };
  }
  
  return null;
}

/**
 * 8. 目标优先级建议
 */
function checkGoalPriority(goals) {
  if (goals.length < 2) return null; // 只有1个或没有目标时不建议
  
  // 找出即将到期的目标（<12个月）
  const urgentGoals = goals.filter(g => {
    const monthsRemaining = (new Date(g.due_date) - new Date()) / (1000 * 60 * 60 * 24 * 30);
    const progressPct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    return monthsRemaining < 12 && monthsRemaining > 0 && progressPct < 90;
  });
  
  if (urgentGoals.length > 0) {
    const goal = urgentGoals[0];
    const monthsLeft = Math.round((new Date(goal.due_date) - new Date()) / (1000 * 60 * 60 * 24 * 30));
    const progressPct = Math.round((goal.current_amount / goal.target_amount) * 100);
    const remaining = goal.target_amount - goal.current_amount;
    
    return {
      type: 'warning',
      title: 'Goal Priority',
      content: `⏰ Your "${goal.goal_name}" goal is ${monthsLeft} months away but only ${progressPct}% complete. You need $${Math.round(remaining).toLocaleString()} more. Consider prioritizing this over longer-term goals.`,
      action: 'Adjust Priorities',
      metadata: {
        goal_id: goal._id,
        goal_name: goal.goal_name,
        months_left: monthsLeft,
        progress_pct: progressPct,
        remaining
      }
    };
  }
  
  return null;
}

// ==========================================
// 原有功能（保留但优先级降低）
// ==========================================

/**
 * 5. 检查目标里程碑（25%, 50%, 75%, 90%）
 */
function checkGoalMilestone(goals) {
  const MILESTONES = [
    { threshold: 90, label: '90%', message: 'almost there' },
    { threshold: 75, label: '75%', message: 'three quarters' },
    { threshold: 50, label: '50%', message: 'halfway' },
    { threshold: 25, label: '25%', message: 'first quarter' }
  ];

  for (const goal of goals) {
    if (!goal.target_amount || goal.target_amount === 0) continue;
    
    const progressPct = (goal.current_amount / goal.target_amount) * 100;
    
    // 找到刚刚跨越的里程碑（±3%范围内算"刚刚达到"）
    for (const milestone of MILESTONES) {
      if (progressPct >= milestone.threshold - 3 && progressPct <= milestone.threshold + 3) {
        const goalName = goal.goal_name || 'Your goal';
        const categoryEmoji = getCategoryEmoji(goal.category);
        
        return {
          type: 'success',
          title: 'Goal Milestone',
          content: `${categoryEmoji} You just crossed ${milestone.threshold}% of your ${goalName}! Keep up the consistent pace!`,
          action: 'View Details',
          metadata: {
            goal_id: goal._id,
            progress_pct: Math.round(progressPct),
            milestone: milestone.threshold
          }
        };
      }
    }
  }
  
  return null;
}

/**
 * 6. 建议增加贡献（找最接近完成的目标）
 */
function suggestContributionBoost(goals, cashFlows) {
  // 计算月度盈余
  const monthlyIncome = cashFlows
    .filter(cf => cf.type === 'Income')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
    
  const monthlyExpenses = cashFlows
    .filter(cf => cf.type === 'Expense')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0);
    
  const monthlySurplus = monthlyIncome - monthlyExpenses;

  // 找出最接近完成的目标（进度在30-80%之间）
  let bestCandidate = null;
  let bestScore = 0;

  for (const goal of goals) {
    if (!goal.target_amount || !goal.due_date) continue;
    
    const progressPct = (goal.current_amount / goal.target_amount) * 100;
    
    // 只考虑进度在15-85%之间的目标（太早或太晚都不建议）
    if (progressPct < 15 || progressPct > 85) continue;
    
    const remaining = goal.target_amount - goal.current_amount;
    const monthsLeft = Math.max(1, Math.round((new Date(goal.due_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)));
    
    // 评分：进度越高、时间越紧、金额越合理，分数越高
    const score = progressPct / monthsLeft;
    
    if (score > bestScore && remaining > 0 && monthlySurplus > 100) {
      bestScore = score;
      bestCandidate = {
        goal,
        remaining,
        monthsLeft,
        suggestedIncrease: Math.min(Math.round(monthlySurplus * 0.3 / 50) * 50, 500) // 最多建议增加30%盈余，向上取整到50
      };
    }
  }

  if (bestCandidate && bestCandidate.suggestedIncrease >= 100) {
    const { goal, suggestedIncrease, monthsLeft } = bestCandidate;
    const goalName = goal.goal_name || 'your goal';
    const categoryEmoji = getCategoryEmoji(goal.category);
    
    // 根据截止日期生成友好的时间描述
    const dueDate = new Date(goal.due_date);
    const dueDateStr = getTimeUntilDescription(dueDate);
    
    return {
      type: 'opportunity',
      title: 'Contribution Boost',
      content: `${categoryEmoji} Increase monthly contribution by $${suggestedIncrease} to achieve your ${goalName} ${dueDateStr}.`,
      action: 'Apply Now',
      metadata: {
        goal_id: goal._id,
        suggested_increase: suggestedIncrease,
        months_left: monthsLeft
      }
    };
  }

  return null;
}

/**
 * 7. 检查PIR税率是否匹配收入
 */
function checkPIRMismatch(user, cashFlows) {
  const currentPIR = user?.compliance?.pirRate || 0.28;
  
  // 计算年收入
  const annualIncome = cashFlows
    .filter(cf => cf.type === 'Income' && cf.category === 'Salary')
    .reduce((sum, cf) => sum + (cf.amount || 0), 0) * 12;

  // NZ PIR 档位（2024规则）
  // 10.5%: 年收入 ≤ $14,000 或 (年收入 ≤ $48,000 且总收入 ≤ $70,000)
  // 17.5%: 年收入 $14,001 - $48,000
  // 28%: 年收入 > $48,000
  
  let recommendedPIR = 0.28;
  if (annualIncome <= 14000) {
    recommendedPIR = 0.105;
  } else if (annualIncome <= 48000) {
    recommendedPIR = 0.175;
  }

  // 如果当前PIR高于建议PIR，提示优化
  if (currentPIR > recommendedPIR && annualIncome > 0) {
    const currentPct = (currentPIR * 100).toFixed(1);
    const recommendedPct = (recommendedPIR * 100).toFixed(1);
    
    return {
      type: 'warning',
      title: 'PIR Mismatch',
      content: `⚠️ Your current PIR is ${currentPct}%, but based on your income (~$${Math.round(annualIncome / 1000)}k/year), you might qualify for ${recommendedPct}%.`,
      action: 'Review Tax',
      metadata: {
        current_pir: currentPIR,
        recommended_pir: recommendedPIR,
        annual_income: Math.round(annualIncome)
      }
    };
  }

  return null;
}

/**
 * 辅助函数：获取目标分类的 emoji
 */
function getCategoryEmoji(category) {
  const emojiMap = {
    retirement: '🏖️',
    home: '🏠',
    education: '🎓',
    travel: '✈️',
    emergency: '🛡️',
    wealth: '💰',
    big_purchase: '🎁',
    custom: '🎯'
  };
  return emojiMap[category] || '🎯';
}

/**
 * 辅助函数：生成友好的时间描述
 */
function getTimeUntilDescription(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const monthsLeft = Math.round((target - now) / (1000 * 60 * 60 * 24 * 30));
  
  if (monthsLeft <= 2) return 'within 2 months';
  if (monthsLeft <= 6) return `before ${target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  if (monthsLeft <= 12) return `before end of ${target.getFullYear()}`;
  
  // 检查是否是特殊日期
  const month = target.getMonth();
  if (month === 11) return `before Christmas ${target.getFullYear()}`; // December
  if (month === 0) return `before New Year ${target.getFullYear()}`; // January
  
  return `by ${target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

export default {
  generateAdvisorInsights
};
