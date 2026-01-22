import React, { useMemo, useState } from 'react';
import { Sparkles, RefreshCw, BarChart3, Settings, AlertTriangle, CheckCircle2, ArrowRight, TrendingUp, Zap, Clock, Info } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ComposedChart, Line, Area, CartesianGrid, ReferenceLine 
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import goalOptimizationService from '../../services/goalOptimizationService';

const CARD_BASE = "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300";

const COLORS = {
  primary: '#4f46e5',    // Indigo 600
  secondary: '#818cf8',  // Indigo 400
  accent: '#10b981',     // Emerald 500
  neutral: '#cbd5e1',    // Slate 300
  background: '#f8fafc', // Slate 50
};

const CompactMetric = ({ label, value, subtext, colorClass = "text-slate-900" }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</span>
    <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
    {subtext && <div className="text-[10px] text-slate-400 font-medium">{subtext}</div>}
  </div>
);

const ImpactCard = ({ name, completionYear, improvement, paidOffYear }) => (
  <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:bg-white">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 truncate" title={name}>{name}</div>
    <div className="flex items-baseline gap-1 mb-1">
      <span className="text-2xl font-bold text-slate-900">{completionYear}</span>
      <span className="text-xs text-slate-500 font-medium">years</span>
    </div>
    {paidOffYear && (
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={10} className="text-slate-400" />
        <span className="text-[10px] text-slate-500">Paid off in Year {paidOffYear}</span>
      </div>
    )}
    {improvement > 0 ? (
      <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit border border-emerald-100/50">
        <Zap size={10} fill="currentColor" />
        <span className="text-[10px] font-bold">{improvement} years faster</span>
      </div>
    ) : (
      <div className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-lg w-fit">
        On track
      </div>
    )}
  </div>
);

