import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Info, AlertCircle, TrendingUp, Target, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import GoalOptimizationPanel from '../../components/goals/GoalOptimizationPanel';
import { getCashFlows } from '../../services/cashFlowService';
import { computeFinancialsFromCashFlows } from '../../utils/financialCalculations';

const GoalsOptimizer = ({ goals, isLoading }) => {
  const [cashFlows, setCashFlows] = useState([]);
  const [loadingCashFlows, setLoadingCashFlows] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    fetchCashFlows();
  }, []);

  const fetchCashFlows = async () => {
    setLoadingCashFlows(true);
    try {
      const data = await getCashFlows();
      setCashFlows(data || []);
    } catch (error) {
      console.error('Failed to fetch cash flows:', error);
      setCashFlows([]);
    } finally {
      setLoadingCashFlows(false);
    }
  };

  const financials = useMemo(() => {
    if (!cashFlows || cashFlows.length === 0) return null;
    return computeFinancialsFromCashFlows(cashFlows);
  }, [cashFlows]);

  const totalActiveGoals = goals?.filter(g => 
    g.status !== 'completed' && g.status !== 'Finished'
  ).length || 0;

  const totalTargetAmount = goals?.reduce((sum, g) => sum + (g.target_amount || 0), 0) || 0;
  const loading = isLoading || loadingCashFlows;

  const kpiStats = [
    { label: "Active Goals", value: totalActiveGoals, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Target", value: `$${(totalTargetAmount / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Monthly Surplus", value: financials ? `$${financials.monthly_surplus_total || 0}` : '—', icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* High Density Status Bar (Replaces Title & Large Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        
        {/* Left: Identity & Status */}
        <div className="flex items-center gap-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-6">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200 flex-shrink-0">
               <Sparkles size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optimizer</div>
              <div className="text-sm font-bold text-slate-900">Ready</div>
            </div>
        </div>

        {/* Middle: Compact KPI Stats */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 flex-1 w-full md:w-auto justify-start md:justify-start">
           {kpiStats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={14} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</div>
                <div className="text-base font-bold text-slate-800 leading-none">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: How It Works Toggle */}
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ml-auto md:ml-0 ${
             showInfo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <Info size={14} />
          <span>How It Works</span>
          {showInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible AI Explanation Section */}
      {showInfo && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-6">
             <Sparkles size={18} className="text-indigo-600" />
             <h3 className="text-base font-bold text-indigo-900">Optimization Logic</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-6 left-0 w-full h-0.5 bg-indigo-200/50 -z-10 transform translate-y-1/2"></div>

            {[
              { step: 1, title: "Calculate", desc: "Computes ideal monthly contribution based on TVM & horizon." },
              { step: 2, title: "Prioritize", desc: "Weights goals by urgency (due date) and importance (Need/Want)." },
              { step: 3, title: "Optimize", desc: "Distributes surplus using linear programming or heuristic solver." },
              { step: 4, title: "Project", desc: "Generates multi-year cash flow timeline with growth & inflation." }
            ].map((item) => (
              <div key={item.step} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100 shadow-sm relative">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mb-3 shadow-md shadow-indigo-200">
                  {item.step}
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Optimizer Content */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Loading financial data...</p>
        </div>
      ) : !financials ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="bg-amber-100 p-4 rounded-full mb-4">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-amber-900 mb-2">Cash Flow Data Required</h3>
          <p className="text-amber-700 mb-6 max-w-md">
            The optimizer needs your income and expense data to calculate your monthly surplus.
          </p>
          <a 
            href="/wealth?tab=cashflow" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
          >
            <TrendingUp size={18} />
            Go to Cash Flow
          </a>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
          <div className="bg-white p-6 rounded-full inline-block mb-6 shadow-sm">
            <Sparkles size={48} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Goals Yet</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Create your first goal to start optimizing your allocations and visualizing your future.
          </p>
          <a 
            href="/goals/new/ai" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Sparkles size={18} />
            Create First Goal
          </a>
        </div>
      ) : (
        <GoalOptimizationPanel
          goalContext={null}
          goalsSnapshot={goals}
          cashFlowsSnapshot={cashFlows}
          financialsSnapshot={financials}
          onApplyRecommendation={null}
        />
      )}
    </div>
  );
};

export default GoalsOptimizer;
