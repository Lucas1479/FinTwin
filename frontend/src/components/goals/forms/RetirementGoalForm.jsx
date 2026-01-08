import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Clock, 
    Heart, 
    DollarSign, 
    Shield, 
    AlertCircle,
    Calculator,
    TrendingUp,
    Calendar,
    MapPin,
    Coffee,
    Utensils,
    Plane,
    Briefcase,
    Brain,
    Zap,
    Scale,
    Activity,
    ChevronRight,
    CheckCircle2,
    Check
} from 'lucide-react';

// Combined Stage 1: Goal & Vision
const GoalVisionForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'My Retirement',
        priority: initialValues.priority || 'want',
        location: initialValues.goal_details?.location || 'Auckland',
        lifestyle_tier: initialValues.goal_details?.lifestyle_tier || 'comfortable', 
        lumpy_expenses: initialValues.goal_details?.lumpy_expenses || [], 
        living_expense_pa: initialValues.goal_details?.living_expense_pa || 60000,
        notes: initialValues.goal_details?.notes || ''
    });

    const [expenseFreq, setExpenseFreq] = useState('year'); // 'week', 'month', 'year'

    const LIFESTYLES = {
        no_frills: {
            label: 'No Frills',
            desc: 'Basic essentials. Home cooking, local trips.',
            baseCost: { 'Auckland': 45000, 'Regional': 35000 },
            icon: Coffee
        },
        comfortable: {
            label: 'Comfortable',
            desc: 'Good standard. Health insurance, regular dining.',
            baseCost: { 'Auckland': 60000, 'Regional': 50000 },
            icon: Utensils
        },
        luxury: {
            label: 'Luxury',
            desc: 'High end. Int\'l travel, premium healthcare.',
            baseCost: { 'Auckland': 90000, 'Regional': 75000 },
            icon: Plane
        }
    };

    // Sync with AI/Parent updates
    useEffect(() => {
        if (initialValues.goal_details || initialValues.goal_name || initialValues.priority) {
            setFormData(prev => {
                const newVal = initialValues.goal_details || {};
                // Avoid unnecessary updates if data is consistent
                if (prev.lifestyle_tier === newVal.lifestyle_tier && 
                    prev.living_expense_pa === newVal.living_expense_pa &&
                    prev.location === newVal.location &&
                    prev.priority === initialValues.priority &&
                    JSON.stringify(prev.lumpy_expenses) === JSON.stringify(newVal.lumpy_expenses)) {
                    return prev;
                }
                return {
                    ...prev,
                    goal_name: initialValues.goal_name || prev.goal_name,
                    priority: initialValues.priority || prev.priority,
                    location: newVal.location || prev.location,
                    lifestyle_tier: newVal.lifestyle_tier || prev.lifestyle_tier,
                    lumpy_expenses: newVal.lumpy_expenses || prev.lumpy_expenses,
                    living_expense_pa: newVal.living_expense_pa || prev.living_expense_pa,
                    notes: newVal.notes || prev.notes
                };
            });
        }
    }, [initialValues]);

    // Auto-calculate logic (Mapping Lifestyle -> Expense)
    useEffect(() => {
        const tier = LIFESTYLES[formData.lifestyle_tier];
        const base = tier.baseCost[formData.location === 'Auckland' ? 'Auckland' : 'Regional'] || tier.baseCost['Regional'];
        let lumpyAddon = 0;
        if (formData.lumpy_expenses.includes('travel_biannual')) lumpyAddon += 5000;
        if (formData.lumpy_expenses.includes('new_car_5y')) lumpyAddon += 4000;
        
        const newTotal = base + lumpyAddon;
        
        // Update local state (Visual Update)
        setFormData(prev => {
            if (prev.living_expense_pa === newTotal) return prev;
            return { ...prev, living_expense_pa: newTotal };
        });
        
        // Propagate changes to parent immediately for context
        onChange?.({
            goal_name: formData.goal_name,
            priority: formData.priority,
            goal_details: {
                ...initialValues.goal_details,
                location: formData.location,
                lifestyle_tier: formData.lifestyle_tier,
                lumpy_expenses: formData.lumpy_expenses,
                living_expense_pa: newTotal,
                notes: formData.notes
            }
        });
    }, [formData.lifestyle_tier, formData.location, formData.lumpy_expenses]);

    const handleLumpyToggle = (id) => {
        setFormData(prev => ({
            ...prev,
            lumpy_expenses: prev.lumpy_expenses.includes(id) 
                ? prev.lumpy_expenses.filter(x => x !== id)
                : [...prev.lumpy_expenses, id]
        }));
    };

    const getDisplayExpense = () => {
        const annual = formData.living_expense_pa;
        if (expenseFreq === 'week') return Math.round(annual / 52);
        if (expenseFreq === 'month') return Math.round(annual / 12);
        return annual;
    };

    const handleExpenseChange = (val) => {
        const num = Number(val);
        let annual = num;
        if (expenseFreq === 'week') annual = num * 52;
        if (expenseFreq === 'month') annual = num * 12;
        
        setFormData(prev => ({ ...prev, living_expense_pa: annual }));
        // Also notify parent
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                living_expense_pa: annual
            }
        });
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Heart size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Define Your Vision</h3>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Tell us about the retirement you dream of. Copilot can help you fill this out based on your chat.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: Basics */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                            placeholder="e.g. My Freedom Fund"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Retirement Location</label>
                        <div className="flex gap-2">
                            {['Auckland', 'Regional NZ'].map(loc => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, location: loc === 'Auckland' ? 'Auckland' : 'Regional' }))}
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                        (formData.location === 'Auckland' && loc === 'Auckland') || (formData.location !== 'Auckland' && loc !== 'Auckland')
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <MapPin size={16} />
                                    <span className="font-bold text-sm">{loc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Lifestyle Standard</label>
                        <div className="grid grid-cols-1 gap-3">
                            {Object.entries(LIFESTYLES).map(([key, config]) => {
                                const Icon = config.icon;
                                const isSelected = formData.lifestyle_tier === key;
                                return (
                                    <div 
                                        key={key}
                                        onClick={() => setFormData(prev => ({ ...prev, lifestyle_tier: key }))}
                                        className={`cursor-pointer border rounded-xl p-5 flex items-center gap-3 transition-all ${
                                            isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                            isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{config.label}</div>
                                            <div className="text-[10px] text-slate-500 leading-snug">{config.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Col: Specifics */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority</label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            {[
                                { value: 'need', label: 'Need', color: 'bg-rose-500' },
                                { value: 'want', label: 'Want', color: 'bg-amber-500' },
                                { value: 'wish', label: 'Wish', color: 'bg-emerald-500' }
                            ].map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                        formData.priority === p.value
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Big Ticket Items</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => handleLumpyToggle('travel_biannual')}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                    formData.lumpy_expenses.includes('travel_biannual') 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                ✈️ Int'l Travel (Every 2yrs)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLumpyToggle('new_car_5y')}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                    formData.lumpy_expenses.includes('new_car_5y') 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                🚗 New Car (Every 5yrs)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Vision Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            rows={3}
                            placeholder="e.g. I want to spend winters in Gold Coast..."
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700">Estimated Expense</label>
                            
                            {/* Frequency Toggle */}
                            <div className="flex bg-slate-100 rounded-lg p-0.5">
                                {['week', 'month', 'year'].map(f => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setExpenseFreq(f)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                                            expenseFreq === f 
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign size={18} />
                                </div>
                                <input 
                                    type="number"
                                    value={getDisplayExpense()}
                                    onChange={(e) => handleExpenseChange(e.target.value)}
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            
                            <input 
                                type="range" 
                                min={20000} 
                                max={200000} 
                                step={1000}
                                value={formData.living_expense_pa}
                                onChange={(e) => handleExpenseChange(e.target.value)}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                        <div className="text-xs text-slate-400 mt-2 text-right">
                            Equivalent to <strong>${Number(formData.living_expense_pa).toLocaleString()} / year</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200">
                    Save & Continue
                </button>
            </div>
        </form>
    );
};

// Combined Stage 2: Planning Parameters
const PlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        // Timeline
        current_age: initialValues.goal_details?.current_age || 30, 
        retirement_age: initialValues.goal_details?.retirement_age || 65,
        life_expectancy: initialValues.goal_details?.life_expectancy || 95,
        transition_phase: initialValues.goal_details?.transition_phase || false,
        include_superannuation: initialValues.goal_details?.include_superannuation ?? true,
        // Assumptions
        risk_attitude: initialValues.goal_details?.risk_attitude || 'balanced',
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 6,
        inflation_pct: initialValues.goal_details?.inflation_pct || 2.5
    });

    useEffect(() => {
        // Calculate dynamic due_date based on retirement age
        // Set to January 1st of the retirement year
        const currentYear = new Date().getFullYear();
        const yearsUntilRetirement = Math.max(0, formData.retirement_age - (formData.current_age || 30));
        const retirementYear = currentYear + yearsUntilRetirement;
        const computedDueDate = new Date(retirementYear, 0, 1);

        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            },
            due_date: computedDueDate // Push top-level due_date for API
        });
    }, [formData]);

    const yearsToSave = Math.max(0, formData.retirement_age - formData.current_age);
    const yearsInRetirement = Math.max(0, formData.life_expectancy - formData.retirement_age);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Clock size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Timeline & Parameters</h3>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Set the boundaries for your plan. You have <strong>{yearsToSave} years</strong> to accumulate wealth for <strong>{yearsInRetirement} years</strong> of retirement.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Timeline Section */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Time Horizon</h4>
                    
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-bold text-slate-500">Retire at Age</label>
                            <span className="text-xl font-bold text-slate-900">{formData.retirement_age}</span>
                        </div>
                        <input 
                            type="range" min={50} max={80} step={1}
                            value={formData.retirement_age}
                            onChange={(e) => setFormData(prev => ({ ...prev, retirement_age: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-bold text-slate-500">Plan Until Age</label>
                            <span className="text-xl font-bold text-slate-900">{formData.life_expectancy}</span>
                        </div>
                        <input 
                            type="range" min={80} max={110} step={1}
                            value={formData.life_expectancy}
                            onChange={(e) => setFormData(prev => ({ ...prev, life_expectancy: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>

                    <div 
                        onClick={() => setFormData(prev => ({ ...prev, transition_phase: !prev.transition_phase }))}
                        className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 ${
                            formData.transition_phase ? 'border-amber-200 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Briefcase size={18} className={formData.transition_phase ? 'text-amber-600' : 'text-slate-400'} />
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">Semi-Retirement Phase</div>
                            <div className="text-[10px] text-slate-500">Work part-time for transition years?</div>
                        </div>
                        <div className={`w-4 h-4 rounded border ${formData.transition_phase ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`} />
                    </div>

                    <div 
                        onClick={() => setFormData(prev => ({ ...prev, include_superannuation: !prev.include_superannuation }))}
                        className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 ${
                            formData.include_superannuation ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Shield size={18} className={formData.include_superannuation ? 'text-emerald-600' : 'text-slate-400'} />
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">Include NZ Super</div>
                            <div className="text-[10px] text-slate-500">Offset costs with gov pension (~$24k/yr)?</div>
                        </div>
                        <div className={`w-4 h-4 rounded border ${formData.include_superannuation ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`} />
                    </div>
                </div>

                {/* Assumptions Section */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Market Assumptions</h4>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Risk Attitude</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'conservative', label: 'Conservative', Icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { id: 'balanced', label: 'Balanced', Icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50' },
                                { id: 'growth', label: 'Growth', Icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                            ].map((risk) => (
                                <div 
                                    key={risk.id}
                                    onClick={() => setFormData(prev => ({ ...prev, risk_attitude: risk.id }))}
                                    className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                                        formData.risk_attitude === risk.id 
                                        ? `border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500` 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <div className={`flex justify-center mb-1 ${formData.risk_attitude === risk.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        <risk.Icon size={20} />
                                    </div>
                                    <div className={`font-bold text-[10px] capitalize ${formData.risk_attitude === risk.id ? 'text-indigo-700' : 'text-slate-500'}`}>{risk.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500">Expected Return</label>
                                <span className="text-sm font-bold text-slate-900">{formData.expected_return_pct}%</span>
                            </div>
                            <input 
                                type="range" min={1} max={15} step={0.5}
                                value={formData.expected_return_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500">Inflation Rate</label>
                                <span className="text-sm font-bold text-slate-900">{formData.inflation_pct}%</span>
                            </div>
                            <input 
                                type="range" min={0} max={10} step={0.1}
                                value={formData.inflation_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200">
                    Confirm Parameters
                </button>
            </div>
        </form>
    );
};

// Combined Stage 3: Gap & Feasibility
const GapFeasibilityForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    // Read-only assets from AI (which got them from Wealth Centre API)
    const realAssets = {
        current_super_balance: initialValues.goal_details?.current_super_balance || 0,
        liquid_assets: initialValues.goal_details?.liquid_assets || 0,
        investments: initialValues.goal_details?.investments || 0,
        debts: initialValues.goal_details?.debts || 0,
        hasData: (initialValues.goal_details?.current_super_balance > 0 || 
                  initialValues.goal_details?.liquid_assets > 0 || 
                  initialValues.goal_details?.investments > 0)
    };

    // Timeline info (read-only)
    const currentAge = initialValues.goal_details?.current_age || 30;
    const retirementAge = initialValues.goal_details?.retirement_age || 65;
    const lifeExpectancy = initialValues.goal_details?.life_expectancy || 90;
    const yearsToSave = Math.max(0, retirementAge - currentAge);
    const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);

    // Calculate Required Nest Egg (25x rule)
    const livingExpensePA = initialValues.goal_details?.living_expense_pa || 60000;
    const includeSuper = initialValues.goal_details?.include_superannuation ?? true;
    const NZ_SUPER_PA = 24000; // Approx annual NZ Super (net)
    
    // If including super, we only need to fund the gap
    const annualFundingGoal = includeSuper 
        ? Math.max(0, livingExpensePA - NZ_SUPER_PA) 
        : livingExpensePA;
        
    const baseRequired = annualFundingGoal * 25;
    
    // User can adjust Required Money via slider
    const [requiredNestEgg, setRequiredNestEgg] = useState(
        initialValues.goal_details?.target_amount || baseRequired
    );

    // Force refresh nest egg when inputs change (and not yet confirmed)
    useEffect(() => {
        const newAnnualGoal = includeSuper 
            ? Math.max(0, livingExpensePA - NZ_SUPER_PA) 
            : livingExpensePA;
        const newBaseRequired = newAnnualGoal * 25;
        setRequiredNestEgg(newBaseRequired);
    }, [livingExpensePA, includeSuper]);

    // Calculate projected assets (simple projection)
    const totalCurrentAssets = realAssets.current_super_balance + 
                               realAssets.liquid_assets + 
                               realAssets.investments;
    
    // Very rough projection: assume assets double by retirement (conservative)
    const projectedAssets = totalCurrentAssets * Math.min(2, 1 + (yearsToSave / 35));
    
    const gap = Math.max(0, requiredNestEgg - projectedAssets);
    const feasibilityScore = requiredNestEgg > 0 
        ? Math.max(0, Math.min(100, (projectedAssets / requiredNestEgg) * 100))
        : 100;
    
    const isFeasible = feasibilityScore > 60; // Generous threshold

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubstageSubmit({
            // Pass confirmed required amount
            target_amount: requiredNestEgg,
            // Pass real assets (read-only, for context)
            ...realAssets,
            // Timeline confirmation
            current_age: currentAge,
            retirement_age: retirementAge,
            life_expectancy: lifeExpectancy
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Gap Analysis & Feasibility</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Let's check the numbers and confirm your target. Adjust as needed - gaps are normal for long-term goals.
                        </p>
                    </div>
                </div>
            </div>

            {/* Required Nest Egg - Adjustable Slider */}
            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Required Nest Egg</label>
                        <p className="text-xs text-slate-500 mt-1">Total savings needed by retirement</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-indigo-600">
                            ${(requiredNestEgg / 1000).toFixed(0)}k
                        </div>
                        <div className="text-xs text-slate-400">
                            = ${livingExpensePA.toLocaleString()}/yr 
                            {includeSuper && <span className="text-emerald-600 font-bold"> - $24k Super</span>}
                            {" "}× 25
                        </div>
                    </div>
                </div>
                <input 
                    type="range" 
                    min={Math.floor(baseRequired * 0.5 / 50000) * 50000}
                    max={Math.ceil(baseRequired * 2 / 50000) * 50000}
                    step={50000}
                    value={requiredNestEgg}
                    onChange={(e) => setRequiredNestEgg(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                    <span>Conservative</span>
                    <span className="text-indigo-500">Recommended: ${(baseRequired / 1000).toFixed(0)}k</span>
                    <span>Comfortable</span>
                </div>
            </div>

            {/* Timeline - Read-only Display */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 rounded-3xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Your Timeline</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Current Age</div>
                        <div className="text-2xl font-black text-slate-700">{currentAge}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Retirement Age</div>
                        <div className="text-2xl font-black text-indigo-600">{retirementAge}</div>
                        <div className="text-xs text-slate-400 mt-1">{yearsToSave} years to save</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Planning Until</div>
                        <div className="text-2xl font-black text-slate-700">{lifeExpectancy}</div>
                        <div className="text-xs text-slate-400 mt-1">{yearsInRetirement} years</div>
                    </div>
                </div>
            </div>

            {/* Available Assets for This Goal - Read-only from Wealth Centre */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Available Resources for This Goal</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Assets not allocated to other goals</p>
                    </div>
                    {realAssets.hasData ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-bold text-emerald-600">
                            <CheckCircle2 size={12} />
                            From Wealth Centre
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-400">
                            No Data Yet
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    {[
                        { label: 'KiwiSaver', value: realAssets.current_super_balance, color: 'indigo', tooltip: 'Available KiwiSaver balance' },
                        { label: 'Cash', value: realAssets.liquid_assets, color: 'emerald', tooltip: 'Liquid savings & current account' },
                        { label: 'Investments', value: realAssets.investments, color: 'blue', tooltip: 'Managed funds, ETFs, etc.' },
                        { label: 'Total Available', value: totalCurrentAssets, color: 'slate', tooltip: 'Total unallocated assets' }
                    ].map((asset, i) => (
                        <div key={i} className={`bg-${asset.color}-50/50 border border-${asset.color}-100 p-4 rounded-2xl transition-all hover:shadow-md hover:shadow-${asset.color}-100/20`} title={asset.tooltip}>
                            <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">{asset.label}</div>
                            <div className={`text-xl font-black text-${asset.color}-700`}>
                                ${(asset.value / 1000).toFixed(0)}k
                            </div>
                        </div>
                    ))}
                </div>
                
                {realAssets.hasData && (
                    <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/30 border border-blue-100/30 rounded-2xl text-[11px] text-blue-700 relative z-10">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <Brain size={14} className="text-blue-600" />
                        </div>
                        <p className="leading-relaxed">
                            <strong>Note:</strong> These amounts exclude assets already allocated to your other goals. If you have multiple retirement plans, only unallocated KiwiSaver is shown here.
                        </p>
                    </div>
                )}
                
                {!realAssets.hasData && (
                    <div className="mt-6 flex items-start gap-3 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-[11px] text-indigo-700 relative z-10">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <Brain size={14} className="text-indigo-600" />
                        </div>
                        <p className="leading-relaxed">
                            <strong>Smart Tip:</strong> Link your actual accounts in the <a href="/wealth-centre" className="underline font-bold hover:text-indigo-800">Wealth Centre</a>. We'll automatically keep your goal progress updated as your balances change.
                        </p>
                    </div>
                )}
            </div>

            {/* Gap Analysis Card */}
            <div className={`relative rounded-3xl p-6 border-2 transition-all duration-500 overflow-hidden ${
                isFeasible 
                    ? 'bg-white border-emerald-100 shadow-sm' 
                    : 'bg-white border-rose-100 shadow-sm'
            }`}>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-slate-400">
                                Feasibility Analysis
                            </div>
                            <h4 className="text-lg font-black text-slate-900">
                                {isFeasible ? 'Plan is on Track' : 'Adjustment Needed'}
                            </h4>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black ${
                            isFeasible 
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' 
                                : 'bg-rose-500 text-white shadow-md shadow-rose-100'
                        }`}>
                            {isFeasible ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {isFeasible ? 'ACHIEVABLE' : 'GAP DETECTED'}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Required', value: requiredNestEgg, color: 'text-slate-900', bgColor: 'bg-slate-50' },
                            { label: 'Projected', value: projectedAssets, color: 'text-emerald-600', bgColor: 'bg-emerald-50/50' },
                            { label: 'Gap', value: gap, color: isFeasible ? 'text-slate-400' : 'text-rose-600', bgColor: isFeasible ? 'bg-slate-50' : 'bg-rose-50/50' }
                        ].map((item, i) => (
                            <div key={i} className={`p-3 rounded-2xl ${item.bgColor} border border-white/50`}>
                                <div className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-500">
                                    {item.label}
                                </div>
                                <div className={`text-xl font-black ${item.color}`}>
                                    ${(item.value / 1000).toFixed(0)}k
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6 px-1">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                Goal Coverage
                            </span>
                            <span className={`text-sm font-black ${isFeasible ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {feasibilityScore.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    isFeasible ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, feasibilityScore)}%` }}
                            />
                        </div>
                    </div>

                    {/* Status Alert */}
                    <div className={`p-4 rounded-2xl border ${
                        isFeasible 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : 'bg-rose-50 border-rose-100 text-rose-800'
                    }`}>
                        <div className="flex gap-3">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isFeasible ? 'bg-white text-emerald-600' : 'bg-white text-rose-600 shadow-sm'}`}>
                                {isFeasible ? <Check size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <div>
                                <div className="font-bold text-xs mb-0.5">{isFeasible ? 'Looking Good!' : 'Strategy Required'}</div>
                                <p className="text-[10px] leading-relaxed opacity-80">
                                    {isFeasible 
                                        ? "Your trajectory is well-aligned with your retirement vision. Proceed to Strategy to optimize your plan."
                                        : `There's a shortfall of $${(gap/1000).toFixed(0)}k. Don't worry—we'll design a custom strategy to bridge this in the next stage.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Recommendation */}
            {initialValues.ai_decision?.rationale && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-3xl p-6 border border-indigo-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
                            <Brain size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">AI Recommendation</div>
                            <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {initialValues.ai_decision.rationale}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200">
                    Confirm & Generate Strategy
                </button>
            </div>
        </form>
    );
};

// Summary View
const RetirementSummary = ({ initialValues, onConfirm }) => {
    // We read from initialValues which is the collected Goal Context
    const vision = initialValues.goal_details || {};
    const gapInputs = initialValues.simulation_data?.financials?.gap_inputs || {};
    
    // Helper for currency
    const fmt = (n) => `$${Number(n || 0).toLocaleString()}`;

    const SummarySection = ({ title, icon: Icon, children }) => (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Icon size={18} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h4>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );

    const SummaryRow = ({ label, value, subValue }) => (
        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500 font-medium">{label}</span>
            <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{value}</div>
                {subValue && <div className="text-[10px] text-slate-400">{subValue}</div>}
            </div>
        </div>
    );

    return (
        <div className="mt-6 animate-fade-in space-y-6">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black mb-2 text-white">Review Your Retirement Plan</h3>
                        <p className="text-indigo-100 text-sm opacity-80">Please confirm your inputs before we generate your custom strategy.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-10 py-4 bg-white text-indigo-700 rounded-2xl font-black text-sm shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        Confirm & Continue <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummarySection title="Vision & Lifestyle" icon={Heart}>
                    <SummaryRow label="Plan Name" value={initialValues.goal_name || 'My Retirement'} />
                    <SummaryRow label="Location" value={vision.location} />
                    <SummaryRow label="Lifestyle" value={vision.lifestyle_tier} />
                    <SummaryRow label="Target Income" value={`${fmt(vision.living_expense_pa)} / yr`} />
                </SummarySection>

                <SummarySection title="Timeline & Risk" icon={Clock}>
                    <SummaryRow label="Retire at Age" value={vision.retirement_age} subValue={`Starting in ${vision.retirement_age - (vision.current_age || 30)} years`} />
                    <SummaryRow label="Plan Until" value={vision.life_expectancy} subValue={`${vision.life_expectancy - vision.retirement_age} years of income`} />
                    <SummaryRow label="Risk Profile" value={vision.risk_attitude} />
                    <SummaryRow label="Expected Return" value={`${vision.expected_return_pct}%`} />
                </SummarySection>

                <SummarySection title="Financial Baseline" icon={DollarSign}>
                    <SummaryRow label="Required Nest Egg" value={fmt(initialValues.goal_details?.target_amount || vision.living_expense_pa * 25)} />
                    <SummaryRow label="Total Current Assets" value={fmt((vision.current_super_balance || 0) + (vision.liquid_assets || 0) + (vision.investments || 0))} />
                    <SummaryRow label="NZ Super" value={vision.include_superannuation ? 'Included' : 'Excluded'} />
                    <SummaryRow label="Contribution" value={`${vision.kiwisaver_contribution_rate || 3}%`} subValue="Employer + Employee" />
                </SummarySection>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3">
                <Brain size={20} className="text-blue-600 shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                    <strong>Pro Tip:</strong> These parameters form the foundation of your <strong>Evolutionary Strategy</strong>. You can always come back and re-run simulations if your circumstances change.
                </p>
            </div>
        </div>
    );
};

const RetirementGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    // Use standard substage names: 'goal_discovery', 'assumptions', 'gap_analysis'
    
    if (activeSubstage === 'goal_discovery') {
        return <GoalVisionForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }

    if (activeSubstage === 'assumptions') {
        return <PlanningParametersForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }

    if (activeSubstage === 'gap_analysis') {
        return <GapFeasibilityForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }

    // Note: 'summary' substage has been removed from GENERIC_SUBSTAGES
    // Users now click "Confirm & continue" button in the stage summary card
    // If you need a summary page in the future, uncomment below:
    // if (activeSubstage === 'summary') {
    //     return <RetirementSummary initialValues={initialValues} onConfirm={() => onSubstageSubmit({ confirmed: true })} />;
    // }

    return <div className="text-center text-slate-500 py-8">Unknown Substage: {activeSubstage}</div>;
};

export default RetirementGoalForm;