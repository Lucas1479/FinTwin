import { Calculator, ShieldCheck, Info } from 'lucide-react';
import InfoTooltip from '../../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../../constants/helpAnchors'; // Import Registry

const TaxComplianceSection = ({ data, onChange }) => {
  const pirRates = [
    { value: 0.105, label: '10.5%', desc: 'Income up to $14,000' },
    { value: 0.175, label: '17.5%', desc: 'Income $14,001 - $48,000' },
    { value: 0.28, label: '28.0%', desc: 'Income over $48,000' },
  ];

  const kiwiRates = [0, 0.03, 0.04, 0.06, 0.08, 0.10];

  const updateField = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Tax & Compliance</h2>
            <InfoTooltip 
                content="Your tax settings (PIR, Residency) ensure accurate Net Return projections."
                anchor={HELP_ANCHORS.USER_PROFILE.COMPLIANCE} 
            />
          </div>
          <p className="text-slate-500 text-sm mt-1">Regulatory settings for NZ financial products</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
           <ShieldCheck size={12} /> NZ Compliant
        </div>
      </div>

      {/* PIR Rate Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prescribed Investor Rate (PIR)</label>
          <InfoTooltip 
            content="PIR is the tax rate applied to your PIE (Portfolio Investment Entity) investments, like most KiwiSaver funds."
            anchor={HELP_ANCHORS.USER_PROFILE.COMPLIANCE} 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pirRates.map((rate) => {
            const isSelected = data.pirRate === rate.value;
            return (
              <button
                key={rate.value}
                type="button"
                onClick={() => updateField('pirRate', rate.value)}
                className={`
                  p-5 rounded-3xl border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-brand-500 bg-brand-50/50 shadow-md' 
                    : 'border-slate-100 bg-white hover:border-slate-200'}
                `}
              >
                <p className={`text-lg font-black ${isSelected ? 'text-brand-600' : 'text-slate-900'}`}>{rate.label}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">{rate.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* KiwiSaver Contribution */}
      <div className="pt-6 border-t border-slate-50 space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">KiwiSaver Contribution Rate</label>
        <div className="flex flex-wrap gap-3">
          {kiwiRates.map((rate) => {
            const isSelected = data.kiwiSaverContribution === rate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => updateField('kiwiSaverContribution', rate)}
                className={`
                  min-w-[70px] py-4 rounded-2xl text-sm font-black transition-all
                  ${isSelected 
                    ? 'bg-slate-900 text-white shadow-xl' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                `}
              >
                {rate === 0 ? 'None' : (rate * 100) + '%'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tax Residency</label>
          <input 
            type="text" 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.taxResidency || 'New Zealand'}
            onChange={(e) => updateField('taxResidency', e.target.value)}
          />
        </div>
      </div>

      {/* Tax Wizard Callout */}
      <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between group cursor-pointer">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
               <Calculator size={20} className="text-brand-400" />
            </div>
            <div>
               <p className="text-sm font-bold">Not sure about your PIR?</p>
               <p className="text-[10px] text-slate-400">Launch the 2-step Tax Assistant</p>
            </div>
         </div>
         <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand-500 transition-all">
            <Calculator size={14} />
         </div>
      </div>
    </div>
  );
};

export default TaxComplianceSection;

