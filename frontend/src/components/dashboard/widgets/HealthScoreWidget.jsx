import { TrendingUp, Activity, ShieldCheck } from 'lucide-react';

const HealthScoreWidget = ({ netWorth, liquidCapital, healthScore = 85 }) => {
  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Net Worth Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-brand-500/10 transition-all duration-500">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Net Worth</p>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={16} />
          </div>
        </div>
        <h3 className="text-3xl font-black text-slate-900 leading-none">
          {formatCurrency(netWorth)}
        </h3>
        <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
          <span className="text-emerald-600 font-bold">+2.4%</span> from last month
        </p>
      </div>

      {/* Liquid Capital Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-brand-500/10 transition-all duration-500">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquid Capital</p>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Activity size={16} />
          </div>
        </div>
        <h3 className="text-3xl font-black text-slate-900 leading-none">
          {formatCurrency(liquidCapital)}
        </h3>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
            style={{ width: `${Math.min(100, (liquidCapital / netWorth) * 100)}%` }}
          />
        </div>
      </div>

      {/* AI Health Score Card */}
      <div className="bg-brand-600 rounded-3xl p-6 text-white shadow-xl shadow-brand-600/20 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-brand-100 uppercase tracking-widest">FinTwin Health</p>
            <span className="bg-white/20 text-[10px] font-bold px-2 py-1 rounded-lg">LIVE</span>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black leading-none">{healthScore}</h3>
            <span className="text-brand-200 font-bold text-sm mb-1">/100</span>
          </div>
          <p className="text-xs text-brand-100 mt-3 font-medium opacity-80 italic">
            "Your buy-home goal has a 92% feasibility."
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthScoreWidget;

