import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart4,
  CreditCard,
  DollarSign,
  Play,
  PieChart,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { buildProfile, fetchCurrentUserProfile, fetchProducts } from '../services/api';
import { scoreProduct } from '../utils/scoring';

const formatCurrency = (value, digits = 0) =>
  `$${Number(value || 0).toLocaleString('en-NZ', { maximumFractionDigits: digits })}`;

const describeDate = (value) => {
  if (!value) return 'TBD';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'TBD';
  return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const GOAL_ALLOCATION_COLORS = ['#6366f1', '#4ade80', '#22c55e', '#f97316', '#a855f7'];
const BUDGET_WEIGHTS = [
  { title: 'Cafe & Restaurants', color: '#a855f7', ratio: 0.14 },
  { title: 'Entertainment', color: '#6366f1', ratio: 0.12 },
  { title: 'Investments', color: '#0ea5e9', ratio: 0.18 },
  { title: 'Food & Groceries', color: '#22c55e', ratio: 0.2 },
  { title: 'Health & Beauty', color: '#fb923c', ratio: 0.14 },
  { title: 'Traveling', color: '#f43f5e', ratio: 0.22 },
];

const CASH_FLOW_HISTORY = {
  'Jan-Jun': [
    { month: 'Jan', value: 2500 },
    { month: 'Feb', value: 1800 },
    { month: 'Mar', value: -500 },
    { month: 'Apr', value: 2100 },
    { month: 'May', value: 1200 },
    { month: 'Jun', value: 900 },
  ],
  'Jul-Dec': [
    { month: 'Jul', value: 1200 },
    { month: 'Aug', value: 800 },
    { month: 'Sep', value: -400 },
    { month: 'Oct', value: 1500 },
    { month: 'Nov', value: 2200 },
    { month: 'Dec', value: 1800 },
  ],
};

const generateLinePath = (data) => {
  if (!data || data.length === 0) return '';
  const points = data.map((item, index) => {
    const x = ((index * 2 + 1) / 12) * 100;
    const height = Math.min(100, Math.abs(item.value) / 45);
    const y = 100 - height;
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
};

const buildLiquidityGradient = (segments) => {
  const total = segments.reduce((sum, segment) => sum + (segment.value ?? 0), 0) || 1;
  let cumulative = 0;
  const stops = segments.map((segment) => {
    const percentage = ((segment.value ?? 0) / total) * 100;
    const start = cumulative;
    cumulative += percentage;
    const end = cumulative;
    return `${segment.color} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
};

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(() => buildProfile());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLiquid, setShowLiquid] = useState(false);
  const [simulationBoost, setSimulationBoost] = useState(1);
  const [trendPeriod, setTrendPeriod] = useState('Jul-Dec');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [productsResult, userResult] = await Promise.allSettled([
          fetchProducts(),
          fetchCurrentUserProfile(),
        ]);

        if (!mounted) return;

        if (productsResult.status === 'fulfilled') {
          setProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
        } else {
          console.error(productsResult.reason);
          setError('Unable to load Marketplace products right now.');
        }

        if (userResult.status === 'fulfilled') {
          setProfile(userResult.value);
        } else {
          console.error(userResult.reason);
        }
      } catch (err) {
        if (mounted) {
          console.error(err);
          setError('Unable to refresh dashboard data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalAssets = useMemo(
    () =>
      profile.assets.reduce(
        (sum, asset) => sum + (typeof asset.value === 'number' ? asset.value : 0),
        0
      ),
    [profile.assets]
  );

  const totalLiabilities = useMemo(
    () =>
      profile.liabilities.reduce(
        (sum, liability) => sum + (typeof liability.value === 'number' ? liability.value : 0),
        0
      ),
    [profile.liabilities]
  );

  const netWorth = totalAssets - totalLiabilities;

  const liquidWealth = useMemo(
    () =>
      profile.assets.reduce(
        (sum, asset) => sum + (asset.isLiquid && typeof asset.value === 'number' ? asset.value : 0),
        0
      ),
    [profile.assets]
  );

  const primaryGoal = profile.goals[0] || null;
  const currentPct =
    primaryGoal && primaryGoal.targetAmount
      ? Math.min(1, primaryGoal.currentAmount / primaryGoal.targetAmount)
      : 0;
  const projectedPct =
    primaryGoal && primaryGoal.targetAmount
      ? Math.min(1, primaryGoal.projectedAmount / primaryGoal.targetAmount)
      : 0;
  const planHealthValue =
    primaryGoal && primaryGoal.targetAmount
      ? Math.min(
          100,
          Math.round(
            ((primaryGoal.currentAmount + primaryGoal.projectedAmount) / primaryGoal.targetAmount) *
              100
          )
        )
      : 0;
  const goalGap =
    primaryGoal && primaryGoal.targetAmount
      ? Math.max(
          0,
          primaryGoal.targetAmount - (primaryGoal.currentAmount + primaryGoal.projectedAmount)
        )
      : 0;

  const goalAllocation = useMemo(() => {
    const segments = profile.goals.map((goal, index) => {
      const amount = (goal.currentAmount ?? 0) + (goal.projectedAmount ?? 0);
      return {
        key: goal.id,
        label: goal.title,
        value: amount,
        color: GOAL_ALLOCATION_COLORS[index % GOAL_ALLOCATION_COLORS.length],
      };
    });
    const gradientSegments = segments.length
      ? segments
      : [
          {
            key: 'placeholder',
            label: 'Add goals',
            value: 1,
            color: '#e0e7ff',
          },
        ];
    return {
      segments,
      gradient: buildLiquidityGradient(gradientSegments),
      total: segments.reduce((sum, segment) => sum + (segment.value ?? 0), 0),
    };
  }, [profile.goals]);
  const goalAllocationCoverage = Math.min(
    100,
    Math.round((goalAllocation.total / Math.max(totalAssets, 1)) * 100)
  );

  const recommended = useMemo(() => {
    const universe = products.filter((p) =>
      ['KiwiSaver', 'ManagedFund', 'TermDeposit', 'Equity'].includes(p?.category)
    );
    const scored = universe
      .map((product) => scoreProduct(product, profile))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [products, profile]);

  const smartMoveProduct = recommended[0];
  const monthlyIncome = profile.monthlyIncome ?? profile.income / 12 ?? 0;
  const monthlyExpenses = profile.monthlyExpenses ?? 0;
  const surplus = monthlyIncome - monthlyExpenses;
  const simulationProjection = Math.round(netWorth + simulationBoost * 5000);

  const budgetCategories = useMemo(() => {
    const totalBudget = Math.max(monthlyExpenses, 0);
    let allocated = 0;
    return BUDGET_WEIGHTS.map((category, index) => {
      const isLast = index === BUDGET_WEIGHTS.length - 1;
      const amount = isLast
        ? Math.max(0, totalBudget - allocated)
        : Math.round(totalBudget * category.ratio);
      allocated += amount;
      const percentage = totalBudget > 0 ? Math.round((amount / totalBudget) * 100) : 0;
      return { ...category, amount, percentage };
    });
  }, [monthlyExpenses]);

  const budgetGradient = useMemo(() => {
    let cumulative = 0;
    const stops = budgetCategories.map((cat) => {
      const start = cumulative;
      cumulative += cat.percentage;
      const end = cumulative;
      return `${cat.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [budgetCategories]);

  const highestBudgetCategory =
    budgetCategories.length > 0
      ? budgetCategories.reduce((prev, current) =>
          current.amount > prev.amount ? current : prev
        )
      : null;

  const spendToIncome = Math.min(
    100,
    Math.round((monthlyExpenses / Math.max(monthlyIncome, 1)) * 100)
  );

  const gapMessage =
    goalGap > 0
      ? `We expect a gap of ${formatCurrency(goalGap)} for ${primaryGoal?.title ?? 'this goal'}.`
      : 'You are on track for this goal.';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <section className="space-y-4">
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-semibold">
              Download report
            </button>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white">
              <Plus size={12} />
              Add widget
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Column 1: Net Worth, Insight, Budget */}
          <div className="space-y-6">
            <section className="card-base p-6 space-y-4">
              <p className="text-xs tracking-widest text-slate-500">Net worth</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 p-2 text-slate-500">
                    <DollarSign size={24} />
                  </span>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(showLiquid ? liquidWealth : netWorth)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary-rounded px-3 py-2 text-[10px]"
                  onClick={() => setShowLiquid((prev) => !prev)}
                >
                  {showLiquid ? 'Full' : 'Liquid'}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {loading && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  Refreshing...
                </div>
              )}
            </section>

            <article className="card-base p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-widest text-slate-500">Money mind AI</p>
                  <h3 className="text-xl font-bold text-slate-900">Personalized insight</h3>
                </div>
                <Sparkles size={20} className="text-indigo-500" />
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                onClick={() => navigate('/playground')}
              >
                Simulator prompts
                <ArrowRight size={16} />
              </button>
            </article>

            <article className="card-base p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-widest text-slate-500">Budget</p>
                  <h3 className="text-xl font-bold text-slate-900">Monthly spend plan</h3>
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  {formatCurrency(monthlyExpenses)}
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-4">
                <div 
                  className="relative h-48 w-48 rounded-full"
                  style={{ background: budgetGradient }}
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
                     <p className="text-xs text-slate-500 font-semibold">Total Budget</p>
                     <p className="text-xl font-bold text-slate-900">{formatCurrency(monthlyExpenses)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {budgetCategories.map((category) => (
                  <div key={category.title} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-900 leading-tight">
                        {category.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          {/* Column 2 & 3: Goal Bridge, Simulator, Cash Flow, Picks */}
          <div className="lg:col-span-2 space-y-6">
            <article className="card-base p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-widest text-slate-500">Goal bridge</p>
                  <h2 className="text-xl font-bold text-slate-900">
                    {primaryGoal?.title ?? 'Primary goal'}
                  </h2>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                  onClick={() => navigate('/goals')}
                >
                  View details
                </button>
              </div>
              <div className="space-y-6">
                {profile.goals.map((goal) => {
                  const totalGoalFunds = (goal.currentAmount ?? 0) + (goal.projectedAmount ?? 0);
                  const goalProgress = goal.targetAmount
                    ? Math.min(1, totalGoalFunds / goal.targetAmount)
                    : 0;
                  const pct = Math.round(goalProgress * 100);
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
                        <p className="text-sm font-semibold text-slate-600">
                          {formatCurrency(goal.targetAmount ?? 0)}
                        </p>
                      </div>
                      <div className="relative h-6 w-full rounded-full bg-indigo-50">
                        <div
                          className="flex h-full items-center rounded-full bg-indigo-500 px-2 transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="grid gap-6 lg:grid-cols-2 items-start">
              <article className="card-base p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-widest text-slate-500">Goal accelerator</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">Timeline simulator</h3>
                  </div>
                  <div className="rounded-full bg-indigo-50 p-2 text-indigo-500">
                    <Play size={20} fill="currentColor" />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-slate-500">Time to goal</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        {simulationBoost > 0 ? `-${(simulationBoost * 3)} months` : '0 months'}
                      </span>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold tracking-wider">
                          <span className="text-indigo-400">Standard pace</span>
                          <span className="text-slate-400">60 mo</span>
                        </div>
                        <div className="h-2 w-full bg-indigo-50 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-300 w-full" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold tracking-wider">
                          <span className="text-indigo-600">Accelerated</span>
                          <span className="text-slate-400">{Math.max(0, 60 - (simulationBoost * 3))} mo</span>
                        </div>
                        <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
                             style={{ width: `${Math.max(0, (60 - (simulationBoost * 3)) / 60 * 100)}%` }} 
                           />
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-semibold text-slate-700">Monthly contribution</span>
                    <span className="text-sm font-bold text-indigo-600">+{simulationBoost * 10}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={simulationBoost}
                    onChange={(event) => setSimulationBoost(Number(event.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:bg-slate-200 transition-colors"
                  />
                </div>
                
                <button
                  type="button"
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  onClick={() => navigate('/playground')}
                >
                  Run full simulation
                  <ArrowRight size={16} />
                </button>
              </article>

              <div className="space-y-6">
                <article className="card-base p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs tracking-widest text-slate-500">Monthly surplus</p>
                      <h3 className="text-xl font-bold text-slate-900">
                        Monthly cash flow
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                      onClick={() => navigate('/budget')}
                    >
                      Adjust budget
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Income</span>
                        <span>{formatCurrency(monthlyIncome)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-indigo-50">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (monthlyIncome / (monthlyIncome + monthlyExpenses || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Expenses</span>
                        <span>{formatCurrency(monthlyExpenses)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-indigo-50">
                        <div
                          className={`h-full rounded-full transition-all ${
                            surplus < 0 ? 'bg-purple-600' : 'bg-indigo-300'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (monthlyExpenses / (monthlyIncome + monthlyExpenses || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                       <div className="flex items-center justify-between mb-3">
                         <p className="text-xs font-semibold text-slate-500">6-Month Trend</p>
                         <div className="flex rounded-lg bg-slate-100 p-0.5">
                           {['Jan-Jun', 'Jul-Dec'].map((period) => (
                             <button
                               key={period}
                               type="button"
                               onClick={() => setTrendPeriod(period)}
                               className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                                 trendPeriod === period
                                   ? 'bg-white text-indigo-600 shadow-sm'
                                   : 'text-slate-400 hover:text-slate-600'
                               }`}
                             >
                               {period}
                             </button>
                           ))}
                         </div>
                       </div>
                       <div className="relative h-24 w-full">
                          <svg 
                            className="absolute inset-0 h-full w-full z-10 pointer-events-none overflow-visible" 
                            viewBox="0 0 100 100" 
                            preserveAspectRatio="none"
                          >
                            <path
                              d={generateLinePath(CASH_FLOW_HISTORY[trendPeriod])}
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              className="drop-shadow-sm opacity-80"
                            />
                          </svg>

                          <div className="flex items-end justify-between h-full gap-2 relative z-0">
                              {CASH_FLOW_HISTORY[trendPeriod].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 w-full group">
                                  <div className="relative w-full flex items-end justify-center h-full bg-slate-50 rounded-md overflow-hidden">
                                    <div 
                                      className={`w-full rounded-t-md transition-all duration-500 ${item.value >= 0 ? 'bg-indigo-600' : 'bg-rose-400'}`}
                                      style={{ height: `${Math.min(100, Math.abs(item.value) / 45)}%` }}
                                    />
                                    <div className="absolute bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1 py-0.5 rounded -mb-6 z-20 whitespace-nowrap">
                                      {formatCurrency(item.value)}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400">{item.month}</span>
                                </div>
                              ))}
                           </div>
                       </div>
                    </div>
                  </div>
                </article>

                <article className="card-base p-6 space-y-4">
                  <div>
                    <p className="text-xs tracking-widest text-slate-500">Smart move</p>
                    <h3 className="text-xl font-bold text-slate-900">Top matched picks</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {recommended.length > 0 ? (
                      recommended.slice(0, 2).map((item) => (
                        <div 
                          key={`${item.product.id}-${item.product.name}`} 
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900 capitalize">
                              {item.product.provider.toLowerCase()}
                            </p>
                            <p className="text-xs text-slate-500">{item.product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-indigo-600">
                              {item.annual?.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-slate-400">p.a.</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No matches yet.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                    onClick={() => navigate('/marketplace')}
                  >
                    Open Marketplace
                  </button>
                </article>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
