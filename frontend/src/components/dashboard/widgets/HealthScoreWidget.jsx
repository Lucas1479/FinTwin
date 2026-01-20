import { TrendingUp, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import InfoTooltip from '../../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../../constants/helpAnchors'; // Import Registry

const HealthScoreWidget = ({ netWorth, liquidCapital, healthScore = 85, totalAssets, totalLiabilities }) => {
  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 group overflow-hidden relative transition-all duration-500 hover:shadow-brand-500/10">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
        <ShieldCheck size={240} />
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative z-10">
        
        {/* 1. Primary Metric: Net Worth */}
        <div className="flex-1 w-full lg:w-auto border-b lg:border-b-0 lg:border-r border-slate-100 pb-8 lg:pb-0 lg:pr-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Pulse</p>
                <InfoTooltip 
                    content="Your real-time Net Worth snapshot. Assets minus Liabilities."
                    anchor={HELP_ANCHORS.WEALTH.NET_WORTH} 
                />
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left duration-700 delay-300">
              <TrendingUp size={10} /> +2.4%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(netWorth)}
            </h2>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">NZD</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest opacity-60">Total Net Worth Estimate</p>
        </div>

        {/* 2. Secondary Metrics Grid */}
        <div className="flex-[1.5] w-full grid grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Liquid Capital */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Activity size={14} strokeWidth={3} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Liquidity</p>
            </div>
            <p className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(liquidCapital)}</p>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (liquidCapital / (netWorth || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Assets */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <ArrowUpRight size={14} strokeWidth={3} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Assets</p>
            </div>
            <p className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(totalAssets || 0)}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">Stored Value</p>
          </div>

          {/* Liabilities */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-500">
              <ArrowDownRight size={14} strokeWidth={3} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Liabilities</p>
            </div>
            <p className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(totalLiabilities || 0)}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">Leverage: {totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0}%</p>
          </div>

          {/* AI Health Score */}
          <div className="bg-primary/5 rounded-2xl p-4 flex flex-col justify-center border border-primary/10 hover:bg-primary hover:text-white transition-all duration-500 group/score relative">
            <div className="absolute top-2 right-2">
                <InfoTooltip 
                    content="Score derived from Solvency (40%), Liquidity (30%), and Growth (30%)."
                    anchor={HELP_ANCHORS.DASHBOARD.HEALTH_SCORE} 
                    className="text-primary group-hover/score:text-white"
                />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1 text-center group-hover/score:text-white">AI Health</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-black">{healthScore}</span>
              <span className="text-[10px] font-bold opacity-60 group-hover/score:text-white">/100</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HealthScoreWidget;

