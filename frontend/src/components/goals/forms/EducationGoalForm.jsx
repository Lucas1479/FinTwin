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
    GraduationCap,
    Globe,
    School,
    Award,
    Briefcase,
    Brain,
    Plane,
    BookOpen,
    Landmark,
    CheckCircle2,
    Check
} from 'lucide-react';

// --- DOMAIN KNOWLEDGE DATABASE ---
// Fintech Logic: Base costs derived from 2024/25 International Education Data
// All figures in NZD for simplicity
const COST_DATABASE = {
    NZ: {
        name: 'New Zealand',
        flag: '🇳🇿',
        tuition: { public: 8000, private: 25000 }, // Domestic rates
        living: { home: 5000, flat: 25000 }, // Home = food/transport only
        avg_duration: { undergrad: 3, postgrad: 1 }
    },
    AU: {
        name: 'Australia',
        flag: '🇦🇺',
        tuition: { public: 45000, private: 60000 }, // Int'l rates usually
        living: { home: 0, flat: 35000 },
        avg_duration: { undergrad: 3, postgrad: 2 }
    },
    UK: {
        name: 'United Kingdom',
        flag: '🇬🇧',
        tuition: { public: 50000, private: 70000 },
        living: { home: 0, flat: 40000 }, // London vs non-London avg
        avg_duration: { undergrad: 3, postgrad: 1 } // UK Masters often 1 yr
    },
    US: {
        name: 'USA',
        flag: '🇺🇸',
        tuition: { public: 60000, private: 90000 }, // Public State vs Private
        living: { home: 0, flat: 45000 },
        avg_duration: { undergrad: 4, postgrad: 2 }
    }
};

