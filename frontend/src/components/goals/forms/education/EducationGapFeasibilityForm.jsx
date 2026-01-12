import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Calculator, 
    PiggyBank, 
    GraduationCap,
    TrendingUp,
    Brain,
    HelpCircle,
    CheckCircle2,
    AlertCircle,
    Banknote,
    Briefcase
} from 'lucide-react';

const EducationGapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Read-Only Context from Previous Stages
    const vision = initialValues.goal_details || {};
    const assumptions = initialValues.goal_details || {}; // Merged
    const realAssets = {
        liquid_assets: initialValues.goal_details?.liquid_assets || 0,
        investments: initialValues.goal_details?.investments || 0,
        monthly_income: initialValues.goal_details?.monthly_income || 0,
        hasData: (initialValues.goal_details?.liquid_assets !== undefined)
    };

    // 2. Constants & Helpers
    const START_YEAR = vision.start_year || new Date().getFullYear() + 10;
    const DURATION = vision.duration_years || 3;
    
    // Costs
    const TUITION_PA = assumptions.tuition_fees_pa || 8000;
    const LIVING_PA = assumptions.living_costs_pa || 15000;
    const TOTAL_COST_PA = TUITION_PA + LIVING_PA;

    // Funding Sources
    const USE_LOAN = assumptions.use_student_loan;
    const WORK_PA = assumptions.part_time_work_pa || 0;
    const SCHOLAR_PA = assumptions.scholarships_pa || 0;
    const TOTAL_FUNDING_PA = WORK_PA + SCHOLAR_PA + (USE_LOAN ? TUITION_PA : 0);

    // Inflation
    const INFLATION_E = (assumptions.education_inflation_pct || 4.5) / 100;
    const INVESTMENT_RETURN = (assumptions.expected_return_pct || 6) / 100;
    
    // 3. Total Cost Calculation (Future Value)
    const yearsToStart = Math.max(0, START_YEAR - new Date().getFullYear());
    
    // Calculate FV of costs and funding for each year of study
    let totalProjectedCost = 0;
    let totalProjectedFunding = 0; // Work, Loan, Scholarships (Inflation Adjusted? Usually wages go up, loans cover tuition)
    
    for (let i = 0; i < DURATION; i++) {
        // Cost inflates every year until start, then continues during study
        const costFactor = Math.pow(1 + INFLATION_E, yearsToStart + i);
        const annualCostFV = TOTAL_COST_PA * costFactor;
        totalProjectedCost += annualCostFV;

        // Funding logic
        // Loans cover Tuition FV exactly if "Fees Free" or standard loan covers it? 
        // Let's assume Loan covers Tuition FV.
        // Work/Scholarships inflate with CPI? Let's assume they mimic Education inflation for simplicity or stay flat (conservative).
        // Let's inflate Work/Scholarships by standard inflation (2.5%)? Or just reuse Ed inflation for simplicity here.
        const fundingFactor = Math.pow(1 + INFLATION_E, yearsToStart + i); 
        const loanFV = USE_LOAN ? (TUITION_PA * costFactor) : 0;
        const workScholarFV = (WORK_PA + SCHOLAR_PA) * fundingFactor;
        
        totalProjectedFunding += loanFV + workScholarFV;
    }
    
    // 4. Net Gap Calculation
    const netCostToCover = Math.max(0, totalProjectedCost - totalProjectedFunding);

    // 5. Savings Projection
    const currentSavings = realAssets.liquid_assets + realAssets.investments;
    // Simple projection of CURRENT savings to start date
    const projectedSavingsAtStart = currentSavings * Math.pow(1 + INVESTMENT_RETURN, yearsToStart);
    
    // Remaining Gap after Savings
    const finalGap = Math.max(0, netCostToCover - projectedSavingsAtStart);
    
    // Feasibility Score
    // Denominator is Net Cost To Cover (Total Cost - "Pay as you go" sources like Loan/Work)
    // If Net Cost is 0 (fully funded by loan/work), score is 100
    const coveragePct = netCostToCover > 0 
        ? Math.min(100, (projectedSavingsAtStart / netCostToCover) * 100)
        : 100;
        
    const isFeasible = coveragePct > 80;

    // Stacked Bar Data
    const barTotal = totalProjectedCost;
    const barLoan = USE_LOAN ? (totalProjectedCost * (TUITION_PA/TOTAL_COST_PA)) : 0; // Rough approx for viz
    const barWork = (WORK_PA + SCHOLAR_PA) * DURATION * Math.pow(1 + INFLATION_E, yearsToStart); // Rough
    const barSavings = projectedSavingsAtStart;
    const barGap = finalGap;

    // Normalize for chart (total = 100%)
    const getPct = (val) => (val / barTotal) * 100;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit({ confirmed: true, target_amount: Math.round(totalProjectedCost) }); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-violet-50 to-purple-100/50 rounded-3xl p-6 border border-violet-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                        <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Education Funding Check</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We've analyzed your "Funding Stack" against the projected costs for {DURATION} years.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. VISUALIZATION - Stacked Bar / Waterfall Concept */}
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold uppercase tracking-wider text-sm">
                            <GraduationCap size={18} className="text-violet-500" /> Funding Stack Analysis
                        </div>

                        <div className="flex items-end justify-center h-64 w-full gap-4 px-4">
                            {/* Bar 1: Costs */}
                            <div className="w-24 flex flex-col items-center gap-2 group">
                                <div className="text-xs font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Total Cost</div>
                                <div className="w-full bg-slate-100 rounded-t-xl relative overflow-hidden flex flex-col-reverse shadow-inner" style={{ height: '100%' }}>
                                    <div className="w-full bg-slate-800 transition-all hover:bg-slate-700 relative group/segment" style={{ height: '100%' }}>
                                         <div className="absolute inset-0 flex items-center justify-center text-white/90 text-xs font-bold rotate-0">
                                            ${(totalProjectedCost/1000).toFixed(0)}k
                                         </div>
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-slate-900">Projected Cost</div>
                            </div>

                            {/* Divider */}
                            <div className="h-full w-px bg-slate-100 mx-2 dashed"></div>

                            {/* Bar 2: Funding Stack */}
                            <div className="w-24 flex flex-col items-center gap-2 group">
                                <div className="text-xs font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Your Stack</div>
                                <div className="w-full bg-slate-50 rounded-t-xl relative overflow-hidden flex flex-col-reverse shadow-inner" style={{ height: '100%' }}>
                                    {/* Gap (Top) */}
                                    {barGap > 0 && (
                                        <div className="w-full bg-rose-400 transition-all hover:bg-rose-500 relative" style={{ height: `${getPct(barGap)}%` }}>
                                             <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                                                Gap
                                             </div>
                                        </div>
                                    )}
                                    {/* Savings */}
                                    {barSavings > 0 && (
                                        <div className="w-full bg-emerald-400 transition-all hover:bg-emerald-500 relative" style={{ height: `${getPct(barSavings)}%` }}>
                                            <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                                                Savings
                                             </div>
                                        </div>
                                    )}
                                    {/* Work/Scholarships */}
                                    {barWork > 0 && (
                                        <div className="w-full bg-amber-400 transition-all hover:bg-amber-500 relative" style={{ height: `${getPct(barWork)}%` }}>
                                             <div className="absolute inset-0 flex items-center justify-center text-white/90 text-[10px] font-bold">
                                                Work
                                             </div>
                                        </div>
                                    )}
                                    {/* Loan (Bottom) */}
                                    {barLoan > 0 && (
                                        <div className="w-full bg-indigo-400 transition-all hover:bg-indigo-500 relative" style={{ height: `${getPct(barLoan)}%` }}>
                                            <div className="absolute inset-0 flex items-center justify-center text-white/90 text-[10px] font-bold">
                                                Loan
                                             </div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-900">Sources</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-3 justify-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-400"></div>Loan</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div>Work</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Savings</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"></div>Gap</div>
                    </div>
                </div>

                {/* 2. GAP ANALYSIS CARD */}
                <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-center ${
                    isFeasible ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'
                }`}>
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-sm">
                            <PiggyBank size={18} className="text-violet-500" /> Goal Feasibility
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                             isFeasible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                            {isFeasible ? 'Achievable' : 'Shortfall'}
                        </div>
                    </div>

                    <div className="text-center mb-8">
                         <div className="text-sm font-bold text-slate-500 mb-1">
                            {finalGap > 0 ? 'Savings Gap to Close' : 'Fully Funded!'}
                         </div>
                         <div className={`text-4xl font-black ${finalGap > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            ${(finalGap/1000).toFixed(0)}k
                         </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-white/60 rounded-2xl border border-white/50 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Funding Breakdown</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 flex items-center gap-2"><Banknote size={14}/> Student Loan</span>
                                    <span className="font-bold text-indigo-600">${(barLoan/1000).toFixed(0)}k</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 flex items-center gap-2"><Briefcase size={14}/> Work & Grants</span>
                                    <span className="font-bold text-amber-600">${(barWork/1000).toFixed(0)}k</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 flex items-center gap-2"><PiggyBank size={14}/> Your Savings</span>
                                    <span className="font-bold text-emerald-600">${(barSavings/1000).toFixed(0)}k</span>
                                </div>
                            </div>
                        </div>

                        {!isFeasible && (
                            <div className="flex gap-3 items-start p-3 bg-white/50 rounded-xl border border-rose-100">
                                <HelpCircle size={16} className="mt-0.5 text-rose-400 shrink-0" />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <strong>Bridging the Gap:</strong> You can close this gap by increasing your savings rate, delaying the start year, or planning for more part-time work during study.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Recommendation */}
            {initialValues.ai_decision?.rationale && (
                <div className="bg-gradient-to-br from-violet-50/50 to-indigo-50/50 rounded-3xl p-6 border border-violet-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
                            <Brain size={20} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] mb-3">AI Analysis</div>
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

export default EducationGapFeasibilityForm;