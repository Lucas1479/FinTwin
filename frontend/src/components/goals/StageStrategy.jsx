import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Zap, 
    ShoppingBag, 
    PieChart, 
    BarChart3,
    Brain
} from 'lucide-react';
import { computeFinancialsFromCashFlows, extractOtherGoalsMonthly } from '../../utils/financialCalculations';

const StageStrategy = ({ goalContext, onChange, isLoadingAI, goalsSnapshot, cashFlowsSnapshot }) => {
    const recommendation = goalContext.ai_decision?.strategy_recommendation;
    const aiRationale = goalContext.ai_decision?.rationale;
    const aiStrategyRationale = recommendation?.rationale;
    const riskProfile = goalContext.ai_decision?.risk_profile || goalContext.simulation_data?.user_profile?.risk_profile;
    const economicExposure = recommendation?.economic_exposure || goalContext.simulation_data?.target_exposure;
    const glidePath = recommendation?.glide_path;
    const contributionHint = recommendation?.contribution_strategy || goalContext.simulation_data?.contribution_strategy_hint;
    const contributionMode = contributionHint?.mode || 'recurring';

    // === 前端主导：使用统一的财务计算工具 ===
    const currentGoalId = goalContext?._id || goalContext?.goal_id;
    
    // 使用 useMemo 缓存计算结果，避免不必要的重算
    const otherGoals = useMemo(() => 
        extractOtherGoalsMonthly(goalsSnapshot || [], currentGoalId),
        [goalsSnapshot, currentGoalId]
    );
    
    const otherGoalsMonthlyTotal = useMemo(() => 
        otherGoals.reduce((sum, g) => sum + (g.monthly_allocation || 0), 0),
        [otherGoals]
    );
    
    // 使用 useMemo 缓存财务计算，只在依赖项变化时重新计算
    const financials = useMemo(() => {
        if (!cashFlowsSnapshot) {
            return goalContext.simulation_data?.financials || {};
        }
        return computeFinancialsFromCashFlows(cashFlowsSnapshot);
    }, [cashFlowsSnapshot]);

    // 计算"分配后盈余"（投资前盈余 - 其他goals的locked allocations）
    const totalSurplus = financials.monthly_surplus_total ?? 0;  // 投资前盈余
    const lockedAllocations = otherGoalsMonthlyTotal;  // 其他goals已锁定的投入
    const availableForThisGoal = Math.max(0, totalSurplus - lockedAllocations);  // 分配后盈余
    const effectiveAvailable = availableForThisGoal;

    // AI 建议的月度金额（用于初始化滑块）
    // 使用 ?? 而不是 || 来正确处理 0 值
    const aiMonthly = contributionHint?.monthly_amount ?? contributionHint?.monthly_amount_hint;
    const maxAllocatable = effectiveAvailable;

    const initialAlloc = (() => {
        // 如果AI明确建议了monthly_amount（包括0），使用AI的值
        // 只有当AI没有提供任何建议时才fallback到totalSurplus
        const val = (contributionHint?.monthly_amount !== undefined) 
            ? contributionHint.monthly_amount 
            : (aiMonthly ?? totalSurplus);
        if (maxAllocatable > 0) return Math.min(val, maxAllocatable);
        return val;
    })();
    const [allocSlider, setAllocSlider] = useState(initialAlloc);

    useEffect(() => {
        const val = aiMonthly ?? totalSurplus;
        const clamped = maxAllocatable > 0 ? Math.min(val, maxAllocatable) : val;
        setAllocSlider(clamped);
    }, [aiMonthly, totalSurplus, maxAllocatable]);

    // === 同步财务快照到 goalContext（前端主导的关键） ===
    // 使用 useCallback 避免 onChange 依赖问题
    const syncFinancials = useCallback(() => {
        onChange(prev => {
            // 检查是否真的需要更新
            const prevFinancials = prev.simulation_data?.financials || {};
            if (
                prevFinancials.monthly_surplus_total === totalSurplus &&
                prevFinancials.available_to_allocate === availableForThisGoal &&
                prevFinancials.calculation_source === 'frontend_real_time'
            ) {
                return prev;
            }

            console.log('[StageStrategy] Syncing financials:', {
                surplus: totalSurplus,
                locked: lockedAllocations,
                available: availableForThisGoal
            });

            return {
                ...prev,
                simulation_data: {
                    ...(prev.simulation_data || {}),
                    financials: {
                        ...prevFinancials,
                        ...financials,
                        monthly_surplus_total: totalSurplus,
                        locked_allocations: lockedAllocations,
                        available_to_allocate: availableForThisGoal,
                        calculation_source: 'frontend_real_time'
                    },
                    other_goals: otherGoals
                }
            };
        });
    }, [onChange, financials, totalSurplus, lockedAllocations, availableForThisGoal, otherGoals]);

    useEffect(() => {
        // 同步财务数据到goalContext
        if (cashFlowsSnapshot) {
            syncFinancials();
        }
    }, [cashFlowsSnapshot, syncFinancials]);

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
                    economic_exposure: next
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
            <div className="animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Brain className="absolute inset-0 m-auto text-indigo-600" size={24} />
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-slate-900 mb-1">AI is crafting your Strategy...</div>
                            <div className="text-sm text-slate-500">Analyzing risk profile, economic exposure, and contribution plan</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
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
                            Choose how to allocate your monthly surplus to this goal.
                        </p>
                    </div>
                    <div className="text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Exposure Total: {totalExposure}%
                    </div>
                </div>

                {/* Lump Sum Display - Only show for lump_sum mode */}
                {contributionMode === 'lump_sum' && (
                    <div className="mb-4 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-emerald-900">Lump Sum Investment</div>
                                <div className="text-xs text-emerald-700 mt-1">
                                    One-time allocation to fully fund this goal
                                </div>
                            </div>
                            <div className="text-2xl font-black text-emerald-700">
                                ${(contributionHint?.lump_sum_amount ?? 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700">
                            ✓ No monthly contributions required
                        </div>
                    </div>
                )}

                {/* Global surplus allocation slider - Only show for recurring/hybrid modes */}
                {(contributionMode === 'recurring' || contributionMode === 'hybrid') && (
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
                        <div className="mt-3 space-y-2">
                            {/* Budget breakdown */}
                            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Monthly Surplus (before investment)</span>
                                    <span className="font-semibold text-slate-900">${totalSurplus.toLocaleString()}</span>
                                </div>
                                
                                {otherGoals.length > 0 && (
                                    <div className="space-y-1 pl-2 border-l-2 border-slate-300">
                                        <div className="text-slate-500 font-medium">Other Goals:</div>
                                        {otherGoals.map((g, idx) => (
                                            <div key={idx} className="flex justify-between pl-2">
                                                <span className="text-slate-600">{g.name}</span>
                                                <span className="font-medium text-amber-700">-${(g.monthly_allocation || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex justify-between pt-2 border-t border-slate-300">
                                    <span className="font-semibold text-indigo-700">Available for This Goal</span>
                                    <span className="font-bold text-indigo-900">${maxAllocatable.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="text-[11px] text-slate-500 flex justify-between">
                                <span>Currently allocating: ${Math.round(allocSlider).toLocaleString()}</span>
                                <span className="font-medium">{Math.round((allocSlider / maxAllocatable) * 100)}% of available</span>
                            </div>
                        </div>
                        )}
                    </div>
                )}

                {/* Economic Exposure Configuration */}
                <div className="mt-6 mb-4">
                    <h4 className="text-base font-bold text-slate-900 mb-1">Economic Exposure</h4>
                    <p className="text-xs text-slate-500">
                        Adjust your portfolio's exposure across different economic factors. Total should equal 100%.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { key: 'growth', label: 'Growth', sublabel: 'Growth Assets', color: 'text-indigo-600', bg: 'accent-indigo-600', desc: 'Equities, Property' },
                        { key: 'defensive', label: 'Defensive', sublabel: 'Defensive Assets', color: 'text-purple-600', bg: 'accent-purple-500', desc: 'Bonds, Fixed Income' },
                        { key: 'liquidity', label: 'Liquidity', sublabel: 'Liquid Assets', color: 'text-teal-600', bg: 'accent-teal-500', desc: 'Cash, Money Market' }
                    ].map(item => (
                        <div key={item.key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center mb-1">
                                <div>
                                    <h5 className={`font-bold ${item.color}`}>{item.label}</h5>
                                    <div className="text-[10px] text-slate-400">{item.sublabel}</div>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{exposure[item.key]}%</div>
                            </div>
                            <div className="text-[10px] text-slate-500 mb-3">{item.desc}</div>
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
            {/* DYNAMIC: Effective Exposure Mix */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" /> Economic Exposure
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Your target risk exposure across different economic factors.
                        </p>
                    </div>
                </div>

                {/* Visual Bar */}
                <div className="flex h-12 rounded-xl overflow-hidden mb-6 w-full shadow-inner ring-1 ring-slate-200 bg-white">
                    {exposure.growth > 0 && (
                        <div style={{ width: `${exposure.growth}%` }} className="bg-indigo-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {exposure.growth > 10 && `${exposure.growth}%`}
                        </div>
                    )}
                    {exposure.defensive > 0 && (
                        <div style={{ width: `${exposure.defensive}%` }} className="bg-purple-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {exposure.defensive > 10 && `${exposure.defensive}%`}
                        </div>
                    )}
                    {exposure.liquidity > 0 && (
                        <div style={{ width: `${exposure.liquidity}%` }} className="bg-teal-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500">
                            {exposure.liquidity > 5 && `${exposure.liquidity}%`}
                        </div>
                    )}
                </div>

                <div className="flex justify-between text-xs text-slate-500 px-1">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Growth (Equities/Property)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400"></div> Defensive (Fixed Income)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-400"></div> Liquidity (Cash)</span>
                </div>
            </div>
        </div>
    );
};

export default StageStrategy;
