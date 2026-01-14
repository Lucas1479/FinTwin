import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Shield, 
    AlertTriangle, 
    DollarSign, 
    Calculator,
    Calendar,
    ArrowUpRight,
    Users,
    Briefcase,
    Lock,
    Activity,
    CheckCircle2,
    TrendingUp,
    PiggyBank,
    Umbrella,
    AlertOctagon,
    Brain,
    HeartPulse,
    Zap,
    Anchor
} from 'lucide-react';

// --- STAGE 1: VISION (Goal Discovery - Qualitative) ---
// Goal: Determine the "Why" and "Rough Ambition"
const EmergencyVisionForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Emergency Fund',
        primary_motivation: initialValues.goal_details?.primary_motivation || 'job_loss', // job_loss, medical, unexpected_bills, peace_of_mind
        target_months_rough: initialValues.goal_details?.target_months_rough || 3, // User's initial gut feeling
        monthly_spend_est: initialValues.goal_details?.monthly_spend_est || 3000 // Rough estimate
    });

    const isInternalUpdate = useRef(false);

    // Sync
    useEffect(() => {
        isInternalUpdate.current = true;
        onChange?.({
            goal_name: formData.goal_name,
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            }
        });
    }, [formData]);

    // Parent -> Internal
    useEffect(() => {
        if (!initialValues) return;
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        if (initialValues.goal_details) {
            setFormData(prev => ({
                ...prev,
                ...initialValues.goal_details,
            }));
        }
    }, [initialValues]);

    const MOTIVATIONS = [
        { id: 'job_loss', label: 'Job Security', icon: Briefcase, desc: 'Cover expenses if I lose income.' },
        { id: 'medical', label: 'Health/Medical', icon: HeartPulse, desc: 'Buffer for unexpected health costs.' },
        { id: 'unexpected_bills', label: 'Unexpected Bills', icon: Zap, desc: 'Car repairs, appliance replacement.' },
        { id: 'peace_of_mind', label: 'Peace of Mind', icon: Anchor, desc: 'General safety net for anxiety.' }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 rounded-3xl p-6 border border-amber-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                        <Shield size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Define Your Safety Net</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            What are you protecting against? This helps us tailor the strategy later.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Motivation */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Primary Motivation</label>
                        <div className="grid grid-cols-1 gap-2">
                            {MOTIVATIONS.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, primary_motivation: m.id }))}
                                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                        formData.primary_motivation === m.id 
                                        ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' 
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${formData.primary_motivation === m.id ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-400'}`}>
                                        <m.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{m.label}</div>
                                        <div className="text-[10px] text-slate-500">{m.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Rough Estimates */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Initial Ambition</div>
                        
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-bold text-slate-700">Target Coverage</label>
                                <span className="text-2xl font-black text-slate-900">{formData.target_months_rough} Months</span>
                            </div>
                            <input 
                                type="range" min={1} max={12} step={1}
                                value={formData.target_months_rough}
                                onChange={(e) => setFormData(prev => ({ ...prev, target_months_rough: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                                <span>1 Month</span>
                                <span>6 Months</span>
                                <span>12 Months</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">Est. Monthly Spend</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={formData.monthly_spend_est}
                                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_spend_est: Number(e.target.value) }))}
                                    className="w-full input-base pl-8 font-bold"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                Just a rough guess for now. We'll refine this in the next step.
                            </p>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                        <Calculator size={20} className="text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <div className="text-sm font-bold text-amber-900">Est. Target: ${(formData.target_months_rough * formData.monthly_spend_est).toLocaleString()}</div>
                            <div className="text-xs text-amber-700 mt-1 leading-snug">
                                This is a preliminary target based on your estimates.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Next: Refine & Audit
                </button>
            </div>
        </div>
    );
};