// --- STAGE 1: VISION (Strategic Definition) ---
const GoalVisionForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Education Fund',
        priority: initialValues.priority || 'want',
        // Strategic Inputs
        study_country: initialValues.goal_details?.study_country || 'NZ',
        institution_tier: initialValues.goal_details?.institution_tier || 'public', 
        living_situation: initialValues.goal_details?.living_situation || 'flat', // 'home' | 'flat' | 'halls'
        // Financials
        tuition_fees_pa: initialValues.goal_details?.tuition_fees_pa || 8000,
        living_costs_pa: initialValues.goal_details?.living_costs_pa || 25000,
        notes: initialValues.goal_details?.notes || ''
    });

    // Smart Auto-Fill: Update costs when Country/Tier changes
    // BUT only if user hasn't manually overridden them (we use a simple heuristic here for the demo)
    useEffect(() => {
        const countryData = COST_DATABASE[formData.study_country];
        const baseTuition = countryData.tuition[formData.institution_tier] || countryData.tuition.public;
        
        let baseLiving = countryData.living[formData.living_situation] || countryData.living.flat;
        // Logic: Cannot live at home if overseas
        if (formData.study_country !== 'NZ' && formData.living_situation === 'home') {
            baseLiving = countryData.living.flat; // Default fallback
        }

        // Update local state with smart defaults
        setFormData(prev => {
            // Check if we should update (simple diff to prevent loops)
            if (prev.tuition_fees_pa === baseTuition && prev.living_costs_pa === baseLiving) return prev;
            
            return {
                ...prev,
                tuition_fees_pa: baseTuition,
                living_costs_pa: baseLiving,
                // Force reset living situation if invalid (e.g. living at home in USA)
                living_situation: (formData.study_country !== 'NZ' && prev.living_situation === 'home') ? 'flat' : prev.living_situation
            };
        });
    }, [formData.study_country, formData.institution_tier, formData.living_situation]);

    // Propagate to Parent
    useEffect(() => {
        const totalAnnual = formData.tuition_fees_pa + formData.living_costs_pa;
        onChange?.({
            goal_name: formData.goal_name,
            priority: formData.priority,
            goal_details: {
                ...initialValues.goal_details,
                study_country: formData.study_country,
                institution_tier: formData.institution_tier,
                living_situation: formData.living_situation,
                tuition_fees_pa: formData.tuition_fees_pa,
                living_costs_pa: formData.living_costs_pa,
                annual_cost_pa: totalAnnual, // Derived total for consistency
                notes: formData.notes
            }
        });
    }, [formData]);

    const totalAnnualCost = formData.tuition_fees_pa + formData.living_costs_pa;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <GraduationCap size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Education Strategy</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Define the educational path. Costs vary significantly by country and institution type.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Strategic Inputs */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                            placeholder="e.g. Sarah's University Fund"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Destination</label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(COST_DATABASE).map(([code, data]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, study_country: code }))}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                        formData.study_country === code
                                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="text-2xl">{data.flag}</span>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{data.name}</div>
                                        <div className="text-[10px] text-slate-500">
                                            Avg: ${(data.tuition.public + data.living.flat) / 1000}k/yr
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Institution Tier</label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'public', label: 'Public / State', icon: School },
                                { id: 'private', label: 'Private / Ivy', icon: Award }
                            ].map(tier => (
                                <button
                                    key={tier.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, institution_tier: tier.id }))}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                        formData.institution_tier === tier.id
                                        ? 'bg-white text-indigo-700 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <tier.icon size={14} />
                                    {tier.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Living Arrangement</label>
                        <div className="flex gap-2">
                            {formData.study_country === 'NZ' && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, living_situation: 'home' }))}
                                    className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                                        formData.living_situation === 'home'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 text-slate-500'
                                    }`}
                                >
                                    <div className="text-xs font-bold">🏠 At Home</div>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, living_situation: 'flat' }))}
                                className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                                    formData.living_situation === 'flat'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 text-slate-500'
                                }`}
                            >
                                <div className="text-xs font-bold">🏢 Flat / Halls</div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Cost Breakdown Engine */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                            <Calculator size={14} /> Annual Cost Estimator
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Tuition Fees</span>
                                    <span className="font-bold text-slate-900">${formData.tuition_fees_pa.toLocaleString()}</span>
                                </div>
                                <input 
                                    type="range" min={0} max={100000} step={1000}
                                    value={formData.tuition_fees_pa}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tuition_fees_pa: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Living Costs</span>
                                    <span className="font-bold text-slate-900">${formData.living_costs_pa.toLocaleString()}</span>
                                </div>
                                <input 
                                    type="range" min={0} max={60000} step={1000}
                                    value={formData.living_costs_pa}
                                    onChange={(e) => setFormData(prev => ({ ...prev, living_costs_pa: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs text-slate-400 font-medium">Est. Annual Total</div>
                                        <div className="text-3xl font-black text-slate-900 mt-1">
                                            ${(totalAnnualCost / 1000).toFixed(1)}k
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                            Per Year (NZD)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Strategic Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                            rows={3}
                            placeholder="e.g. Aiming for Otago Medical School, need to factor in 6 years duration..."
                        />
                    </div>
                </div>
            </div>

            {/* 
            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Next: Timeline & Parameters
                </button>
            </div>
            */}
        </div>
    );
};

// --- STAGE 2: PARAMETERS (Inflation & Timeline) ---
const PlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        // Timeline
        current_child_age: initialValues.goal_details?.current_child_age || 0,
        start_age: initialValues.goal_details?.start_age || 18,
        duration: initialValues.goal_details?.duration || 3, // Years of study
        // Assumptions
        inflation_pct: initialValues.goal_details?.inflation_pct || 4.5, // Higher than CPI
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 6.0
    });

    useEffect(() => {
        // Calculate due_date
        const currentYear = new Date().getFullYear();
        const yearsToStart = Math.max(0, formData.start_age - formData.current_child_age);
        const startYear = currentYear + yearsToStart;
        
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            },
            due_date: new Date(startYear, 0, 1)
        });
    }, [formData]);

    const finishAge = formData.start_age + formData.duration;
    const yearsToSave = Math.max(0, formData.start_age - formData.current_child_age);

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Clock size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Timeline & Inflation</h3>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Education costs rise faster than regular goods. We use a specialized inflation rate.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Timeline */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Your Horizon</h4>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 relative">
                        {/* Timeline Graphic */}
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="text-center">
                                <div className="text-xs text-slate-400 font-bold mb-1">NOW</div>
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold mx-auto border border-slate-200">
                                    {formData.current_child_age}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">Age</div>
                            </div>
                            <div className="flex-1 h-1 bg-slate-100 mx-4 relative">
                                <div className="absolute top-0 left-0 h-full bg-indigo-200 w-full"></div>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-white px-2 text-indigo-500 font-bold border border-indigo-100 rounded-full">
                                    {yearsToSave} Years Saving
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-indigo-500 font-bold mb-1">START</div>
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold mx-auto shadow-lg shadow-indigo-200">
                                    {formData.start_age}
                                </div>
                                <div className="text-[10px] text-indigo-600 mt-1">Uni</div>
                            </div>
                            <div className="flex-1 h-1 bg-slate-100 mx-4 relative">
                                <div className="absolute top-0 left-0 h-full bg-emerald-200 w-full"></div>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-white px-2 text-emerald-500 font-bold border border-emerald-100 rounded-full">
                                    {formData.duration} Years Study
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-emerald-500 font-bold mb-1">GRAD</div>
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold mx-auto border border-emerald-200">
                                    {finishAge}
                                </div>
                                <div className="text-[10px] text-emerald-600 mt-1">Done</div>
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-4">
                            <div>
                                <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Current Age</span>
                                    <span>{formData.current_child_age}</span>
                                </label>
                                <input 
                                    type="range" min={0} max={17} step={1}
                                    value={formData.current_child_age}
                                    onChange={(e) => setFormData(prev => ({ ...prev, current_child_age: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                />
                            </div>
                            <div>
                                <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Start Age</span>
                                    <span>{formData.start_age}</span>
                                </label>
                                <input 
                                    type="range" min={17} max={25} step={1}
                                    value={formData.start_age}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_age: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Duration (Years)</span>
                                    <span>{formData.duration}</span>
                                </label>
                                <input 
                                    type="range" min={1} max={6} step={1}
                                    value={formData.duration}
                                    onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Economic Assumptions */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Market Assumptions</h4>
                    
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={16} className="text-rose-500" />
                            <span className="text-sm font-bold text-rose-800">Education Inflation</span>
                        </div>
                        <div className="text-3xl font-black text-rose-600 mb-2">{formData.inflation_pct}%</div>
                        <input 
                            type="range" min={2} max={8} step={0.1}
                            value={formData.inflation_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                            className="w-full h-1.5 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <p className="text-[10px] text-rose-700 mt-2 leading-relaxed">
                            <strong>Advisor Tip:</strong> Education costs typically rise 2-3% faster than general CPI. We recommend using 4.5% or higher to be safe.
                        </p>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                         <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={16} className="text-indigo-500" />
                            <span className="text-sm font-bold text-indigo-800">Investment Return</span>
                        </div>
                        <div className="text-3xl font-black text-indigo-600 mb-2">{formData.expected_return_pct}%</div>
                        <input 
                            type="range" min={2} max={12} step={0.5}
                            value={formData.expected_return_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                            className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-indigo-400 mt-1 font-bold uppercase">
                            <span>Conservative</span>
                            <span>Aggressive</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 
            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Next: Funding Strategy
                </button>
            </div>
            */}
        </div>
    );
};

// --- STAGE 3: GAP (Funding Stack) ---
const GapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Calculate Total Required (Future Value logic simplified for UI, AI handles real math)
    const annualCost = initialValues.goal_details?.annual_cost_pa || 30000;
    const duration = initialValues.goal_details?.duration || 3;
    const grossNeed = annualCost * duration;

    // 2. Funding Stack State
    const [funding, setFunding] = useState({
        parent_savings: initialValues.goal_details?.saved_amount || 0, // Lump sum now
        parent_contribution_monthly: initialValues.goal_details?.monthly_contribution || 0,
        student_loan_pct: initialValues.goal_details?.student_loan_pct || 30, // % of tuition covered by loan
        student_work_weekly: initialValues.goal_details?.student_work_weekly || 150 // Weekly income from part-time
    });

    // 3. Simple Projection (UI Estimation)
    const yearsToSave = Math.max(0, (initialValues.goal_details?.start_age || 18) - (initialValues.goal_details?.current_child_age || 5));
    
    // Parent Funding
    const parentSavingsFuture = funding.parent_savings; // Simplification: assume existing + growth
    const parentMonthlyFuture = funding.parent_contribution_monthly * 12 * yearsToSave;
    const totalParentFunding = parentSavingsFuture + parentMonthlyFuture;

    // Student Funding (During Study)
    // Student Loan covers % of Tuition ONLY
    const tuitionOnly = (initialValues.goal_details?.tuition_fees_pa || 0) * duration;
    const totalStudentLoan = tuitionOnly * (funding.student_loan_pct / 100);
    
    // Work: Weekly * 40 weeks * duration
    const totalStudentWork = funding.student_work_weekly * 40 * duration;

    const totalResources = totalParentFunding + totalStudentLoan + totalStudentWork;
    const gap = Math.max(0, grossNeed - totalResources);
    const coverage = Math.min(100, (totalResources / grossNeed) * 100);
    const isFeasible = coverage >= 90;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubstageSubmit({
            target_amount: grossNeed,
            ...funding,
            projected_resources: {
                parent: totalParentFunding,
                loan: totalStudentLoan,
                work: totalStudentWork
            }
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Landmark size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Funding Strategy</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            How will the bill be split? Balance parent support, student loans, and part-time work.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COL 1: The Bill */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Total Estimated Cost</div>
                            <div className="text-3xl font-black mb-1">${(grossNeed / 1000).toFixed(0)}k</div>
                            <div className="text-xs text-slate-400 opacity-80">{duration} years @ ${(annualCost/1000).toFixed(1)}k/yr</div>
                            
                            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Tuition Portion</span>
                                    <span className="font-bold">${(tuitionOnly/1000).toFixed(0)}k</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Living Portion</span>
                                    <span className="font-bold">${((grossNeed - tuitionOnly)/1000).toFixed(0)}k</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isFeasible ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        {isFeasible ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <div className="text-xs font-bold leading-tight">
                            {isFeasible ? 'Fully Funded!' : `Shortfall of $${(gap/1000).toFixed(0)}k detected.`}
                        </div>
                    </div>
                </div>

                {/* COL 2 & 3: The Sources */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Source A: Parent */}
                    <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-4">
                            <Brain size={16} /> Parent Contribution
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Current Savings</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input 
                                        type="number"
                                        value={funding.parent_savings}
                                        onChange={(e) => setFunding(prev => ({ ...prev, parent_savings: Number(e.target.value) }))}
                                        className="w-full pl-7 input-base"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Monthly Top-up</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input 
                                        type="number"
                                        value={funding.parent_contribution_monthly}
                                        onChange={(e) => setFunding(prev => ({ ...prev, parent_contribution_monthly: Number(e.target.value) }))}
                                        className="w-full pl-7 input-base"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Source B: Student */}
                    <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-4">
                            <Briefcase size={16} /> Student Effort
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-bold text-slate-600">Student Loan Coverage</span>
                                    <span className="font-bold text-emerald-600">{funding.student_loan_pct}% of Tuition</span>
                                </div>
                                <input 
                                    type="range" min={0} max={100} step={10}
                                    value={funding.student_loan_pct}
                                    onChange={(e) => setFunding(prev => ({ ...prev, student_loan_pct: Number(e.target.value) }))}
                                    className="w-full h-1.5 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    NZ Student Loans are interest-free for residents. Covering tuition via loan is a common strategy.
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Part-time Work Income (Weekly)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input 
                                        type="number"
                                        value={funding.student_work_weekly}
                                        onChange={(e) => setFunding(prev => ({ ...prev, student_work_weekly: Number(e.target.value) }))}
                                        className="w-full pl-7 input-base"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 
            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Generate Strategy
                </button>
            </div>
            */}
        </div>
    );
};

// --- MAIN CONTROLLER ---
const EducationGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    
    if (activeSubstage === 'goal_discovery') {
        return <GoalVisionForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }

    if (activeSubstage === 'assumptions') {
        return <PlanningParametersForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} />;
    }

    if (activeSubstage === 'gap_analysis') {
        return <GapFeasibilityForm initialValues={initialValues} onSubstageSubmit={onSubstageSubmit} />;
    }

    return <div className="text-center text-slate-500 py-8">Unknown Substage: {activeSubstage}</div>;
};

export default EducationGoalForm;