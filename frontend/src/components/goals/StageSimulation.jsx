import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pie as PieChart, PieChart as RechartsPieChart, Cell } from 'recharts';
import {
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

import StageLoading from './common/StageLoading';
import { LegendRow, MetricBadge } from './common/GoalUIPrimitives';

export const runMonteCarlo = (params, exposure, years, glidePathConfig = null) => {
  const iterations = 100;
  const allProjections = [];

  const RETURNS = { growth: 0.08, defensive: 0.04, liquidity: 0.02 };
  const VOLATILITY = { growth: 0.18, defensive: 0.06, liquidity: 0.01 };

  for (let i = 0; i < iterations; i++) {
    let balance = (params.initialCapital || 0) + (params.lumpSum || 0);
    const yearlyData = [];

    for (let y = 0; y <= years; y++) {
      let currentExposure = { ...exposure };
      if (glidePathConfig?.enabled && y > years - glidePathConfig.start_years_before_goal) {
        const progress =
          (y - (years - glidePathConfig.start_years_before_goal)) /
          glidePathConfig.start_years_before_goal;
        currentExposure = {
          growth:
            exposure.growth + (glidePathConfig.end_state.growth - exposure.growth) * progress,
          defensive:
            exposure.defensive +
            (glidePathConfig.end_state.defensive - exposure.defensive) * progress,
          liquidity:
            exposure.liquidity +
            (glidePathConfig.end_state.liquidity - exposure.liquidity) * progress,
        };
      }

      const expReturn =
        (currentExposure.growth / 100) * RETURNS.growth +
        (currentExposure.defensive / 100) * RETURNS.defensive +
        (currentExposure.liquidity / 100) * RETURNS.liquidity;
      const volatility =
        (currentExposure.growth / 100) * VOLATILITY.growth +
        (currentExposure.defensive / 100) * VOLATILITY.defensive +
        (currentExposure.liquidity / 100) * VOLATILITY.liquidity;

      const randomFactor = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
      const yearReturn = expReturn + randomFactor * volatility;

      const annualContribution = (params.monthlyContribution || 0) * 12;
      balance = (balance + annualContribution) * (1 + yearReturn);

      yearlyData.push({
        year: y,
        balance: Math.round(balance),
        contributions:
          (params.initialCapital || 0) + (params.lumpSum || 0) + annualContribution * y,
      });
    }
    allProjections.push(yearlyData);
  }

  const summaryData = [];
  for (let y = 0; y <= years; y++) {
    const yearValues = allProjections.map((proj) => proj[y].balance).sort((a, b) => a - b);
    const contributions = allProjections[0][y].contributions;
    summaryData.push({
      year: y,
      median: yearValues[Math.floor(iterations * 0.5)],
      low: yearValues[Math.floor(iterations * 0.1)],
      high: yearValues[Math.floor(iterations * 0.9)],
      contributions,
    });
  }

  const expectedReturn =
    (exposure.growth / 100) * RETURNS.growth * 100 +
    (exposure.defensive / 100) * RETURNS.defensive * 100 +
    (exposure.liquidity / 100) * RETURNS.liquidity * 100;
  const volatility =
    (exposure.growth / 100) * VOLATILITY.growth * 100 +
    (exposure.defensive / 100) * VOLATILITY.defensive * 100 +
    (exposure.liquidity / 100) * VOLATILITY.liquidity * 100;

  return { summaryData, expectedReturn, volatility, allProjections };
};

const StageSimulation = ({ goalContext, isLoadingAI }) => {
  const [activeTab, setActiveTab] = useState('projection');

  const strategy = goalContext.ai_decision?.strategy_recommendation || {};
  const exposure = strategy.economic_exposure || { growth: 60, defensive: 30, liquidity: 10 };
  const glidePath = strategy.glide_path;
  const contributionStrategy = strategy.contribution_strategy || {};

  const selectedPortfolio =
    goalContext.selectedPortfolio ||
    goalContext.product ||
    goalContext.ai_decision?.portfolio_options?.find(
      (p) => p.option_id === goalContext.selectedPortfolioId,
    ) ||
    goalContext.ai_decision?.portfolio_options?.[0];

  const targetDate = goalContext.due_date
    ? new Date(goalContext.due_date)
    : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
  const horizonYears = Math.max(
    1,
    Math.round((targetDate - new Date()) / (365.25 * 24 * 60 * 60 * 1000)),
  );

  const simParams = useMemo(
    () => ({
      initialCapital: goalContext.current_amount || 0,
      lumpSum: contributionStrategy.lump_sum_amount || 0,
      monthlyContribution: contributionStrategy.monthly_amount || goalContext.contribution?.amount || 0,
    }),
    [goalContext, contributionStrategy],
  );

  const hasStrategy = Boolean(goalContext.ai_decision?.strategy_recommendation);

  if (isLoadingAI && !hasStrategy) {
    return <StageLoading text="AI is structuring your simulation..." />;
  }

  const { summaryData, expectedReturn, volatility } = useMemo(
    () => runMonteCarlo(simParams, exposure, horizonYears, glidePath),
    [simParams, exposure, horizonYears, glidePath],
  );

  const targetAmount = goalContext.target_amount || 100000;
  const successProbability = useMemo(() => {
    if (!summaryData.length) return 0;
    const finalYear = summaryData[summaryData.length - 1];
    if (finalYear.median >= targetAmount) return 85 + Math.random() * 10;
    const ratio = finalYear.median / targetAmount;
    return Math.min(95, Math.max(15, ratio * 100));
  }, [summaryData, targetAmount]);

  const portfolioExposure = selectedPortfolio?.calculated_exposure || exposure;

  return (
    <div className="space-y-4 lg:space-y-6 flex flex-col min-h-0">
      <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl lg:rounded-2xl w-fit">
        {[
          { id: 'projection', label: 'Projection', icon: TrendingUp },
          { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
          { id: 'portfolio', label: 'Portfolio', icon: PieChartIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-1.5 px-3 lg:px-5 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon size={12} strokeWidth={2.5} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl lg:rounded-[2.5rem] p-3 lg:p-8 border border-slate-100 shadow-sm min-h-[280px] lg:min-h-[400px] flex flex-col">
        {activeTab === 'projection' && (
          <div className="flex flex-col gap-2 lg:gap-6">
            <div className="flex flex-col gap-2 mb-2 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-50 text-indigo-600 rounded-xl lg:rounded-2xl flex items-center justify-center">
                  <BarChart3 size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Twin Projection</h3>
                  <p className="text-[10px] lg:text-xs text-slate-500 font-medium italic">Monte Carlo Outcomes</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:gap-3 lg:justify-end">
                <MetricBadge label="Horizon" value={`${horizonYears}Y`} />
                <MetricBadge label="Exp. Return" value={`${expectedReturn.toFixed(1)}%`} color="text-indigo-600" />
                <MetricBadge label="Volatility" value={`${volatility.toFixed(1)}%`} color="text-rose-500" />
              </div>
            </div>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={summaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(y) => `Y${y}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`
                    }
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1.2rem',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px 20px',
                    }}
                    formatter={(value) => [`$${value.toLocaleString()}`, '']}
                    labelFormatter={(y) => `Year ${y}`}
                  />
                  <Area type="monotone" dataKey="high" stroke="none" fill="#6366f1" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="low" stroke="none" fill="#6366f1" fillOpacity={0.1} />
                  <Area
                    type="monotone"
                    dataKey="median"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fill="url(#colorMC)"
                    animationDuration={1500}
                  />
                  <ReferenceLine
                    y={targetAmount}
                    stroke="#cbd5e1"
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    label={{ value: 'Target', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Contributions vs Growth</h3>
                  <p className="text-xs text-slate-500 font-medium italic">Your investment journey over time</p>
                </div>
              </div>
            </div>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={summaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(y) => `Y${y}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`
                    }
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1.2rem',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px 20px',
                    }}
                    formatter={(value) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="contributions"
                    stackId="1"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorContrib)"
                    name="Your Contributions"
                  />
                  <Area
                    type="monotone"
                    dataKey="median"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorGrowth)"
                    name="Total Value (Median)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <PieChartIcon size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedPortfolio?.option_name || 'Portfolio Summary'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium italic">
                    {selectedPortfolio?.description || 'Your investment allocation'}
                  </p>
                </div>
              </div>
              {selectedPortfolio?.total_fees_estimate !== undefined && (
                <MetricBadge
                  label="Est. Fees"
                  value={`${selectedPortfolio.total_fees_estimate.toFixed(2)}%`}
                  color="text-indigo-600"
                />
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-8 items-start min-h-0">
              <div className="flex flex-col items-center justify-center relative bg-slate-50/30 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-slate-100/50">
                <div className="w-full h-[160px] lg:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <RechartsPieChart>
                      <PieChart
                        data={[
                          { name: 'Growth', value: portfolioExposure.growth || 0 },
                          { name: 'Defensive', value: portfolioExposure.defensive || 0 },
                          { name: 'Liquidity', value: portfolioExposure.liquidity || 0 },
                        ]}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#38bdf8" />
                        <Cell fill="#f472b6" />
                      </PieChart>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '1rem',
                          border: 'none',
                          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                        }}
                        formatter={(value) => [`${value.toFixed(1)}%`, '']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total</span>
                  <span className="text-xl font-bold text-slate-900">100%</span>
                </div>

                <div className="w-full mt-6 space-y-2.5">
                  <LegendRow label="Growth" value={`${(portfolioExposure.growth || 0).toFixed(1)}%`} color="bg-indigo-500" />
                  <LegendRow
                    label="Defensive"
                    value={`${(portfolioExposure.defensive || 0).toFixed(1)}%`}
                    color="bg-sky-400"
                  />
                  <LegendRow
                    label="Liquidity"
                    value={`${(portfolioExposure.liquidity || 0).toFixed(1)}%`}
                    color="bg-fuchsia-400"
                  />
                </div>
              </div>

              <div className="flex flex-col h-full min-h-0">
                {selectedPortfolio?.products?.length > 0 && (
                  <div className="space-y-3 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Underlying Assets</p>
                      <span className="text-[10px] font-bold text-slate-300">
                        {selectedPortfolio.products.length} Products
                      </span>
                    </div>
                    <div className="grid gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1" style={{ maxHeight: '320px' }}>
                      {selectedPortfolio.products.map((p, i) => (
                        <div
                          key={p.id || p.product_id || i}
                          className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-slate-400 font-medium block mb-0.5">Asset {i + 1}</span>
                            <h4 className="text-xs font-bold text-slate-700 truncate group-hover:text-slate-900" title={p.name}>
                              {p.name || p.product_name || `Product ${i + 1}`}
                            </h4>
                          </div>
                          <div className="ml-4 flex items-center">
                            <div className="h-8 w-[1px] bg-slate-100 mr-4" />
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-xl border border-indigo-100/50 shrink-0">
                              {p.weight_pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6">
        <div className="p-3 lg:p-6 bg-emerald-50/40 rounded-xl lg:rounded-[2rem] border border-emerald-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
          <div className="flex items-center gap-2 mb-1 lg:mb-4">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target size={14} className="text-emerald-600" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Success Prob.</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl lg:text-3xl font-bold text-emerald-700 tracking-tight">{successProbability.toFixed(0)}</p>
            <span className="text-base lg:text-lg font-bold text-emerald-600/60">%</span>
          </div>
        </div>

        <div className="p-3 lg:p-6 bg-indigo-50/40 rounded-xl lg:rounded-[2rem] border border-indigo-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
          <div className="flex items-center gap-2 mb-1 lg:mb-4">
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-indigo-100 flex items-center justify-center">
              <Wallet size={12} className="text-indigo-600" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Monthly Sav.</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base lg:text-xl font-bold text-indigo-600/60">$</span>
            <p className="text-2xl lg:text-3xl font-bold text-indigo-700 tracking-tight">
              {(simParams.monthlyContribution || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-3 lg:p-6 bg-amber-50/40 rounded-xl lg:rounded-[2rem] border border-amber-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
          <div className="flex items-center gap-2 mb-1 lg:mb-4">
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingDown size={12} className="text-amber-600" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-bold text-amber-700 uppercase tracking-wider">Glide Path</span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-amber-700 tracking-tight">
            {glidePath?.enabled ? 'Active' : 'Disabled'}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
          <Zap size={80} />
        </div>
        <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <AlertCircle size={12} /> Simulation Insight
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-indigo-200/60 uppercase tracking-wider">Expected Outcome</p>
            <p className="text-xl font-bold text-white tracking-tight">
              ${(summaryData[summaryData.length - 1]?.median || 0).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 border-l border-white/10 pl-8">
            <p className="text-[9px] font-bold text-rose-300/60 uppercase tracking-wider">Downside (10th)</p>
            <p className="text-xl font-bold text-white tracking-tight">
              ${(summaryData[summaryData.length - 1]?.low || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageSimulation;