const GoalOptimizationPanel = ({ goalContext, goalsSnapshot, cashFlowsSnapshot, financialsSnapshot, onApplyRecommendation }) => {
  // CRITICAL: Default to 'solver' as requested
  const [algorithm, setAlgorithm] = useState('solver');
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
          debug: true,
          generate_explanation: true // Enable AI explanation generation
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

  const financials = data?.financials || financialsSnapshot || {};
  const meta = data?.meta || {};
  const allocations = data?.allocations || [];
  
  const budgetAvailable = data 
    ? (financials.available_for_goals ?? financials.available_to_allocate ?? 0)
    : (financialsSnapshot?.monthly_surplus_allocatable || 0);

  const reservePct = financials.reserve_for_other_goals_pct ?? 25; // Default from original file

  // Filter timeline data based on view
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline?.length) return [];
    const timeline = data.timeline;
    if (timelineView === '1y') return timeline.slice(0, 1);
    if (timelineView === '5y') return timeline.slice(0, 5);
    if (timelineView === '10y') return timeline.slice(0, 10);
    return timeline;
  }, [data?.timeline, timelineView]);

  const filteredCumulativeTimeline = useMemo(() => {
    if (!data?.cumulative_timeline?.length) return [];
    const timeline = data.cumulative_timeline;
    if (timelineView === '1y') return timeline.slice(0, 1);
    if (timelineView === '5y') return timeline.slice(0, 5);
    if (timelineView === '10y') return timeline.slice(0, 10);
    return timeline;
  }, [data?.cumulative_timeline, timelineView]);

  return (
    <div className="space-y-6">
      
      {/* 1. Configuration Toolbar (Compact & Modern) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
        <div className="flex items-center gap-3 px-2">
            <div className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm text-slate-400">
               <Settings size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Configuration</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
           {/* Algorithm Select - STRICTLY PRESERVED OPTIONS */}
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Algorithm</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer min-w-[140px]"
            >
              <option value="solver">Solver (PMT-Based, Recommended)</option>
              <option value="lp">Linear Programming</option>
            </select>
          </div>

          {/* Income Growth Input */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Income Growth</span>
            <div className="flex items-center">
                <input
                type="number"
                value={incomeGrowthPct}
                onChange={(e) => setIncomeGrowthPct(Number(e.target.value))}
                className="w-8 bg-transparent text-xs font-bold text-slate-700 outline-none text-right focus:text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
            </div>
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={runOptimization}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md shadow-slate-200 ml-auto md:ml-2 active:scale-95"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Running...' : 'Run Optimization'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm font-medium">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* 2. AI Explanation Section (New) */}
      {data && data.ai_explanation && (
        <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 mb-4 text-indigo-700">
            <Sparkles size={18} fill="currentColor" className="text-indigo-200" />
            <h3 className="font-bold text-sm uppercase tracking-wide">AI Analysis</h3>
          </div>
          <div className="prose prose-sm prose-slate max-w-none text-xs leading-relaxed text-slate-600 markdown-content">
            <ReactMarkdown>{data.ai_explanation}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* 3. Results Dashboard */}
      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          
          {/* Budget Overrun Warning */}
          {(() => {
            const timelineWithNegative = filteredTimeline.filter(t => t.allocatable < 0);
            const firstOverrunYear = timelineWithNegative.length > 0 ? timelineWithNegative[0].year : null;
            // Use liquid_capital_balance to track actual reserves (accounts for budget deficits)
            const finalReserves = filteredCumulativeTimeline.length > 0 ? filteredCumulativeTimeline[filteredCumulativeTimeline.length - 1].liquid_capital_balance : null;
            const initialReserves = filteredCumulativeTimeline.length > 0 ? filteredCumulativeTimeline[0].liquid_capital_balance : null;
            const reservesUsed = initialReserves && finalReserves ? initialReserves - finalReserves : 0;
            
            if (firstOverrunYear) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="bg-amber-100 p-2 rounded-lg mt-0.5">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 text-sm mb-1.5">⚠️ Budget Overrun Detected</h3>
                      <p className="text-xs text-amber-800 leading-relaxed mb-3">
                        Starting from <strong>Year {firstOverrunYear}</strong>, your committed expenses (e.g., mortgage payments) exceed your available monthly budget. 
                        {reservesUsed > 0 && (
                          <> The plan automatically reduces flexible investments and uses <strong>${Math.round(reservesUsed).toLocaleString()}</strong> from your emergency reserves to cover the gap.</>
                        )}
                      </p>
                      {finalReserves !== null && finalReserves < initialReserves * 0.3 && (
                        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
                          <strong>⚠️ Sustainability Concern:</strong> Your reserves will be significantly depleted. Consider:
                          <ul className="mt-2 ml-4 space-y-1 list-disc">
                            <li>Increasing monthly income by at least ${Math.round((timelineWithNegative[0]?.allocatable || 0) / -12).toLocaleString()}/month</li>
                            <li>Extending loan terms to reduce monthly payments</li>
                            <li>Re-evaluating financial goals and timelines</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Optimization Impact Section - Highlighting Value */}
          {allocations.some(a => a.completion_year) && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 relative overflow-hidden">
               {/* Decorative Background Element */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
               
               <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="bg-white/80 p-1.5 rounded-lg shadow-sm text-emerald-600">
                    <Sparkles size={14} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Optimization Impact</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  {allocations
                    .filter(a => a.completion_year)
                    .slice(0, 3) // Show top 3 only to keep layout clean
                    .map((row, idx) => {
                      // Original Logic Preserved
                      const horizonYears = row.horizon_years || Math.ceil((new Date(row.due_date) - new Date()) / (365.25 * 24 * 60 * 60 * 1000));
                      const improvement = horizonYears - row.completion_year;
                      const isHome = row.category === 'home';
                      const loanTerm = row.goal_details?.loan_term_years || 0;
                      const paidOffYear = isHome && loanTerm ? row.completion_year + loanTerm : null;
                      
                      return (
                        <ImpactCard 
                          key={idx}
                          name={row.name}
                          completionYear={row.completion_year}
                          improvement={improvement}
                          paidOffYear={paidOffYear}
                        />
                      );
                  })}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Column: Metrics & Allocation Table (High Density) */}
            <div className="xl:col-span-5 space-y-6 flex flex-col">
               {/* Key Metrics Row */}
               <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <CompactMetric 
                      label="Total Surplus" 
                      value={`$${financials.monthly_surplus_total ?? 0}`}
                      subtext="Monthly In"
                  />
                  <CompactMetric 
                      label="Reserve Rate" 
                      value={`${reservePct}%`} 
                      colorClass="text-indigo-600"
                      subtext="Safety Buffer"
                  />
                  <CompactMetric 
                      label="Allocatable" 
                      value={`$${budgetAvailable}`} 
                      colorClass="text-emerald-600"
                      subtext="Available"
                  />
                  {(() => {
                    const finalReserves = filteredCumulativeTimeline.length > 0 
                      ? filteredCumulativeTimeline[filteredCumulativeTimeline.length - 1].liquid_capital_balance 
                      : (allocations.reduce((sum, a) => sum + (a.current_amount || 0), 0));
                    const initialReserves = filteredCumulativeTimeline.length > 0 
                      ? filteredCumulativeTimeline[0].liquid_capital_balance 
                      : finalReserves;
                    const reservesTrend = finalReserves < initialReserves * 0.9 ? 'text-amber-600' : 'text-slate-600';
                    return (
                      <CompactMetric 
                          label="Liquid Assets (Final)" 
                          value={`$${Math.round(finalReserves).toLocaleString()}`} 
                          colorClass={reservesTrend}
                          subtext={finalReserves < initialReserves ? '⚠️ Depleting' : 'Stable'}
                      />
                    );
                  })()}
               </div>

               {/* Warnings Area */}
               <div className="space-y-3">
                 {/* Over-allocation Warning */}
                 {allocations.some(a => a.over_allocation_warning) && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-red-800">Over-Allocation Detected</div>
                        <p className="text-[10px] text-red-700 leading-relaxed mt-0.5">
                          Allocations (<strong>${allocations.reduce((sum, a) => sum + (a.current_monthly || 0), 0)}</strong>) exceed budget.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Buffer Shortfall Warning */}
                  {financials.buffer_shortfall > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
                          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                              <div className="text-xs font-bold text-amber-800">Buffer Shortfall</div>
                              <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                                  -${financials.buffer_shortfall} gap. Rebuilding at <strong>${financials.buffer_rebuild_monthly}/mo</strong>.
                              </p>
                          </div>
                      </div>
                  )}
               </div>

               {/* Allocation Table (Scrollable & Compact) */}
               <div className={`${CARD_BASE} flex-1 min-h-[300px] flex flex-col p-0 overflow-hidden`}>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 text-sm">Recommended Plan</h3>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Monthly Allocations</div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  <th className="py-2 px-5">Goal</th>
                                  <th className="py-2 px-2 text-right">Current</th>
                                  <th className="py-2 px-5 text-right">New</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                          {allocations.map((row, idx) => {
                              const isCurrent = currentGoalRow && row.goal_id === currentGoalRow.goal_id;
                              const diff = (row.recommended_monthly || 0) - (row.current_monthly || 0);
                              
                              return (
                              <tr 
                                  key={idx} 
                                  className={`group transition-colors text-xs ${isCurrent ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                              >
                                  <td className="py-3 px-5">
                                      <div className="font-bold text-slate-700 mb-0.5 truncate max-w-[120px]" title={row.name}>{row.name}</div>
                                      <div className="flex items-center gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                              row.priority === 'Need' ? 'bg-rose-100 text-rose-600' :
                                              row.priority === 'Want' ? 'bg-amber-100 text-amber-600' :
                                              'bg-blue-100 text-blue-600'
                                          }`}>
                                              {row.priority?.substring(0,1)}
                                          </span>
                                          {diff !== 0 && (
                                              <span className={`text-[9px] font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                  {diff > 0 ? '↑' : '↓'} ${Math.abs(diff)}
                                              </span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="py-3 px-2 text-right font-medium text-slate-400">
                                      ${row.current_monthly ?? 0}
                                  </td>
                                  <td className="py-3 px-5 text-right">
                                      <div className="font-bold text-indigo-600">${row.recommended_monthly}</div>
                                  </td>
                              </tr>
                              );
                          })}
                          </tbody>
                      </table>
                  </div>
                  
                  {/* Footer Action */}
                  {currentGoalRow && (
                      <div className="p-3 border-t border-slate-100 bg-slate-50">
                          <button
                              type="button"
                              onClick={applyToCurrentGoal}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
                          >
                              <span>Apply ${currentGoalRow.recommended_monthly} to Goal</span>
                              <ArrowRight size={14} />
                          </button>
                      </div>
                  )}
               </div>
            </div>

            {/* Right Column: Visualizations */}
            <div className="xl:col-span-7 space-y-6">
          {/* Chart 1: Timeline */}
          <div className={CARD_BASE}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                      <BarChart3 size={16} className="text-slate-400" />
                      <h3 className="font-bold text-slate-900 text-sm">Surplus Allocation Projection</h3>
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                          {['1y', '5y', '10y', 'full'].map(tab => (
                              <button
                              key={tab}
                              onClick={() => setTimelineView(tab)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                                  timelineView === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                              }`}
                              >
                              {tab === 'full' ? 'Max' : tab.toUpperCase()}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="h-64">
                      {filteredTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={filteredTimeline} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
                            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px' }}
                              formatter={(val) => `$${val}`}
                            />
                            {allocations.map((a, idx) => (
                              <Bar
                                key={a.name}
                                dataKey={a.name}
                                name={a.name}
                                stackId="alloc"
                                fill={idx % 2 === 0 ? COLORS.primary : COLORS.secondary}
                                radius={[0, 0, 0, 0]}
                                barSize={32}
                              />
                            ))}
                            <Bar dataKey="free_surplus" name="Unallocated (Remaining)" stackId="alloc" fill="#e2e8f0" radius={[2, 2, 0, 0]} barSize={32} />
                            <Line type="monotone" dataKey="allocatable" name="Available for New Allocations" stroke={COLORS.accent} strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                          No timeline data generated
                        </div>
                      )}
                  </div>
              </div>

              {/* Chart 2: Cumulative */}
              <div className={CARD_BASE}>
                  <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={16} className="text-slate-400" />
                      <h3 className="font-bold text-slate-900 text-sm">Liquid Investment Growth</h3>
                      <span className="text-xs text-slate-500">(Cash & Portfolio Balance)</span>
                  </div>
                  <div className="h-64">
                      {filteredCumulativeTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChartWithGradient data={filteredCumulativeTimeline} />
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                          No cumulative data generated
                        </div>
                      )}
                  </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// Extracted Subcomponent for cleaner code
const AreaChartWithGradient = ({ data }) => (
    <ComposedChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
        <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px' }}
            formatter={(val) => `$${val}`}
        />
        <Area type="monotone" dataKey="liquid_capital_balance" name="Liquid Assets (Available)" fill="url(#colorTotal)" stroke={COLORS.primary} strokeWidth={2} />
        <Line type="monotone" dataKey="total_allocatable" name="Potential" stroke={COLORS.accent} strokeWidth={2} strokeDasharray="5 5" dot={false} />
    </ComposedChart>
);

export default GoalOptimizationPanel;