// --- STAGE 2: ASSUMPTIONS (Detailed Audit & Target Setting) ---
// Goal: Turn the rough guess into a calculated scientific target
const EmergencyPlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const details = initialValues.goal_details || {};
    
    const [formData, setFormData] = useState({
        // Detailed Audit
        fixed_expenses: details.fixed_expenses || Math.round(details.monthly_spend_est * 0.6) || 1800,
        variable_expenses: details.variable_expenses || Math.round(details.monthly_spend_est * 0.4) || 1200,
        
        // Risk Adjustments
        income_source_volatility: details.income_source_volatility || 'medium',
        has_income_protection: details.has_income_protection || false,
        ip_wait_period_weeks: details.ip_wait_period_weeks || 13,
        
        // Final Target Settings
        final_months_target: details.target_months_rough || 3,
        shock_buffer_amount: details.shock_buffer_amount || 2000,
        target_date: initialValues.due_date ? new Date(initialValues.due_date).toISOString().split('T')[0] : ''
    });

    // Burn Rates
    const survivalBurnRate = formData.fixed_expenses + (formData.variable_expenses * 0.5);
    const standardBurnRate = formData.fixed_expenses + formData.variable_expenses;
    
    // Recommended Months (The AI Logic)
    const recommendedMonths = useMemo(() => {
        let months = 3;
        if (formData.income_source_volatility === 'high') months += 3;
        if (formData.income_source_volatility === 'low') months -= 1;
        
        // Insurance Offset
        if (formData.has_income_protection) {
            const waitMonths = Math.ceil(formData.ip_wait_period_weeks / 4.33);
            months = Math.max(3, waitMonths + 1);
        }
        return Math.max(3, Math.min(12, months));
    }, [formData.income_source_volatility, formData.has_income_protection, formData.ip_wait_period_weeks]);

    // Final Calculation
    const totalTarget = (formData.final_months_target * standardBurnRate) + formData.shock_buffer_amount;

    const isInternalUpdate = useRef(false);

    useEffect(() => {
        isInternalUpdate.current = true;
        onChange?.({
            target_amount: totalTarget,
            due_date: formData.target_date,
            goal_details: {
                ...initialValues.goal_details,
                ...formData,
                survival_burn_rate: survivalBurnRate,
                standard_burn_rate: standardBurnRate,
                recommended_months: recommendedMonths
            }
        });
    }, [formData, totalTarget, survivalBurnRate, recommendedMonths]);

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-gradient-to-br from-indigo-50 to-blue-100/50 rounded-3xl p-6 border border-indigo-100">
                <div className="flex items-center gap-4">
                    <Calculator className="text-indigo-600" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Fine-Tune Calculations</h3>
                        <p className="text-sm text-slate-600">
                            Let's audit your expenses and risk factors to set a precise target.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Liability Audit */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                        <Lock size={16} /> Liability Audit
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Fixed (Non-Negotiable)</label>
                                <span className="text-sm font-bold text-slate-900">${formData.fixed_expenses}</span>
                            </div>
                            <input 
                                type="range" min={0} max={10000} step={100}
                                value={formData.fixed_expenses}
                                onChange={(e) => setFormData(prev => ({ ...prev, fixed_expenses: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Rent, Debt, Insurance</p>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Variable (Flexible)</label>
                                <span className="text-sm font-bold text-slate-900">${formData.variable_expenses}</span>
                            </div>
                            <input 
                                type="range" min={0} max={10000} step={100}
                                value={formData.variable_expenses}
                                onChange={(e) => setFormData(prev => ({ ...prev, variable_expenses: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Food, Leisure, Transport</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Risk Adjustments</label>
                        <select 
                            value={formData.income_source_volatility}
                            onChange={(e) => setFormData(prev => ({ ...prev, income_source_volatility: e.target.value }))}
                            className="w-full input-base text-sm mb-2"
                        >
                            <option value="low">Stable Job (Gov/Tenured)</option>
                            <option value="medium">Standard (Corporate)</option>
                            <option value="high">Volatile (Freelance)</option>
                        </select>
                        
                        <div className="flex items-center gap-2 p-3 border rounded-xl bg-slate-50">
                            <input 
                                type="checkbox"
                                checked={formData.has_income_protection}
                                onChange={(e) => setFormData(prev => ({ ...prev, has_income_protection: e.target.checked }))}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-xs text-slate-700 font-bold">I have Income Protection Insurance</span>
                        </div>
                    </div>
                </div>

                {/* 2. Target Finalization */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Calculated Target</div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-5xl font-black text-slate-900 tracking-tight">
                                ${(totalTarget/1000).toFixed(1)}k
                            </span>
                        </div>
                        
                        <div className="mt-6 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span>Coverage Duration</span>
                                    <span>{formData.final_months_target} Months</span>
                                </div>
                                <input 
                                    type="range" min={1} max={12} step={1}
                                    value={formData.final_months_target}
                                    onChange={(e) => setFormData(prev => ({ ...prev, final_months_target: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="text-[10px] text-indigo-600 font-bold mt-1 text-right">
                                    Recommended: {recommendedMonths} Months
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span>Lump Sum Buffer</span>
                                    <span>${formData.shock_buffer_amount}</span>
                                </div>
                                <input 
                                    type="range" min={0} max={10000} step={500}
                                    value={formData.shock_buffer_amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, shock_buffer_amount: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={() => onSubstageSubmit({ target_amount: totalTarget })}
                            className="w-full btn-primary-rounded py-3 shadow-lg shadow-indigo-200"
                        >
                            Confirm Target
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STAGE 3: GAP (Readiness Analysis) ---
// Goal: Assess current liquidity vs Target
const EmergencyGapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Context
    const details = initialValues.goal_details || {};
    const assets = {
        liquid: details.liquid_assets || 0,
        investments: details.investments || 0 
    };

    // 2. Calculations
    const SURVIVAL_BURN = details.survival_burn_rate || 2000;
    const STANDARD_BURN = details.standard_burn_rate || 4000;
    const TARGET = initialValues.target_amount || 10000;
    
    // Runway Calc
    const runwayMonthsStandard = assets.liquid / STANDARD_BURN;
    const runwayMonthsSurvival = assets.liquid / SURVIVAL_BURN;
    
    const gap = Math.max(0, TARGET - assets.liquid);
    const progressPct = Math.min(100, (assets.liquid / TARGET) * 100);

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-red-50 to-rose-100/50 rounded-3xl p-6 border border-red-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-600">
                        <AlertOctagon size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Vulnerability Check</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We simulate a "Zero Income" scenario to see how long your current liquidity lasts.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. RUNWAY METER */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <Calendar size={18} className="text-rose-500" /> Current Runway
                    </div>
                    
                    <div className="flex gap-4">
                        {/* Standard Mode */}
                        <div className="flex-1 p-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Standard Mode</div>
                            <div className={`text-2xl font-black ${runwayMonthsStandard < 3 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {runwayMonthsStandard.toFixed(1)}
                            </div>
                            <div className="text-xs text-slate-500">Months</div>
                        </div>
                        {/* Survival Mode */}
                        <div className="flex-1 p-4 bg-amber-50 rounded-2xl text-center border border-amber-100">
                            <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Survival Mode</div>
                            <div className="text-3xl font-black text-amber-700">
                                {runwayMonthsSurvival.toFixed(1)}
                            </div>
                            <div className="text-xs text-amber-700">Months</div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>Funded Status</span>
                            <span>{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        {gap > 0 ? (
                            <div className="text-xs text-right text-rose-500 font-bold mt-1">
                                Gap: ${(gap/1000).toFixed(1)}k
                            </div>
                        ) : (
                            <div className="text-xs text-right text-emerald-500 font-bold mt-1">
                                Fully Funded
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ADVICE */}
                <div className="space-y-4">
                    {progressPct < 50 && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-800 leading-relaxed">
                            <div className="flex items-center gap-2 font-bold mb-2 text-red-900">
                                <AlertTriangle size={16} /> High Risk
                            </div>
                            Your buffer is dangerously low. A single major event could force you into high-interest debt. Prioritize this goal.
                        </div>
                    )}
                    
                    {progressPct >= 50 && progressPct < 100 && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-800 leading-relaxed">
                            <div className="flex items-center gap-2 font-bold mb-2 text-amber-900">
                                <Shield size={16} /> Moderate Protection
                            </div>
                            You have a basic safety net, but prolonged income loss would still be risky. Keep building.
                        </div>
                    )}

                    {progressPct >= 100 && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-800 leading-relaxed">
                            <div className="flex items-center gap-2 font-bold mb-2 text-emerald-900">
                                <CheckCircle2 size={16} /> Secured
                            </div>
                            Your emergency fund meets industry standards. You can now confidently allocate surplus to growth investments.
                        </div>
                    )}

                    {/* AI Recommendation Box */}
                    {initialValues.ai_decision?.rationale && (
                        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100/50 relative overflow-hidden">
                            <div className="flex items-start gap-3 relative z-10">
                                <Brain size={16} className="text-indigo-600 mt-1" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">AI Insight</div>
                                    <div className="prose prose-sm prose-slate max-w-none text-slate-700 text-xs">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {initialValues.ai_decision.rationale}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit({ target_amount: TARGET, confirmed: true })}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Proceed to Strategy
                </button>
            </div>
        </div>
    );
};

const EmergencyGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    if (activeSubstage === 'goal_discovery') {
        return <EmergencyVisionForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} />;
    }
    if (activeSubstage === 'assumptions') {
        return <EmergencyPlanningParametersForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} />;
    }
    if (activeSubstage === 'gap_analysis') {
        return <EmergencyGapFeasibilityForm initialValues={initialValues} onSubstageSubmit={onSubstageSubmit} />;
    }
    return <div>Unknown Substage</div>;
};

export default EmergencyGoalForm;
