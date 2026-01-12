import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Calculator, 
    CheckCircle2, 
    AlertCircle, 
    PiggyBank, 
    TrendingUp, 
    Landmark,
    Banknote,
    Wallet,
    Brain,
    Check
} from 'lucide-react';

const HomeGapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Read-Only Context from Previous Stages
    const vision = initialValues.goal_details || {};
    const assumptions = initialValues.goal_details || {}; // Merged in same object
    const realAssets = {
        liquid_assets: initialValues.goal_details?.liquid_assets || 0,
        investments: initialValues.goal_details?.investments || 0,
        kiwisaver: initialValues.goal_details?.current_super_balance || 0,
        monthly_income: initialValues.goal_details?.monthly_income || 0,
        debts: initialValues.goal_details?.debts || 0,
        hasData: (initialValues.goal_details?.liquid_assets !== undefined)
    };

    // 2. Constants & Helpers
    const PROPERTY_PRICE = vision.property_price_estimate || 800000;
    const DEPOSIT_PCT = vision.deposit_percentage || 20;
    const FIRST_HOME_GRANT = vision.is_first_home ? 10000 : 0; // Simplified
    const MORTGAGE_RATE = assumptions.mortgage_rate_pct || 6.5;
    const TERM_YEARS = assumptions.loan_term_years || 30;

    // 3. Deposit Gap Calculation
    const targetDeposit = Math.round(PROPERTY_PRICE * (DEPOSIT_PCT / 100));
    const availableDeposit = realAssets.liquid_assets + realAssets.investments + (vision.is_first_home ? realAssets.kiwisaver : 0) + FIRST_HOME_GRANT;
    const depositGap = Math.max(0, targetDeposit - availableDeposit);

    // 4. Servicing Gap Calculation (Simplified PMT)
    const principal = PROPERTY_PRICE - availableDeposit; // Assuming they buy NOW with what they have (or target)
    // Actually, servicing is based on the *Target Loan Amount* (Price - Target Deposit)
    const targetLoanAmount = PROPERTY_PRICE - targetDeposit;
    
    // Monthly P&I Payment Formula: P * r(1+r)^n / ((1+r)^n - 1)
    const monthlyRate = (MORTGAGE_RATE / 100) / 12;
    const numPayments = TERM_YEARS * 12;
    const monthlyMortgagePayment = targetLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    // DTI / Affordability Check (Rough Rule: Mortgage < 40% of Income)
    const maxAffordablePayment = (realAssets.monthly_income || 0) * 0.40;
    const servicingGap = Math.max(0, monthlyMortgagePayment - maxAffordablePayment);
    const isServiceable = monthlyMortgagePayment <= maxAffordablePayment;
    
    // Overall Feasibility Score
    const depositReadyPct = Math.min(100, (availableDeposit / targetDeposit) * 100);
    const isFeasible = depositReadyPct > 80 && isServiceable;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit({ confirmed: true }); }} className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Affordability Check</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We look at two things: <strong>Deposit</strong> (Entry Ticket) and <strong>Servicing</strong> (Keeping the House).
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. DEPOSIT ANALYSIS */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    depositReadyPct >= 100 ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-white'
                }`}>
                    <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <PiggyBank size={18} className="text-indigo-500" /> Deposit Check
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold">Target ({DEPOSIT_PCT}%)</span>
                            <span className="text-xl font-black text-slate-900">${(targetDeposit/1000).toFixed(0)}k</span>
                        </div>
                        
                        {/* Stacked Bar */}
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            {/* Savings */}
                            <div style={{ width: `${(realAssets.liquid_assets / targetDeposit) * 100}%` }} className="bg-emerald-400 h-full" title="Cash" />
                            {/* Investments */}
                            <div style={{ width: `${(realAssets.investments / targetDeposit) * 100}%` }} className="bg-emerald-300 h-full" title="Investments" />
                            {/* KiwiSaver (if eligible) */}
                            {vision.is_first_home && (
                                <div style={{ width: `${(realAssets.kiwisaver / targetDeposit) * 100}%` }} className="bg-blue-400 h-full" title="KiwiSaver" />
                            )}
                             {/* Grant */}
                             {vision.is_first_home && (
                                <div style={{ width: `${(FIRST_HOME_GRANT / targetDeposit) * 100}%` }} className="bg-sky-400 h-full" title="Grant" />
                            )}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                            <span>Have: ${(availableDeposit/1000).toFixed(0)}k</span>
                            <span className={depositGap > 0 ? "text-rose-500" : "text-emerald-500"}>
                                {depositGap > 0 ? `Gap: $${(depositGap/1000).toFixed(0)}k` : "Ready!"}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="flex flex-wrap gap-2">
                        {vision.is_first_home && (
                            <div className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1">
                                <Landmark size={10} /> +${(realAssets.kiwisaver/1000).toFixed(0)}k KiwiSaver
                            </div>
                        )}
                        {vision.is_first_home && (
                            <div className="px-2 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-lg border border-sky-100 flex items-center gap-1">
                                <Banknote size={10} /> +$10k Grant
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SERVICING ANALYSIS */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isServiceable ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-white'
                }`}>
                     <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <Wallet size={18} className="text-indigo-500" /> Servicing Check
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Est. Mortgage Payment</span>
                            <span className="text-lg font-black text-slate-900">
                                ${Math.round(monthlyMortgagePayment).toLocaleString()} <span className="text-xs font-normal text-slate-400">/mo</span>
                            </span>
                        </div>

                        <div className="relative pt-4">
                             <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400">Affordability limit (~40% Income)</div>
                             <div className="h-2 w-full bg-slate-100 rounded-full mt-1 relative">
                                 {/* Limit Line */}
                                 <div 
                                    className="absolute top-[-4px] bottom-[-4px] w-1 bg-slate-300 z-10" 
                                    style={{ left: '60%' }} // Visual anchor
                                 />
                                 
                                 {/* Usage Bar - normalized so 60% is the limit visually */}
                                 <div 
                                    className={`h-full rounded-full transition-all ${isServiceable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(100, (monthlyMortgagePayment / (maxAffordablePayment * 1.5)) * 100)}%` }}
                                 />
                             </div>
                             <div className="flex justify-between mt-1 text-[10px] font-bold">
                                 <span className="text-slate-400">0</span>
                                 <span className={isServiceable ? 'text-emerald-600' : 'text-rose-600'}>
                                     {Math.round((monthlyMortgagePayment / (realAssets.monthly_income || 1)) * 100)}% of Income
                                 </span>
                             </div>
                        </div>

                        {!isServiceable && (
                            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex gap-2 items-start">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <p>Payments exceed 40% of reported income. Bank approval may be difficult.</p>
                            </div>
                        )}
                         {isServiceable && (
                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex gap-2 items-start">
                                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                                <p>Payments look manageable within standard lending criteria.</p>
                            </div>
                        )}
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
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">AI Analysis</div>
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

export default HomeGapFeasibilityForm;