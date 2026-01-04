import { Shield, TrendingUp, AlertTriangle, Target } from 'lucide-react';

const RiskStrategySection = ({ data, onChange }) => {
  const riskLevels = [
    { id: 'Conservative', name: 'Conservative', desc: 'Focus on stability and capital preservation.', color: 'bg-blue-500', icon: Shield },
    { id: 'Balanced', name: 'Balanced', desc: 'A mix of growth and defensive assets.', color: 'bg-green-500', icon: Target },
    { id: 'Growth', name: 'Growth', desc: 'Higher returns with moderate volatility.', color: 'bg-brand-500', icon: TrendingUp },
    { id: 'High Growth', name: 'High Growth', desc: 'Maximum growth potential, high risk.', color: 'bg-orange-500', icon: AlertTriangle },
  ];

  const updateRisk = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Risk & Strategy</h2>
        <p className="text-slate-500 text-sm mt-1">Define your investment personality and AI-driven guardrails</p>
      </div>

      {/* Global Risk Tier */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Overall Risk Tolerance</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskLevels.map((risk) => {
            const Icon = risk.icon;
            const isSelected = data.level === risk.id;
            return (
              <button
                key={risk.id}
                type="button"
                onClick={() => updateRisk('level', risk.id)}
                className={`
                  flex items-start gap-4 p-5 rounded-3xl border-2 transition-all text-left group
                  ${isSelected 
                    ? `border-brand-500 bg-brand-50/50 shadow-md` 
                    : 'border-slate-100 bg-white hover:border-slate-200'}
                `}
              >
                <div className={`p-3 rounded-2xl ${isSelected ? risk.color + ' text-white' : 'bg-slate-50 text-slate-400'} transition-colors`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{risk.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{risk.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantitative Limits */}
      <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Max Drawdown Allowed</label>
            <span className="text-lg font-black text-slate-900">{data.maxDrawdown}%</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="50" 
            step="5"
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
            value={data.maxDrawdown || 20}
            onChange={(e) => updateRisk('maxDrawdown', Number(e.target.value))}
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
            <span>5% (Strict)</span>
            <span>50% (High Risk)</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Volatility Tolerance</label>
            <span className="text-lg font-black text-slate-900">±{data.volatilityTolerance}%</span>
          </div>
          <input 
            type="range" 
            min="2" 
            max="30" 
            step="1"
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
            value={data.volatilityTolerance || 15}
            onChange={(e) => updateRisk('volatilityTolerance', Number(e.target.value))}
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
            <span>±2%</span>
            <span>±30%</span>
          </div>
        </div>
      </div>

      {/* Planning Horizons */}
      <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target Retirement Age</label>
          <input 
            type="number" 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.retirementAge || 65}
            onChange={(e) => updateRisk('retirementAge', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Life Expectancy (Planning Age)</label>
          <input 
            type="number" 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.planningAge || 90}
            onChange={(e) => updateRisk('planningAge', Number(e.target.value))}
          />
        </div>
      </div>

      {/* AI Strategy Insights Mini-Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
             <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-bold">AI Strategy Impact</p>
            <p className="text-xs text-slate-400 mt-1">Based on a <span className="text-brand-400">{data.level}</span> profile, the engine will prioritize diversified growth assets with a {data.retirementAge ? data.retirementAge - 30 : 35}-year horizon.</p>
          </div>
      </div>
    </div>
  );
};

export default RiskStrategySection;

