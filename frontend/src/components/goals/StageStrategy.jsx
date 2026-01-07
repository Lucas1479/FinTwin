import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Zap, 
    ShoppingBag, 
    PieChart, 
    BarChart3 
} from 'lucide-react';

const StageStrategy = ({ goalContext, onChange, isLoadingAI }) => {
    const recommendation = goalContext.ai_decision?.strategy_recommendation;
    const aiRationale = goalContext.ai_decision?.rationale; // Fallback to top-level rationale if needed
    const aiStrategyRationale = recommendation?.rationale; // Specific strategy rationale
    const riskProfile = goalContext.ai_decision?.risk_profile || goalContext.simulation_data?.user_profile?.risk_profile;
    const economicExposure = recommendation?.economic_exposure || goalContext.simulation_data?.target_exposure;
    const glidePath = recommendation?.glide_path;
    const contributionHint = recommendation?.contribution_strategy || goalContext.simulation_data?.contribution_strategy_hint;
    const contributionMode = contributionHint?.mode || 'recurring';
    const otherGoals = goalContext.simulation_data?.other_goals || [];

    // Dynamic Data from Context (Real calculation from Stage 1 or User Profile)
    // Priority: AI Decision extracted values > Simulation data > Global context fallback > hardcoded fallback
    const surplusTotal = goalContext.simulation_data?.financials?.monthly_surplus_total;
    const surplusReserved = otherGoals.reduce((sum, g) => sum + (g.monthly_allocation || 0), 0);
    const surplusAllocatable = goalContext.simulation_data?.financials?.monthly_surplus_allocatable;
    const reservePct = goalContext.simulation_data?.financials?.reserve_for_other_goals_pct ?? 40;
    const aiMonthly = contributionHint?.monthly_amount || contributionHint?.monthly_amount_hint;
    const inferredAvailable = surplusTotal !== undefined ? Math.max(0, surplusTotal - surplusReserved) : undefined;
    const derivedAvailableFromAi = aiMonthly && reservePct < 100 ? Math.round(aiMonthly / (1 - reservePct / 100)) : undefined;
    const effectiveAvailable = surplusAllocatable
        ?? inferredAvailable
        ?? derivedAvailableFromAi
        ?? goalContext.simulation_data?.user_profile?.monthly_surplus
        ?? 0;

    const monthlySurplus = aiMonthly
        || goalContext.goal_details?.monthly_surplus
        || effectiveAvailable
        || 1200;
    const maxAllocatable = effectiveAvailable || monthlySurplus || 0;

    const initialAlloc = (() => {
        const val = contributionHint?.monthly_amount_hint ?? contributionHint?.monthly_amount ?? monthlySurplus;
        if (maxAllocatable > 0) return Math.min(val, maxAllocatable);
        return val;
    })();
    const [allocSlider, setAllocSlider] = useState(initialAlloc);

    useEffect(() => {
        const val = contributionHint?.monthly_amount_hint ?? contributionHint?.monthly_amount ?? monthlySurplus;
        const clamped = maxAllocatable > 0 ? Math.min(val, maxAllocatable) : val;
        setAllocSlider(clamped);
    }, [contributionHint?.monthly_amount_hint, contributionHint?.monthly_amount, monthlySurplus, maxAllocatable]);

    // Economic exposure (growth/defensive/liquidity) is the primary surface
    const defaultExposure = economicExposure || { growth: 60, defensive: 30, liquidity: 10 };
    const [exposure, setExposure] = useState(defaultExposure);

    useEffect(() => {
        if (economicExposure) {
            setExposure({
                growth: economicExposure.growth ?? 0,
                defensive: economicExposure.defensive ?? 0,
                liquidity: economicExposure.liquidity ?? 0
            });
        }
    }, [economicExposure]);

    const totalExposure = (exposure.growth || 0) + (exposure.defensive || 0) + (exposure.liquidity || 0);

    // Source of Truth for Allocation: economic exposure first, else allocation fallback
    const effectiveAllocation = {
        stocks: exposure.growth ?? 0,
        bonds: exposure.defensive ?? 0,
        cash: exposure.liquidity ?? 0
    };

    // Use the raw rationale for markdown rendering
    const insightText = aiStrategyRationale || aiRationale;

    const clampTotal = (next) => {
        const total = next.growth + next.defensive + next.liquidity;
        if (total === 100) return next;
        if (total === 0) return { growth: 60, defensive: 30, liquidity: 10 };
        // Normalize to 100 while preserving ratios
        return {
            growth: Math.round((next.growth / total) * 100),
            defensive: Math.round((next.defensive / total) * 100),
            liquidity: Math.max(0, 100 - Math.round((next.growth / total) * 100) - Math.round((next.defensive / total) * 100))
        };
    };

    const updateExposure = (key, value) => {
        const next = clampTotal({
            ...exposure,
            [key]: Math.max(0, Math.min(100, Number(value)))
        });
        setExposure(next);
        onChange(prev => ({
            ...prev,
            ai_decision: {
                ...prev.ai_decision,
                strategy_recommendation: {
                    ...prev.ai_decision?.strategy_recommendation,
                    economic_exposure: next,
                    allocation: { stocks: next.growth, bonds: next.defensive, cash: next.liquidity }
                }
            }
        }));
    };

    const updateRiskProfile = (field, value) => {
        onChange(prev => ({
            ...prev,
            ai_decision: {
                ...prev.ai_decision,
                risk_profile: {
                    ...prev.ai_decision?.risk_profile,
                    [field]: value
                }
            }
        }));
    };

    const setContributionMode = (mode) => {
        onChange(prev => ({
            ...prev,
            ai_decision: {
                ...prev.ai_decision,
                strategy_recommendation: {
                    ...prev.ai_decision?.strategy_recommendation,
                    contribution_strategy: {
                        ...prev.ai_decision?.strategy_recommendation?.contribution_strategy,
                        mode
                    }
                }
            }
        }));
    };

    const setContributionValue = (field, value) => {
        onChange(prev => ({
            ...prev,
            ai_decision: {
                ...prev.ai_decision,
                strategy_recommendation: {
                    ...prev.ai_decision?.strategy_recommendation,
                    contribution_strategy: {
                        ...prev.ai_decision?.strategy_recommendation?.contribution_strategy,
                        [field]: value
                    }
                }
            }
        }));
    };

    if (isLoadingAI && !recommendation) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-pulse">
                <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                <p className="text-slate-400 text-sm">AI is structuring your investment plan...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* AI Rationale Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-600 text-white p-1 rounded-md">
                            <Zap size={14} /> 
                        </div>
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Insight</span>
                        {glidePath?.enabled && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-white/70 border border-indigo-100 rounded-full px-2 py-0.5">
                                Glide Path
                            </span>
                        )}
                    </div>
                    <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed text-xs font-medium">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {insightText || "I've designed a structure that maximizes your employer match while keeping some funds liquid."}
                        </ReactMarkdown>
                    </div>
                    {riskProfile && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 font-bold">
                            <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">Risk Profile: {riskProfile.attitude || '—'}</span>
                            {riskProfile.volatility_tolerance_pct !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">Volatility Tolerance: ±{riskProfile.volatility_tolerance_pct}%</span>
                            )}
                            {riskProfile.max_drawdown_allowed_pct !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">Max Drawdown: {riskProfile.max_drawdown_allowed_pct}%</span>
                            )}
                        </div>
                    )}
                    {contributionHint && (
                        <div className="mt-3 text-[12px] text-slate-600 font-semibold flex gap-3 flex-wrap">
                            <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                                Investment Mode: {contributionHint.mode || 'recurring'}
                            </span>
                            {(contributionHint.monthly_amount ?? contributionHint.monthly_amount_hint) !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                                    Monthly Contribution: ${contributionHint.monthly_amount ?? contributionHint.monthly_amount_hint}
                                </span>
                            )}
                            {(contributionHint.lump_sum_amount ?? contributionHint.lump_sum_hint) > 0 && (
                                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                                    Lump Sum: ${contributionHint.lump_sum_amount ?? contributionHint.lump_sum_hint}
                                </span>
                            )}
                            {contributionHint.reserve_for_other_goals_pct !== undefined && (
                                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                                    Reserve for Other Goals: {contributionHint.reserve_for_other_goals_pct}%
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* INTERACTIVE: Funding Structure Editor */}
            <div>
                <div className="flex justify-between items-end mb-4">
                    <div>
                         <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingBag size={18} className="text-slate-400" /> Contribution Strategy
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Allocating your estimated <strong>${effectiveAvailable || monthlySurplus}/mo</strong> surplus.
                        </p>
                        {(surplusTotal || surplusAllocatable || surplusReserved) && (
                          <div className="text-[12px] text-slate-500 mt-1 space-y-0.5">
                            <div>
                              {surplusTotal !== undefined && <span>Total surplus: ${surplusTotal} · </span>}
                              {surplusReserved > 0 && <span>Other goals: ${surplusReserved} · </span>}
                              {effectiveAvailable !== undefined && <span>Available: ${effectiveAvailable}</span>}
                            </div>
                            {otherGoals.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {otherGoals.map((g, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600">
                                    {g.name}: ${g.monthly_allocation || 0}/mo
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Exposure Total: {totalExposure}%
                    </div>
                </div>

                {/* Global surplus allocation slider */}
                <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Allocate surplus to this goal</span>
                        <span className="font-bold text-slate-900">${Math.round(allocSlider)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={maxAllocatable || 0}
                        step="50"
                        value={allocSlider}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setAllocSlider(val);
                            setContributionValue('monthly_amount_hint', val);
                        }}
                        className="w-full accent-indigo-600 mt-2"
                    />
                    {maxAllocatable > 0 && (
                        <div className="text-[11px] text-slate-500 flex justify-between mt-1">
                            <span>Available after other goals: ${maxAllocatable}</span>
                            <span>{Math.round((allocSlider / maxAllocatable) * 100)}% of available</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { key: 'growth', label: 'Growth', color: 'text-indigo-600', bg: 'accent-indigo-600' },
                        { key: 'defensive', label: 'Defensive', color: 'text-purple-600', bg: 'accent-purple-500' },
                        { key: 'liquidity', label: 'Liquidity', color: 'text-teal-600', bg: 'accent-teal-500' }
                    ].map(item => (
                        <div key={item.key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className={`font-bold ${item.color}`}>{item.label}</h5>
                                <div className="text-xl font-bold text-slate-900">{exposure[item.key]}%</div>
                            </div>
                            <input
                                type="range"
                                min="0" max="100" step="5"
                                value={exposure[item.key] || 0}
                                onChange={(e) => updateExposure(item.key, e.target.value)}
                                className={`flex-1 w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${item.bg}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                        <div className="font-bold text-slate-900 mb-2">Risk Settings (per Goal)</div>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">Volatility tolerance (±%)</span>
                                <input
                                    type="range"
                                    min="5" max="30" step="1"
                                    value={riskProfile?.volatility_tolerance_pct ?? 15}
                                    onChange={(e) => updateRiskProfile('volatility_tolerance_pct', Number(e.target.value))}
                                    className="w-40 accent-indigo-600"
                                />
                                <span className="text-xs font-bold text-slate-700">{riskProfile?.volatility_tolerance_pct ?? 15}%</span>
                            </label>
                            <label className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">Max drawdown (%)</span>
                                <input
                                    type="range"
                                    min="5" max="40" step="1"
                                    value={riskProfile?.max_drawdown_allowed_pct ?? 20}
                                    onChange={(e) => updateRiskProfile('max_drawdown_allowed_pct', Number(e.target.value))}
                                    className="w-40 accent-indigo-600"
                                />
                                <span className="text-xs font-bold text-slate-700">{riskProfile?.max_drawdown_allowed_pct ?? 20}%</span>
                            </label>
                        </div>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                        <div className="font-bold text-slate-900 mb-2">Contribution Strategy</div>
                        <div className="space-y-3">
                            <label className="text-xs text-slate-500">Mode</label>
                            <select
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={contributionMode}
                                onChange={(e) => setContributionMode(e.target.value)}
                            >
                                <option value="recurring">Recurring (DCA)</option>
                                <option value="lump_sum">Lump Sum</option>
                                <option value="hybrid">Hybrid</option>
                            </select>

                            {(contributionMode === 'recurring' || contributionMode === 'hybrid') && (
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Monthly amount</span>
                                    <input
                                        type="number"
                                        className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={contributionHint?.monthly_amount ?? contributionHint?.monthly_amount_hint ?? ''}
                                        onChange={(e) => setContributionValue('monthly_amount', Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {(contributionMode === 'lump_sum' || contributionMode === 'hybrid') && (
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Lump sum</span>
                                    <input
                                        type="number"
                                        className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={contributionHint?.lump_sum_amount ?? contributionHint?.lump_sum_hint ?? contributionHint?.lump_sum ?? ''}
                                        onChange={(e) => setContributionValue('lump_sum_amount', Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            {(contributionMode === 'recurring' || contributionMode === 'hybrid') && (
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Escalation (%/yr)</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={contributionHint?.escalation_rate_pct ?? ''}
                                        onChange={(e) => setContributionValue('escalation_rate_pct', Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 text-[12px]">
                                {contributionHint?.income_linked !== undefined && (
                                    <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 font-semibold">
                                        Income linked: {contributionHint.income_linked ? 'Yes' : 'No'}
                                    </span>
                                )}
                                {contributionHint?.reserve_for_other_goals_pct !== undefined && (
                                    <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 font-semibold">
                                        Reserve for other goals: {contributionHint.reserve_for_other_goals_pct}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DYNAMIC: Effective Asset Allocation */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" /> Resulting Asset Mix
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Based on your product selection above.
                        </p>
                    </div>
                </div>

                {/* Visual Bar */}
                <div className="flex h-12 rounded-xl overflow-hidden mb-6 w-full shadow-inner ring-1 ring-slate-200 bg-white">
                    {effectiveAllocation.stocks > 0 && (
                        <div style={{ width: `${effectiveAllocation.stocks}%` }} className="bg-indigo-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {effectiveAllocation.stocks > 10 && `${effectiveAllocation.stocks}%`}
                        </div>
                    )}
                    {effectiveAllocation.bonds > 0 && (
                        <div style={{ width: `${effectiveAllocation.bonds}%` }} className="bg-purple-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {effectiveAllocation.bonds > 10 && `${effectiveAllocation.bonds}%`}
                        </div>
                    )}
                    {effectiveAllocation.cash > 0 && (
                        <div style={{ width: `${effectiveAllocation.cash}%` }} className="bg-teal-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {effectiveAllocation.cash > 5 && `${effectiveAllocation.cash}%`}
                        </div>
                    )}
                </div>

                <div className="flex justify-between text-xs text-slate-500 px-1">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Growth (Stocks/Property)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400"></div> Income (Bonds)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-400"></div> Cash</span>
                </div>
            </div>
        </div>
    );
};

export default StageStrategy;
