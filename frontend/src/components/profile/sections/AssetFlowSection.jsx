import { ArrowDownCircle, ArrowUpCircle, Shield, Briefcase, Info } from 'lucide-react';

const AssetFlowSection = ({ data, onChange }) => {
  const flowStyles = [
    { id: 'Aggressive Debt', name: 'Debt Crusher', desc: 'Prioritize paying down debt over investing.', icon: ArrowDownCircle, color: 'text-red-500' },
    { id: 'Balanced', name: 'Balanced Flow', desc: 'Even split between debt repayment and wealth building.', icon: Briefcase, color: 'text-brand-500' },
    { id: 'Aggressive Invest', name: 'Wealth Builder', desc: 'Prioritize long-term investments over low-interest debt.', icon: ArrowUpCircle, color: 'text-green-500' },
  ];

  const updateField = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Asset Flow & Priorities</h2>
        <p className="text-slate-500 text-sm mt-1">Determine how your surplus cash is distributed by the AI engine</p>
      </div>

      {/* Debt vs Invest Strategy */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Allocation Strategy</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {flowStyles.map((style) => {
            const Icon = style.icon;
            const isSelected = data.debtVsInvest === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => updateField('debtVsInvest', style.id)}
                className={`
                  p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col h-full
                  ${isSelected 
                    ? 'border-brand-500 bg-brand-50/50 shadow-md' 
                    : 'border-slate-50 bg-white hover:border-slate-100'}
                `}
              >
                <Icon size={32} className={`mb-4 ${style.color} ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                <p className={`font-bold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{style.name}</p>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed flex-grow">{style.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Buffer */}
      <div className="pt-6 border-t border-slate-50 space-y-6">
        <div className="flex justify-between items-end px-1">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-brand-500" /> Emergency Buffer
            </label>
            <p className="text-[10px] text-slate-500 font-medium">Months of expenses kept in cash before investing</p>
          </div>
          <span className="text-2xl font-black text-slate-900">{data.emergencyBufferMonths || 3} <span className="text-xs text-slate-400">Months</span></span>
        </div>
        
        <div className="flex gap-2">
           {[1, 2, 3, 6, 12].map(m => (
             <button
               key={m}
               type="button"
               onClick={() => updateField('emergencyBufferMonths', m)}
               className={`
                 flex-1 py-4 rounded-2xl text-sm font-black transition-all
                 ${data.emergencyBufferMonths === m 
                   ? 'bg-slate-900 text-white shadow-lg' 
                   : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
               `}
             >
               {m}
             </button>
           ))}
        </div>
      </div>

      {/* Goal Priority Logic */}
      <div className="pt-6 border-t border-slate-50 space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Multi-Goal Logic</label>
          <Info size={14} className="text-slate-300" />
        </div>
        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
           <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200/50">
              <p className="text-xs font-bold text-slate-700">Conflict Resolution Mode</p>
              <div className="flex bg-white p-1 rounded-xl shadow-inner border border-slate-100">
                  <button type="button" className="px-3 py-1 bg-brand-500 text-white text-[10px] font-bold rounded-lg shadow-sm">Proportional</button>
                  <button type="button" className="px-3 py-1 text-slate-400 text-[10px] font-bold rounded-lg hover:text-slate-600">Sequential</button>
              </div>
           </div>
           <p className="text-[10px] text-slate-500 italic leading-relaxed">
             *Proportional mode will distribute your surplus monthly contribution across all active goals based on their individual priority weights.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AssetFlowSection;

