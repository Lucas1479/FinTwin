import { Eye, EyeOff, BrainCircuit, Users, Lock, ShieldCheck } from 'lucide-react';

const PrivacySecuritySection = ({ data, onChange, onOpenPasswordModal }) => {
  const updateField = (field, value) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Privacy & Security</h2>
        <p className="text-slate-500 text-sm mt-1">Control how your financial data is handled and displayed</p>
      </div>

      {/* Interface Privacy */}
      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${data.isPrivateMode ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-white text-slate-400 border border-slate-100'}`}>
               {data.isPrivateMode ? <EyeOff size={24} /> : <Eye size={24} />}
            </div>
            <div>
               <p className="text-sm font-bold text-slate-900">Private Mode (Incognito)</p>
               <p className="text-xs text-slate-500 mt-1">Hide sensitive numbers and balances on the Dashboard</p>
            </div>
         </div>
         <button 
           type="button"
           onClick={() => updateField('isPrivateMode', !data.isPrivateMode)}
           className={`
             w-14 h-8 rounded-full transition-all relative flex items-center px-1
             ${data.isPrivateMode ? 'bg-brand-500' : 'bg-slate-200'}
           `}
         >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${data.isPrivateMode ? 'translate-x-6' : 'translate-x-0'}`} />
         </button>
      </div>

      {/* AI & Data Sharing */}
      <div className="space-y-6">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">AI & Data Usage</label>
        
        <div className="grid grid-cols-1 gap-4">
           {/* AI Sharing */}
           <div className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:border-brand-100 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BrainCircuit size={20} />
                 </div>
                 <div className="max-w-md">
                    <p className="text-sm font-bold text-slate-900">AI Engine Optimization</p>
                    <p className="text-[10px] text-slate-500 mt-1">Allow the Gemini/DeepSeek engines to analyze your spending patterns to improve local NZ financial advice.</p>
                 </div>
              </div>
              <button 
                type="button"
                onClick={() => updateField('shareWithAI', !data.shareWithAI)}
                className={`
                  w-14 h-8 rounded-full transition-all relative flex items-center px-1
                  ${data.shareWithAI ? 'bg-brand-500' : 'bg-slate-200'}
                `}
              >
                 <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${data.shareWithAI ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>

           {/* Partner Sharing */}
           <div className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:border-brand-100 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users size={20} />
                 </div>
                 <div className="max-w-md">
                    <p className="text-sm font-bold text-slate-900">Partner Pre-Qualification</p>
                    <p className="text-[10px] text-slate-500 mt-1">Enable anonymous syncing with B2B partners for instant pre-approval of loans or fund products.</p>
                 </div>
              </div>
              <button 
                type="button"
                onClick={() => updateField('shareWithPartners', !data.shareWithPartners)}
                className={`
                  w-14 h-8 rounded-full transition-all relative flex items-center px-1
                  ${data.shareWithPartners ? 'bg-brand-500' : 'bg-slate-200'}
                `}
              >
                 <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${data.shareWithPartners ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>
        </div>
      </div>

      {/* Account Security Action */}
      <div className="pt-6 border-t border-slate-50">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              type="button" 
              onClick={onOpenPasswordModal}
              className="flex items-center justify-center gap-3 p-5 bg-white border border-slate-200 rounded-[1.5rem] font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
               <Lock size={18} />
               Change Password
            </button>
            <button type="button" className="flex items-center justify-center gap-3 p-5 bg-white border border-slate-200 rounded-[1.5rem] font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
               <ShieldCheck size={18} />
               Two-Factor Auth
            </button>
         </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-10">
         <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
            <h3 className="text-slate-900 font-black text-lg">Danger Zone</h3>
            <p className="text-slate-500 text-sm mt-1">Once you delete your account, there is no going back. Please be certain.</p>
            <button type="button" className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black shadow-lg shadow-slate-900/20 transition-all">
               Delete Account
            </button>
         </div>
      </div>
    </div>
  );
};

export default PrivacySecuritySection;

