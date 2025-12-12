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
    '⚠️ Your emergency buffer is parked in a 0% cash account. Consider a short-term deposit to earn ~$600/yr with similar safety.',
  gapInsights: [
    'Your home goal has a $122,000 gap today — a budgeting widget (see Playground → Simulator) can help you close it.',
    'Projecting a 10% higher savings rate unlocks $6k more gap coverage for 2025.',
  ],
};

export default PROFILE_FALLBACK;

