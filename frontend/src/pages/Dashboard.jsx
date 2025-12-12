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
          <section className="card-base p-8 space-y-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">North Star</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 p-2 text-slate-500">
                    <DollarSign size={20} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-wide text-slate-500">
                      Total net worth
                    </p>
                    <p className="text-4xl font-bold text-slate-900">
                      {formatCurrency(showLiquid ? liquidWealth : netWorth)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Liquid wealth: {formatCurrency(liquidWealth)} · Assets {formatCurrency(totalAssets)} ·
                      Liabilities {formatCurrency(totalLiabilities)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-xs">
                <button
                  type="button"
                  className="btn-primary-rounded flex items-center gap-1 px-3 py-2 text-[11px]"
                  onClick={() => setShowLiquid((prev) => !prev)}
                >
                  {showLiquid ? 'View full net worth' : 'Spot liquid wealth'}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {loading && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                Refreshing your data…
              </div>
            )}
          </section>
        </section>
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="card-base p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Goal Bridge</p>
                <h2 className="text-xl font-bold text-slate-900">
                  {primaryGoal?.title ?? 'Primary Goal'}
                </h2>
              </div>
              <button
                type="button"
                className="text-xs font-semibold tracking-wide text-slate-500"
                onClick={() => navigate('/goals')}
              >
                View all goals
              </button>
            </div>
            <div className="space-y-3">
              {profile.goals.map((goal, index) => {
                const totalGoalFunds = (goal.currentAmount ?? 0) + (goal.projectedAmount ?? 0);
                const goalProgress = goal.targetAmount
                  ? Math.min(1, totalGoalFunds / goal.targetAmount)
                  : 0;
                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
                        <p className="text-[11px] text-slate-400">
                          Target {formatCurrency(goal.targetAmount ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col items-end gap-1 text-right">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">progress</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {Math.round(goalProgress * 100)}%
                      </span>
                      <div className="w-full">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${Math.min(100, goalProgress * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-slate-500">
                <span>Plan health</span>
                <span>{planHealthValue}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${planHealthValue}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-rose-600">{gapMessage}</div>
          </article>
          <article className="card-base p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Goal allocation</p>
                <h3 className="text-lg font-bold text-slate-900">Assets mapped to each goal</h3>
              </div>
              <PieChart size={20} className="text-slate-400" />
            </div>
            <div className="mt-5 flex items-center justify-center">
              <div
                className="relative h-40 w-40 rounded-full border border-slate-100"
                style={{ background: goalAllocation.gradient }}
              >
                <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-slate-600">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Mapped</span>
                  <span className="text-2xl text-slate-900">{goalAllocationCoverage}%</span>
                  <span className="text-xs tracking-[0.2em] text-slate-400">of assets</span>
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm">
              {goalAllocation.segments.length > 0 ? (
                goalAllocation.segments.map((segment) => {
                  const segmentShare = goalAllocation.total
                    ? Math.round((segment.value / goalAllocation.total) * 100)
                    : 0;
                  return (
                    <div key={segment.key} className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        {segment.label}
                      </span>
                      <span>{segmentShare}%</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">Add goals to see how assets are distributed.</p>
              )}
            </div>
          </article>
          <article className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">KiwiSaver</p>
                <h3 className="text-xl font-bold text-slate-900">{profile.kiwisaver.provider}</h3>
              </div>
              <CreditCard size={22} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Fund number {profile.kiwisaver.fundNumber}</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(profile.kiwisaver.balance)}
              </p>
              <p className="text-sm text-slate-500">
                1Y return {profile.kiwisaver.return1y?.toFixed(1)}% vs market{' '}
                {profile.kiwisaver.benchmark1y?.toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
              <span className="text-emerald-500">Aligned with {profile.riskTolerance}</span>
              <span className="text-slate-400">Snapshot</span>
            </div>
            <button
              type="button"
              className="btn-primary-rounded w-full py-3 text-xs font-semibold"
              onClick={() => navigate('/playground')}
            >
              Explore KiwiSaver strategies
            </button>
          </article>
        </section>
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Money Mind AI</p>
                <h3 className="text-xl font-bold text-slate-900">Personalized insight</h3>
              </div>
              <Sparkles size={20} className="text-indigo-500" />
            </div>
            <p className="text-sm text-slate-600">{profile.aiInsight}</p>
            <div className="space-y-2 text-xs text-slate-500">
              {profile.gapInsights.map((insight, idx) => (
                <p key={idx}>• {insight}</p>
              ))}
            </div>
            <button
              type="button"
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
              onClick={() => navigate('/playground')}
            >
              Simulator prompts
              <ArrowRight size={16} />
            </button>
          </article>
          <article className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Simulation sandbox</p>
                <h3 className="text-xl font-bold text-slate-900">Savings rate slider</h3>
              </div>
              <Play size={20} className="text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Adjust how aggressive the plan is. This teaser links into the Playground slider.
              </p>
              <input
                type="range"
                min="0"
                max="10"
                value={simulationBoost}
                onChange={(event) => setSimulationBoost(Number(event.target.value))}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Current boost {simulationBoost}x</span>
                <span>{formatCurrency(simulationProjection)}</span>
              </div>
            </div>
            <div className="h-24 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            <button
              type="button"
              className="btn-primary-rounded w-full py-3 text-xs font-semibold"
              onClick={() => navigate('/playground')}
            >
              Open Playground sandbox
            </button>
          </article>
          <article className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Budget</p>
                <h3 className="text-xl font-bold text-slate-900">Monthly spend plan</h3>
              </div>
              <div className="text-sm font-semibold text-slate-500">
                {formatCurrency(monthlyExpenses)}
              </div>
            </div>
            <div className="space-y-3">
              {budgetCategories.map((category) => (
                <div key={category.title} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.title}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {category.percentage}% · {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, category.percentage))}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="card-base lg:col-span-2 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Monthly surplus</p>
                <h3 className="text-xl font-bold text-slate-900">
                  {surplus >= 0 ? 'Surplus monitor' : 'Surplus monitor'}
                </h3>
              </div>
              <BarChart4 size={24} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>
                Income {formatCurrency(monthlyIncome)} · Expenses {formatCurrency(monthlyExpenses)}
              </span>
              <span className="text-slate-400">Surplus {formatCurrency(surplus)}</span>
            </div>
            <div className="space-y-2">
              <div className="rounded-full bg-slate-100 p-1">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (monthlyIncome / (monthlyIncome + monthlyExpenses || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="rounded-full bg-slate-100 p-1">
                <div
                  className="h-3 rounded-full bg-rose-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (monthlyExpenses / (monthlyIncome + monthlyExpenses || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </article>
          <article className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Smart move</p>
                <h3 className="text-xl font-bold text-slate-900">Marketplace feed</h3>
              </div>
              <ArrowUpRight size={20} className="text-slate-400" />
            </div>
            {smartMoveProduct ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">
                  {smartMoveProduct.product.name || smartMoveProduct.product.provider}
                </p>
                <p className="text-sm text-slate-500">
                  {smartMoveProduct.product.category} · {smartMoveProduct.annual?.toFixed(1)}% p.a.
                </p>
                <p className="text-sm text-slate-500">
                  Aligned with {profile.riskTolerance} risk tolerance
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No recommendation yet. Browse the Marketplace.</p>
            )}
            <div className="space-y-2 text-sm text-slate-500">
              {recommended.map((item) => (
                <div key={`${item.product.id}-${item.product.name}`} className="flex items-center justify-between">
                  <span>{item.product.provider}</span>
                  <span>{item.annual?.toFixed(1)}% p.a.</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary-rounded w-full py-3 text-xs font-semibold"
              onClick={() => navigate('/marketplace')}
            >
              Open Marketplace
            </button>
          </article>
        </section>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
