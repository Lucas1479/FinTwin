import React, { useState, useEffect } from 'react';
import { 
    Scale, 
    TrendingUp, 
    Shield, 
    GraduationCap,
    BookOpen,
    Coins,
    Banknote,
    Briefcase,
    HelpCircle
} from 'lucide-react';

const EducationPlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        // Market Assumptions
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 6,
        inflation_pct: initialValues.goal_details?.inflation_pct || 2.5,
        education_inflation_pct: initialValues.goal_details?.education_inflation_pct || 4.5,
        risk_attitude: initialValues.goal_details?.risk_attitude || 'balanced',
        
        // Cost Estimates
        tuition_fees_pa: initialValues.goal_details?.tuition_fees_pa || 8000,
        living_costs_pa: initialValues.goal_details?.living_costs_pa || 15000,
        
        // Funding Stack (New)
        use_student_loan: initialValues.goal_details?.use_student_loan ?? true, // For tuition
        part_time_work_pa: initialValues.goal_details?.part_time_work_pa || 0,
        scholarships_pa: initialValues.goal_details?.scholarships_pa || 0,
        family_contribution_lump: initialValues.goal_details?.family_contribution_lump || 0
    });

    // Helper to estimate costs based on institution type (if not set yet)
    // Note: We only run this once on mount if values are default
    useEffect(() => {
        const type = initialValues.goal_details?.institution_type;
        const living = initialValues.goal_details?.living_situation;
        
        if (type && formData.tuition_fees_pa === 8000) { // Only auto-set if still default
            let newTuition = 8000;
            if (type === 'university_overseas') newTuition = 45000;
            if (type === 'private_school') newTuition = 25000;
            if (type === 'polytech') newTuition = 6000;
            
            setFormData(prev => ({ ...prev, tuition_fees_pa: newTuition }));
        }
        
        if (living && formData.living_costs_pa === 15000) {
            let newLiving = 15000;
            if (living === 'home') newLiving = 5000; // Food/Transport contribution
            if (living === 'campus') newLiving = 22000; // Hall fees
            
            setFormData(prev => ({ ...prev, living_costs_pa: newLiving }));
        }
    }, []); // Run once on mount

    // Sync with initialValues & Propagate
    useEffect(() => {
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            }
        });
    }, [formData]);

    const handleRiskSelect = (attitude) => {
        setFormData(prev => ({ ...prev, risk_attitude: attitude }));
    };

    const totalAnnualCost = formData.tuition_fees_pa + formData.living_costs_pa;
    const totalAnnualFunding = formData.part_time_work_pa + formData.scholarships_pa + (formData.use_student_loan ? formData.tuition_fees_pa : 0);
    const netAnnualGap = Math.max(0, totalAnnualCost - totalAnnualFunding);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-violet-50 to-purple-100/50 rounded-3xl p-6 border border-violet-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                        <Scale size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Costs & Funding Stack</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Education is expensive, but you don't have to fund it all yourself. Let's model the "Funding Stack".
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: The Cost Side */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <GraduationCap size={16} /> Annual Expenses (Today's $)
                    </h4>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-sm">
                        {/* Tuition */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-slate-500">Tuition Fees</label>
                                <span className="text-xl font-black text-slate-900">${formData.tuition_fees_pa.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" min={0} max={60000} step={500}
                                value={formData.tuition_fees_pa}
                                onChange={(e) => setFormData(prev => ({ ...prev, tuition_fees_pa: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                        </div>

                        {/* Living */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-slate-500">Living Costs (Rent, Food)</label>
                                <span className="text-xl font-black text-slate-900">${formData.living_costs_pa.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" min={0} max={40000} step={500}
                                value={formData.living_costs_pa}
                                onChange={(e) => setFormData(prev => ({ ...prev, living_costs_pa: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Annual Cost</div>
                             <div className="text-2xl font-black text-slate-800">${totalAnnualCost.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Inflation Settings */}
                     <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                            <TrendingUp size={14} /> Inflation Assumptions
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs text-slate-500">Education Inflation</label>
                                <span className="text-sm font-bold text-slate-900">{formData.education_inflation_pct}%</span>
                            </div>
                            <input 
                                type="range" min={0} max={10} step={0.5}
                                value={formData.education_inflation_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, education_inflation_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Col: The Funding Side */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Coins size={16} /> Funding Sources
                    </h4>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm">
                        {/* Student Loan Toggle */}
                        <div 
                            onClick={() => setFormData(prev => ({ ...prev, use_student_loan: !prev.use_student_loan }))}
                            className={`cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all ${
                                formData.use_student_loan ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <div className={`p-1.5 rounded-lg shrink-0 ${formData.use_student_loan ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Banknote size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-slate-900">Student Loan (Interest Free)</div>
                                    <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${formData.use_student_loan ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.use_student_loan ? 'translate-x-3' : ''}`} />
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">Covers Tuition Fees automatically.</div>
                            </div>
                        </div>

                        {/* Part Time Work */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Briefcase size={12} /> Part-Time Work / Year
                                </label>
                                <span className="text-base font-bold text-emerald-600">+${formData.part_time_work_pa.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" min={0} max={30000} step={1000}
                                value={formData.part_time_work_pa}
                                onChange={(e) => setFormData(prev => ({ ...prev, part_time_work_pa: Number(e.target.value) }))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                         {/* Scholarships / Family */}
                         <div>
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2">
                                <GraduationCap size={12} /> Scholarships / Grants / Family
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={formData.scholarships_pa}
                                    onChange={(e) => setFormData(prev => ({ ...prev, scholarships_pa: Number(e.target.value) }))}
                                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">/ yr</span>
                            </div>
                        </div>

                        {/* Net Gap Preview */}
                        <div className={`mt-4 p-3 rounded-xl border ${netAnnualGap > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600 uppercase">Remaining Gap / Year</span>
                                <span className={`text-lg font-black ${netAnnualGap > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    ${netAnnualGap.toLocaleString()}
                                </span>
                            </div>
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

export default EducationPlanningParametersForm;