import React, { useState, useEffect } from 'react';
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

    // Mock Data from Context (In real app, comes from user profile)
    const monthlySurplus = goalContext.simulation_data?.user_profile?.monthly_surplus || 1200;

    // Fallback data
    const fundingStructure = recommendation?.funding_structure && recommendation.funding_structure.length > 0 
        ? recommendation.funding_structure 
        : [
            { type: 'KiwiSaver (Growth)', percentage: 60, rationale: 'Simulated Default: Maximize employer match & tax benefits.' },
            { type: 'Managed Fund (High Growth)', percentage: 40, rationale: 'Simulated Default: High liquidity for medium-term access.' }
        ];
    const recommendedRisk = recommendation?.recommended_risk || 'balanced';

    // Local state for structure manipulation
    const [buckets, setBuckets] = useState(fundingStructure);
    
    // Update buckets when recommendation changes
    useEffect(() => {
        if (recommendation?.funding_structure && recommendation.funding_structure.length > 0) {
            setBuckets(recommendation.funding_structure);
        }
    }, [recommendation]);

    // Calculate total percentage to warn user
    const totalPercentage = buckets.reduce((sum, b) => sum + b.percentage, 0);

    // Heuristic: Calculate Asset Mix based on Buckets
    // This connects "Product Structure" to "Asset Allocation"
    const calculateEffectiveAllocation = (currentBuckets) => {
        let stocks = 0, bonds = 0, cash = 0;
        
        currentBuckets.forEach(b => {
            const weight = b.percentage / 100;
            const type = b.type.toLowerCase();
            
            if (type.includes('kiwisaver') || type.includes('managed fund') || type.includes('etf') || type.includes('growth') || type.includes('shares')) {
                // Assume Growth-oriented for MVP unless specified
                if (type.includes('conservative')) {
                     stocks += 20 * weight; bonds += 60 * weight; cash += 20 * weight;
                } else if (type.includes('balanced')) {
                     stocks += 50 * weight; bonds += 40 * weight; cash += 10 * weight;
                } else {
                     // Growth default
                     stocks += 80 * weight; bonds += 15 * weight; cash += 5 * weight;
                }
            } else if (type.includes('term deposit') || type.includes('bonds')) {
                bonds += 90 * weight;
                cash += 10 * weight;
            } else {
                // Savings / Cash
                cash += 100 * weight;
            }
        });
        return { 
            stocks: Math.round(stocks), 
            bonds: Math.round(bonds), 
            cash: Math.round(cash) 
        };
    };

    const effectiveAllocation = calculateEffectiveAllocation(buckets);

    const handleBucketChange = (idx, newVal) => {
        const newBuckets = [...buckets];
        newBuckets[idx] = { ...newBuckets[idx], percentage: Number(newVal) };
        setBuckets(newBuckets);
        
        // Propagate to parent context
        onChange(prev => ({
            ...prev,
            ai_decision: {
                ...prev.ai_decision,
                strategy_recommendation: {
                    ...prev.ai_decision?.strategy_recommendation,
                    funding_structure: newBuckets,
                    target_asset_allocation: calculateEffectiveAllocation(newBuckets)
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
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed max-w-2xl font-medium">
                        "{aiStrategyRationale || aiRationale || "I've designed a structure that maximizes your employer match while keeping some funds liquid."}"
                    </p>
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
                            Allocating your estimated <strong>${monthlySurplus}/mo</strong> surplus.
                        </p>
                    </div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${totalPercentage === 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        Total: {totalPercentage}%
                    </div>
                </div>

                <div className="space-y-4">
                    {buckets.map((bucket, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h5 className="font-bold text-slate-900">{bucket.type}</h5>
                                    <p className="text-xs text-slate-500">{bucket.rationale?.slice(0, 80)}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-600">${Math.round(monthlySurplus * (bucket.percentage / 100))}</div>
                                    <div className="text-xs text-slate-400 font-bold">per month</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0" max="100" step="5"
                                    value={bucket.percentage}
                                    onChange={(e) => handleBucketChange(idx, e.target.value)}
                                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="w-12 text-right font-bold text-slate-700">
                                    {bucket.percentage}%
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {buckets.length === 0 && (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                            No funding structure recommended yet.
                        </div>
                    )}
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
