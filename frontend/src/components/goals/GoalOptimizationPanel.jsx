import React, { useMemo, useState } from 'react';
import { Sparkles, RefreshCw, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import goalOptimizationService from '../../services/goalOptimizationService';

const GoalOptimizationPanel = ({ goalContext, goalsSnapshot, cashFlowsSnapshot, financialsSnapshot, onApplyRecommendation }) => {
  const [algorithm, setAlgorithm] = useState('heuristic');
  const [timelineView, setTimelineView] = useState('full');
  const [incomeGrowthPct, setIncomeGrowthPct] = useState(3);
  const [inflationPct, setInflationPct] = useState(2.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const currentGoalId = goalContext?._id || goalContext?.goal_id;
  const currentGoalName = goalContext?.goal_name;

  const currentGoalRow = useMemo(() => {
    if (!data?.allocations?.length) return null;
    return data.allocations.find(a =>
      (currentGoalId && a.goal_id && String(a.goal_id) === String(currentGoalId)) ||
      (currentGoalName && a.name === currentGoalName)
    );
  }, [data, currentGoalId, currentGoalName]);

  const runOptimization = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await goalOptimizationService.optimizeAllocations({
        goalContext,
        options: {
          algorithm,
          incomeGrowthPct,
          inflationPct,
          goalsSnapshot,
          cashFlowsSnapshot,
          financialsSnapshot,
          debug: true
        }
      });
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Optimization failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyToCurrentGoal = () => {
    if (!currentGoalRow || !onApplyRecommendation) return;
    onApplyRecommendation(currentGoalRow.recommended_monthly);
  };

  const financials = data?.financials || {};
  const meta = data?.meta || {};
  const allocations = data?.allocations || [];
  const budgetAvailable = financials.available_for_goals
    ?? financials.available_to_allocate
    ?? financials.monthly_surplus_allocatable
    ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1 rounded-md">
            <Sparkles size={14} />
          </div>
          <div className="font-bold text-slate-900 text-sm">Multi-Goal Optimizer</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700"
          >
            <option value="solver">Solver (PMT)</option>
            <option value="lp">LP</option>
          </select>
          <button
            type="button"
            onClick={runOptimization}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={12} />
            {isLoading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div className="text-[12px] text-slate-500 mt-2">
        Optimizes monthly allocation across all goals using your current surplus and priorities.
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2">
              Total surplus: <span className="font-bold text-slate-800">${financials.monthly_surplus_total ?? 0}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2">
              Reserve: <span className="font-bold text-slate-800">{financials.reserve_for_other_goals_pct ?? 40}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2">
              Available: <span className="font-bold text-slate-800">${budgetAvailable}</span>
            </div>
          </div>

          {financials.buffer_shortfall > 0 && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
              Cash reserve gap: ${financials.buffer_shortfall}. Reserving ${financials.buffer_rebuild_monthly}/mo to rebuild buffer.
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-600">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-700 mb-2">Constraints</div>
              <div>Budget: Σ allocations ≤ ${budgetAvailable}</div>
              <div>Reserve: {financials.reserve_for_other_goals_pct ?? 40}%</div>
              <div>Min cash buffer: {financials.buffer_target ?? 0}</div>
              {financials.buffer_shortfall > 0 && (
                <div>Buffer rebuild: ${financials.buffer_rebuild_monthly}/mo</div>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-700 mb-2">Solver</div>
              <div>Requested: {meta.algorithm_requested || algorithm}</div>
              <div>Used: {meta.algorithm_used || data?.algorithm || algorithm}</div>
              {meta.lp_status !== null && <div>LP status: {meta.lp_status}</div>}
              {meta.lp_objective !== null && <div>Objective: {Math.round(meta.lp_objective)}</div>}
              {data?.composite_success !== undefined && <div>Composite success: {data.composite_success}%</div>}
              {meta.algorithm_requested === 'lp' && meta.algorithm_used !== 'lp' && (
                <div className="text-amber-700">LP failed — fallback to heuristic.</div>
              )}
            </div>
          </div>

          <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50 text-[11px] font-bold text-slate-500 px-3 py-2">
              <div className="col-span-4">Goal</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-3 text-right">Recommended</div>
              <div className="col-span-3 text-right">Current</div>
            </div>
            {allocations.map((row, idx) => {
              const isCurrent = currentGoalRow && row.goal_id === currentGoalRow.goal_id;
              const rowKey = row.goal_id?.toString?.() || row.name || `row-${idx}`;
              return (
                <div
                  key={rowKey}
                  className={`grid grid-cols-12 px-3 py-2 text-[12px] border-t border-slate-100 ${
                    isCurrent ? 'bg-indigo-50/60' : 'bg-white'
                  }`}
                >
                  <div className="col-span-4 font-semibold text-slate-800">{row.name}</div>
                  <div className="col-span-2 text-slate-500">{row.priority || '—'}</div>
                  <div className="col-span-3 text-right font-bold text-slate-800">${row.recommended_monthly}</div>
                  <div className="col-span-3 text-right text-slate-500">${row.current_monthly ?? 0}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700">
              <BarChart3 size={14} className="text-slate-400" />
              Allocation vs Target
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allocations} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-10} height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val) => `$${val}`} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="current_monthly" name="Current" fill="#94a3b8" />
                  <Bar dataKey="target_monthly" name="Target" fill="#6366f1" />
                  <Bar dataKey="recommended_monthly" name="Recommended" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <BarChart3 size={14} className="text-slate-400" />
                Allocation Over Time
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <label className="flex items-center gap-1">
                  Income growth
                  <input
                    type="number"
                    value={incomeGrowthPct}
                    onChange={(e) => setIncomeGrowthPct(Number(e.target.value))}
                    className="w-12 bg-white border border-slate-200 rounded px-1 py-0.5 text-right"
                  />
                  %
                </label>
                <label className="flex items-center gap-1">
                  Inflation
                  <input
                    type="number"
                    value={inflationPct}
                    onChange={(e) => setInflationPct(Number(e.target.value))}
                    className="w-12 bg-white border border-slate-200 rounded px-1 py-0.5 text-right"
                  />
                  %
                </label>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { key: '1y', label: '1Y' },
                  { key: '5y', label: '5Y' },
                  { key: 'full', label: 'Full Horizon' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTimelineView(tab.key)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                      timelineView === tab.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              if (data?.timeline?.length) {
                return (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(val) => `$${val}`} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {allocations.map((a, idx) => (
                          <Bar
                            key={a.goal_key || a.goal_id || a.name || idx}
                            dataKey={a.goal_key || a.name}
                            name={a.goal_label || a.name}
                            stackId="alloc"
                            fill={idx % 2 === 0 ? '#6366f1' : '#8b5cf6'}
                          />
                        ))}
                        <Bar dataKey="free_surplus" name="Unallocated" stackId="alloc" fill="#e2e8f0" />
                        <Line type="monotone" dataKey="allocatable" name="Allocatable" stroke="#10b981" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              }
              const toInt = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
              const reservePct = toInt(financials.reserve_for_other_goals_pct, 40);
              const baseIncome = toInt(financials.monthly_income, 0);
              const baseOutflow = toInt(financials.monthly_outflow, 0);
              const bufferShortfall = toInt(financials.buffer_shortfall, 0);
              const bufferRebuildMonthly = toInt(financials.buffer_rebuild_monthly, 0);

              const calcMortgageMonthly = (a) => {
                if (a.category !== 'home') return 0;
                const price = toInt(a.goal_details?.property_price_estimate, 0);
                const depositPct = toInt(a.goal_details?.deposit_percentage, 20) / 100;
                const ratePct = toInt(a.goal_details?.mortgage_rate_pct, 6.5) / 100;
                const loanYears = toInt(a.goal_details?.loan_term_years, 0);
                if (!price || !loanYears) return 0;
                const loanPrincipal = Math.max(0, price * (1 - depositPct));
                const r = ratePct / 12;
                const n = loanYears * 12;
                if (r <= 0) return Math.round(loanPrincipal / n);
                const payment = loanPrincipal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                return Math.round(payment);
              };

              const goalHorizon = (a) => {
                const base = toInt(a.horizon_years, 1);
                const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
                return Math.max(1, base + loanYears);
              };

              const maxHorizon = Math.max(1, ...allocations.map(goalHorizon));
              const horizonYears = timelineView === '1y'
                ? 1
                : timelineView === '5y'
                ? Math.min(5, maxHorizon)
                : maxHorizon;

              let remainingBuffer = bufferShortfall;
              const rows = Array.from({ length: horizonYears }, (_, idx) => {
                const year = idx + 1;
                const incomeFactor = Math.pow(1 + Math.max(0, incomeGrowthPct) / 100, year - 1);
                const inflationFactor = Math.pow(1 + Math.max(0, inflationPct) / 100, year - 1);
                const income = baseIncome * incomeFactor;
                const outflow = baseOutflow * inflationFactor;
                const surplus = Math.max(0, income - outflow);
                let allocatable = Math.max(0, surplus * (1 - reservePct / 100));

                if (remainingBuffer > 0 && bufferRebuildMonthly > 0) {
                  const annualRebuild = Math.min(remainingBuffer, bufferRebuildMonthly * 12);
                  allocatable = Math.max(0, allocatable - annualRebuild / 12);
                  remainingBuffer -= annualRebuild;
                }

                const row = {
                  year,
                  allocatable: Math.round(allocatable * 12),
                  free_surplus: 0
                };

                let allocatedSum = 0;
                allocations.forEach((a) => {
                  const key = a.name;
                  const purchaseYears = toInt(a.horizon_years, 1);
                  const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
                  const mortgageMonthly = calcMortgageMonthly(a);
                  const isSavingsPhase = year <= purchaseYears;
                  const isLoanPhase = loanYears > 0 && year > purchaseYears && year <= purchaseYears + loanYears;
                  const amount = isSavingsPhase
                    ? Math.round((a.recommended_monthly || 0) * 12)
                    : isLoanPhase
                    ? Math.round(mortgageMonthly * 12)
                    : 0;
                  row[key] = amount;
                  allocatedSum += amount;
                });

                row.free_surplus = Math.max(0, row.allocatable - allocatedSum);
                return row;
              });

              return (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => `$${val}`} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {allocations.map((a, idx) => {
                        const barKey = a.goal_id?.toString?.() || a.name || `bar-${idx}`;
                        const dataKey = typeof a.name === 'string' && a.name.length > 0 ? a.name : `Goal ${idx + 1}`;
                        return (
                        <Bar
                          key={barKey}
                          dataKey={dataKey}
                          name={dataKey}
                          stackId="alloc"
                          fill={idx % 2 === 0 ? '#6366f1' : '#8b5cf6'}
                        />
                      );
                      })}
                      <Bar dataKey="free_surplus" name="Unallocated" stackId="alloc" fill="#e2e8f0" />
                      <Line type="monotone" dataKey="allocatable" name="Allocatable" stroke="#10b981" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <BarChart3 size={14} className="text-slate-400" />
              Cumulative Totals Over Time
            </div>
            {(() => {
              if (data?.cumulative_timeline?.length) {
                return (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.cumulative_timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(val) => `$${val}`} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {allocations.map((a, idx) => (
                          <Bar
                            key={a.goal_key || a.goal_id || a.name || idx}
                            dataKey={a.goal_key || a.name}
                            name={`${a.goal_label || a.name} (cum.)`}
                            stackId="cum"
                            fill={idx % 2 === 0 ? '#6366f1' : '#8b5cf6'}
                          />
                        ))}
                        <Line type="monotone" dataKey="total_allocatable" name="Cumulative Available" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="total_allocated" name="Cumulative Allocated" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              }
              const toInt = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
              const reservePct = toInt(financials.reserve_for_other_goals_pct, 40);
              const baseIncome = toInt(financials.monthly_income, 0);
              const baseOutflow = toInt(financials.monthly_outflow, 0);
              const bufferShortfall = toInt(financials.buffer_shortfall, 0);
              const bufferRebuildMonthly = toInt(financials.buffer_rebuild_monthly, 0);

              const calcMortgageMonthly = (a) => {
                if (a.category !== 'home') return 0;
                const price = toInt(a.goal_details?.property_price_estimate, 0);
                const depositPct = toInt(a.goal_details?.deposit_percentage, 20) / 100;
                const ratePct = toInt(a.goal_details?.mortgage_rate_pct, 6.5) / 100;
                const loanYears = toInt(a.goal_details?.loan_term_years, 0);
                if (!price || !loanYears) return 0;
                const loanPrincipal = Math.max(0, price * (1 - depositPct));
                const r = ratePct / 12;
                const n = loanYears * 12;
                if (r <= 0) return Math.round(loanPrincipal / n);
                const payment = loanPrincipal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                return Math.round(payment);
              };

              const goalHorizon = (a) => {
                const base = toInt(a.horizon_years, 1);
                const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
                return Math.max(1, base + loanYears);
              };

              const maxHorizon = Math.max(1, ...allocations.map(goalHorizon));
              const horizonYears = timelineView === '1y'
                ? 1
                : timelineView === '5y'
                ? Math.min(5, maxHorizon)
                : maxHorizon;

              let remainingBuffer = bufferShortfall;
              const cumulative = {};
              const rows = Array.from({ length: horizonYears }, (_, idx) => {
                const year = idx + 1;
                const incomeFactor = Math.pow(1 + Math.max(0, incomeGrowthPct) / 100, year - 1);
                const inflationFactor = Math.pow(1 + Math.max(0, inflationPct) / 100, year - 1);
                const income = baseIncome * incomeFactor;
                const outflow = baseOutflow * inflationFactor;
                const surplus = Math.max(0, income - outflow);
                let allocatable = Math.max(0, surplus * (1 - reservePct / 100));

                if (remainingBuffer > 0 && bufferRebuildMonthly > 0) {
                  const annualRebuild = Math.min(remainingBuffer, bufferRebuildMonthly * 12);
                  allocatable = Math.max(0, allocatable - annualRebuild / 12);
                  remainingBuffer -= annualRebuild;
                }

                const row = { year, total_allocatable: 0, total_allocated: 0 };
                cumulative.allocatable = (cumulative.allocatable || 0) + allocatable * 12;
                row.total_allocatable = Math.round(cumulative.allocatable);

                allocations.forEach((a) => {
                  const key = a.name;
                  const purchaseYears = toInt(a.horizon_years, 1);
                  const loanYears = a.category === 'home' ? toInt(a.goal_details?.loan_term_years, 0) : 0;
                  const mortgageMonthly = calcMortgageMonthly(a);
                  const isSavingsPhase = year <= purchaseYears;
                  const isLoanPhase = loanYears > 0 && year > purchaseYears && year <= purchaseYears + loanYears;
                  const amount = isSavingsPhase
                    ? (a.recommended_monthly || 0) * 12
                    : isLoanPhase
                    ? mortgageMonthly * 12
                    : 0;
                  cumulative[key] = (cumulative[key] || 0) + amount;
                  row[key] = Math.round(cumulative[key]);
                  row.total_allocated += Math.round(amount);
                });

                cumulative.allocated = (cumulative.allocated || 0) + row.total_allocated;
                row.total_allocated = Math.round(cumulative.allocated);
                return row;
              });

              return (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => `$${val}`} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {allocations.map((a, idx) => {
                        const barKey = a.goal_id?.toString?.() || a.name || `cum-${idx}`;
                        const dataKey = typeof a.name === 'string' && a.name.length > 0 ? a.name : `Goal ${idx + 1}`;
                        return (
                        <Bar
                          key={barKey}
                          dataKey={dataKey}
                          name={`${dataKey} (cum.)`}
                          stackId="cum"
                          fill={idx % 2 === 0 ? '#6366f1' : '#8b5cf6'}
                        />
                      );
                      })}
                      <Line type="monotone" dataKey="total_allocatable" name="Cumulative Available" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="total_allocated" name="Cumulative Allocated" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

          {currentGoalRow && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Suggested for this goal: <span className="font-bold text-slate-800">${currentGoalRow.recommended_monthly}</span>/mo
              </div>
              <button
                type="button"
                onClick={applyToCurrentGoal}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply to this goal
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoalOptimizationPanel;

