const PROFILE_FALLBACK = {
  id: 'demo-user',
  name: 'Sarah Mitchell',
  email: 'sarah@finmind.ai',
  income: 120000,
  monthlyIncome: 10000,
  monthlyExpenses: 5800,
  monthlyContribution: 1200,
  riskTolerance: 'Balanced',
  assets: [
    {
      id: 'cash',
      label: 'Cash & Savings',
      value: 35000,
      isLiquid: true,
      category: 'Cash',
    },
    {
      id: 'investments',
      label: 'Liquid Investments',
      value: 62000,
      isLiquid: true,
      category: 'Investments',
    },
    {
      id: 'kiwisaver',
      label: 'KiwiSaver',
      value: 42300,
      isLiquid: false,
      category: 'KiwiSaver',
    },
    {
      id: 'primary-home',
      label: 'Primary Home',
      value: 480000,
      isLiquid: false,
      category: 'Property',
    },
  ],
  liabilities: [
    { id: 'mortgage', label: 'Mortgage', value: 310000, category: 'Mortgage' },
    { id: 'student-loan', label: 'Student Loan', value: 14000, category: 'Debt' },
  ],
  liquidity: {
    now: 0.35,
    soon: 0.25,
    later: 0.4,
  },
  goals: [
    {
      id: 'goal-home',
      title: 'Goal 1: First Home',
      targetAmount: 200000,
      currentAmount: 45000,
      projectedAmount: 78000,
      targetDate: '2026-12-31',
    },
    {
      id: 'goal-education',
      title: 'Goal 2: Education Fund',
      targetAmount: 60000,
      currentAmount: 17000,
      projectedAmount: 24000,
      targetDate: '2027-06-30',
    },
    {
      id: 'goal-retirement',
      title: 'Goal 3: Retirement & Pension',
      targetAmount: 500000,
      currentAmount: 142000,
      projectedAmount: 178000,
      targetDate: '2060-01-01',
    },
  ],
  kiwisaver: {
    provider: 'Milford Growth Fund',
    balance: 42300,
    return5y: 8.1,
    return1y: 6.8,
    benchmark: 6.5,
    benchmark1y: 5.2,
    fundNumber: 'A200',
  },
  aiInsight:
    '⚠️ Gap Alert: You are $122,000 short on your First Home goal. (Go to Simulator)',
  gapInsights: [
    "Reallocate $200/mo from discretionary spend to save $2,400/yr. (Go to Budgeting)",
    "A 5% savings boost adds $32,000 to your net worth by 2028. (Go to Simulator)",
  ],
};

export default PROFILE_FALLBACK;

