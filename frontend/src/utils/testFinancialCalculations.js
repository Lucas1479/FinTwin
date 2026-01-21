/**
 * 财务计算工具的测试脚本
 * 在浏览器 Console 中运行以验证计算正确性
 */

import { computeFinancialsFromCashFlows, extractOtherGoalsMonthly } from './financialCalculations';

// 测试数据
const mockCashFlows = [
  { type: 'Income', amount: 5000, frequency: 'Monthly' },
  { type: 'Income', amount: 1000, frequency: 'Fortnightly' },
  { type: 'Expense', amount: 200, frequency: 'Weekly' },
  { type: 'Expense', amount: 1500, frequency: 'Monthly' },
  { type: 'Subscription', amount: 20, frequency: 'Monthly' },
  { type: 'Investment', amount: 500, frequency: 'Monthly' }
];

const mockGoals = [
  {
    _id: 'goal1',
    goal_name: 'Retirement',
    priority: 'need',
    plan: {
      contribution: { amount: 500, frequency: 'Monthly' }
    }
  },
  {
    _id: 'goal2',
    goal_name: 'Emergency Fund',
    priority: 'need',
    plan: {
      contribution: { amount: 300, frequency: 'Monthly' }
    }
  }
];

/**
 * 运行测试
 */
export const runFinancialCalculationsTest = () => {
  console.group('🧪 Financial Calculations Test');
  
  // Test 1: computeFinancialsFromCashFlows
  console.log('\n📊 Test 1: Compute Financials');
  const financials = computeFinancialsFromCashFlows(mockCashFlows, {
    reservePct: 40,
    otherGoalsMonthly: 800
  });
  
  console.table({
    'Monthly Income': financials.monthly_income,
    'Monthly Outflow': financials.monthly_outflow,
    'Monthly Surplus Total': financials.monthly_surplus_total,
    'Monthly Surplus Allocatable': financials.monthly_surplus_allocatable,
    'Available to Allocate': financials.available_to_allocate,
    'Reserve %': financials.reserve_for_other_goals_pct,
    'Reserved Other Goals': financials.reserved_other_goals,
    'Calculation Source': financials.calculation_source
  });
  
  // 验证计算逻辑
  const expectedIncome = 5000 + (1000 * 26 / 12); // 5000 + 2166.67 = 7166.67
  const expectedOutflow = (200 * 52 / 12) + 1500 + 20 + 500; // 866.67 + 1500 + 20 + 500 = 2886.67
  const expectedSurplus = expectedIncome - expectedOutflow; // 7166.67 - 2886.67 = 4280
  
  console.log('\n✅ Expected vs Actual:');
  console.table({
    'Income': { Expected: Math.round(expectedIncome), Actual: financials.monthly_income },
    'Outflow': { Expected: Math.round(expectedOutflow), Actual: financials.monthly_outflow },
    'Surplus': { Expected: Math.round(expectedSurplus), Actual: financials.monthly_surplus_total }
  });
  
  // Test 2: extractOtherGoalsMonthly
  console.log('\n📊 Test 2: Extract Other Goals');
  const otherGoals = extractOtherGoalsMonthly(mockGoals, 'goal1');
  
  console.table(otherGoals);
  
  console.log('\n✅ Validation:');
  console.log('- Should exclude goal1 (current goal):', otherGoals.length === 1);
  console.log('- Should include goal2:', otherGoals[0]?.name === 'Emergency Fund');
  console.log('- Monthly allocation:', otherGoals[0]?.monthly_allocation === 300);
  
  console.groupEnd();
  
  return {
    financials,
    otherGoals,
    success: true
  };
};

// 自动运行（如果在浏览器环境）
if (typeof window !== 'undefined') {
  window.runFinancialCalculationsTest = runFinancialCalculationsTest;
  console.log('💡 Tip: Run window.runFinancialCalculationsTest() to test financial calculations');
}
