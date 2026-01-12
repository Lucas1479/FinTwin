import React, { useState, useEffect } from 'react';
import { 
    Scale, 
    TrendingUp, 
    Shield, 
    AlertTriangle,
    BadgePercent,
    Landmark
} from 'lucide-react';

const HomePlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        // Market Assumptions
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 6,
        inflation_pct: initialValues.goal_details?.inflation_pct || 2.5,
        property_appreciation_pct: initialValues.goal_details?.property_appreciation_pct || 3.5,
        risk_attitude: initialValues.goal_details?.risk_attitude || 'balanced',
        
        // Mortgage Specifics
        mortgage_rate_pct: initialValues.goal_details?.mortgage_rate_pct || 6.5,
        stress_test_rate_pct: initialValues.goal_details?.stress_test_rate_pct || 8.5, // Usually +2% buffer
        loan_term_years: initialValues.goal_details?.loan_term_years || 30
    });

    // Sync with initialValues from parent
    useEffect(() => {
        if (initialValues.goal_details) {
            setFormData(prev => {
                const newVal = {
                    expected_return_pct: initialValues.goal_details.expected_return_pct ?? prev.expected_return_pct,
                    inflation_pct: initialValues.goal_details.inflation_pct ?? prev.inflation_pct,
                    property_appreciation_pct: initialValues.goal_details.property_appreciation_pct ?? prev.property_appreciation_pct,
                    risk_attitude: initialValues.goal_details.risk_attitude ?? prev.risk_attitude,
                    mortgage_rate_pct: initialValues.goal_details.mortgage_rate_pct ?? prev.mortgage_rate_pct,
                    stress_test_rate_pct: initialValues.goal_details.stress_test_rate_pct ?? prev.stress_test_rate_pct,
                    loan_term_years: initialValues.goal_details.loan_term_years ?? prev.loan_term_years
                };

                // Avoid update if values are identical
                if (
                    newVal.expected_return_pct === prev.expected_return_pct &&
                    newVal.inflation_pct === prev.inflation_pct &&
                    newVal.property_appreciation_pct === prev.property_appreciation_pct &&
                    newVal.risk_attitude === prev.risk_attitude &&
                    newVal.mortgage_rate_pct === prev.mortgage_rate_pct &&
                    newVal.stress_test_rate_pct === prev.stress_test_rate_pct &&
                    newVal.loan_term_years === prev.loan_term_years
                ) {
                    return prev;
                }
                
                return newVal;
            });
        }
    }, [initialValues]);
    useEffect(() => {
        setFormData(prev => {
            // Only update stress test if it wasn't manually overridden drastically
            // Or just enforce the rule: Stress Test = Rate + 2%
            const ruleBasedStress = prev.mortgage_rate_pct + 2.0;
            if (Math.abs(prev.stress_test_rate_pct - ruleBasedStress) < 0.5) {
                return { ...prev, stress_test_rate_pct: ruleBasedStress };
            }
            return prev;
        });
    }, [formData.mortgage_rate_pct]);

    // Propagate changes
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

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Scale size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Market & Mortgage Assumptions</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Set the rules for your simulation. We use a <strong>Stress Test Rate</strong> to ensure you can afford the loan even if rates rise.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: Mortgage Rules */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Landmark size={16} /> Mortgage Parameters
                    </h4>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Mortgage Interest Rate</label>
                                <span className="text-2xl font-black text-slate-900">{formData.mortgage_rate_pct}%</span>
                            </div>
                            <div className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">
                                Current Avg: ~6.5%
                            </div>
                        </div>
                        <input 
                            type="range" min={2} max={10} step={0.1}
                            value={formData.mortgage_rate_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, mortgage_rate_pct: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1">
                                        <AlertTriangle size={12} className="text-amber-500"/> Stress Test Rate
                                    </label>
                                    <span className="text-xl font-bold text-slate-700">{formData.stress_test_rate_pct}%</span>
                                </div>
                                <div className="text-[10px] text-slate-400 max-w-[120px] text-right leading-tight">
                                    Bank serviceability buffer (+2%)
                                </div>
                            </div>
                             <input 
                                type="range" min={4} max={12} step={0.1}
                                value={formData.stress_test_rate_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, stress_test_rate_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-slate-700">Loan Term</label>
                            <span className="text-xl font-bold text-slate-900">{formData.loan_term_years} Years</span>
                        </div>
                        <input 
                            type="range" min={10} max={30} step={5}
                            value={formData.loan_term_years}
                            onChange={(e) => setFormData(prev => ({ ...prev, loan_term_years: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                         <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>10y (Aggressive)</span>
                            <span>30y (Standard)</span>
                        </div>
                    </div>
                </div>

                {/* Right Col: Investment & Growth */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <TrendingUp size={16} /> Savings & Growth
                    </h4>

                    {/* Risk Profile */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Deposit Savings Risk Profile</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'conservative', label: 'Stable', Icon: Shield },
                                { id: 'balanced', label: 'Balanced', Icon: Scale },
                                { id: 'growth', label: 'Growth', Icon: TrendingUp }
                            ].map((risk) => (
                                <div 
                                    key={risk.id}
                                    onClick={() => handleRiskSelect(risk.id)}
                                    className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                                        formData.risk_attitude === risk.id 
                                        ? `border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 text-indigo-700` 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <div className="flex justify-center mb-1">
                                        <risk.Icon size={18} />
                                    </div>
                                    <div className="font-bold text-[10px] uppercase">{risk.label}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            *For short timeframes (&lt;3 years), we recommend <strong>Conservative</strong> to protect your deposit.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500">Savings Return (After Tax)</label>
                                <span className="text-sm font-bold text-slate-900">{formData.expected_return_pct}%</span>
                            </div>
                            <input 
                                type="range" min={1} max={10} step={0.25}
                                value={formData.expected_return_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <BadgePercent size={12} /> Property Appreciation
                                </label>
                                <span className="text-sm font-bold text-slate-900">{formData.property_appreciation_pct}%</span>
                            </div>
                            <input 
                                type="range" min={0} max={8} step={0.5}
                                value={formData.property_appreciation_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, property_appreciation_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="text-[10px] text-slate-400 mt-1">
                                NZ Historical Avg: ~3-5% (Real). Higher rates increase your deposit target over time.
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

export default HomePlanningParametersForm;