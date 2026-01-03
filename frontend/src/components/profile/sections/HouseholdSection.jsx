import { MapPin, Briefcase, Users, Calendar, Sparkles } from 'lucide-react';

const HouseholdSection = ({ data, onChange }) => {
  const regions = [
    'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 
    'Hawke\'s Bay', 'Taranaki', 'Manawatu-Whanganui', 'Wellington', 
    'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 
    'Otago', 'Southland'
  ];

  const statuses = ['Single', 'Couple', 'Family', 'Other'];

  const updateField = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Household & Context</h2>
        <p className="text-slate-500 text-sm mt-1">Socio-economic background that shapes your financial advice</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Household Status */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Users size={14} /> Household Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateField('status', s)}
                className={`
                  px-6 py-3 rounded-2xl text-sm font-bold transition-all
                  ${data.status === s 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Dependents */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Number of Dependents</label>
          <div className="flex items-center gap-4">
             <button 
               type="button"
               onClick={() => updateField('dependents', Math.max(0, (data.dependents || 0) - 1))}
               className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
             >-</button>
             <div className="flex-1 bg-slate-50 h-12 rounded-xl flex items-center justify-center font-black text-slate-900">
               {data.dependents || 0}
             </div>
             <button 
               type="button"
               onClick={() => updateField('dependents', (data.dependents || 0) + 1)}
               className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
             >+</button>
          </div>
        </div>

        {/* Region */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <MapPin size={14} /> New Zealand Region
          </label>
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.region || 'Auckland'}
            onChange={(e) => updateField('region', e.target.value)}
          >
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Occupation */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Briefcase size={14} /> Occupation
          </label>
          <input 
            type="text" 
            placeholder="e.g. Software Engineer"
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.occupation || ''}
            onChange={(e) => updateField('occupation', e.target.value)}
          />
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Calendar size={14} /> Date of Birth
          </label>
          <input 
            type="date" 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all"
            value={data.dob ? new Date(data.dob).toISOString().split('T')[0] : ''}
            onChange={(e) => updateField('dob', e.target.value)}
          />
        </div>

        {/* Vision Statement */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Sparkles size={14} className="text-brand-500" /> Financial Vision Statement
          </label>
          <textarea 
            placeholder="e.g. I want to achieve financial independence by 45 and focus on sustainable living while traveling once a year..."
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all shadow-inner min-h-[120px] resize-none"
            value={data.statement || ''}
            onChange={(e) => updateField('statement', e.target.value)}
          />
          <p className="text-[10px] text-slate-400 italic mt-1 ml-1">
            * This statement is used as a core context for AI Advisor to align its suggestions with your long-term life vision.
          </p>
        </div>
      </div>

      <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100">
         <p className="text-xs text-brand-700 font-medium leading-relaxed">
           <span className="font-bold">Pro Tip:</span> Your region and household status allow the AI to cross-reference local property market trends and tax-efficient structures for families.
         </p>
      </div>
    </div>
  );
};

export default HouseholdSection;

