import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { 
  User, 
  Target, 
  Users, 
  Calculator, 
  ArrowRightLeft, 
  Eye, 
  Save, 
  Download,
  CheckCircle2,
  ShieldCheck,
  X
} from 'lucide-react';
import { getUserProfile, updateProfile, exportFinancialData, updatePassword } from '../services/userService';

// Section Components
import RiskStrategySection from '../components/profile/sections/RiskStrategySection';
import HouseholdSection from '../components/profile/sections/HouseholdSection';
import TaxComplianceSection from '../components/profile/sections/TaxComplianceSection';
import AssetFlowSection from '../components/profile/sections/AssetFlowSection';
import PrivacySecuritySection from '../components/profile/sections/PrivacySecuritySection';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: '', success: false });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Ensure we're sending the structured data
      const payload = {
        name: profile.name,
        riskProfile: profile.riskProfile,
        household: profile.household,
        compliance: profile.compliance,
        allocation: profile.allocation,
        settings: profile.settings,
        privacy: profile.privacy,
        security: profile.security,
      };
      const result = await updateProfile(payload);
      setProfile(result);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ ...passwordStatus, error: 'New passwords do not match' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ ...passwordStatus, error: 'Password must be at least 6 characters' });
      return;
    }

    setPasswordStatus({ ...passwordStatus, loading: true, error: '', success: false });
    try {
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordStatus({ loading: false, error: '', success: true });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordStatus({ ...passwordStatus, success: false });
      }, 2000);
    } catch (err) {
      setPasswordStatus({ 
        loading: false, 
        error: err.response?.data?.message || 'Failed to update password', 
        success: false 
      });
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: User, description: 'Basic identity & app settings' },
    { id: 'risk', name: 'Risk & Strategy', icon: Target, description: 'Investment personality & limits' },
    { id: 'household', name: 'Household', icon: Users, description: 'Family, region & occupation' },
    { id: 'tax', name: 'Tax & Compliance', icon: Calculator, description: 'PIR rates & KiwiSaver' },
    { id: 'flow', name: 'Asset Flow', icon: ArrowRightLeft, description: 'Decision priorities & buffers' },
    { id: 'privacy', name: 'Privacy & Security', icon: Eye, description: 'Data sharing & protection' },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto animate-fade-in px-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage your FinTwin profile and AI engine parameters</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={exportFinancialData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[11px] hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={14} />
              Export Passport
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[11px] transition-all shadow-lg
                ${saveSuccess ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-brand-500 text-white shadow-brand-500/20 hover:shadow-brand-500/30'}
                ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : saveSuccess ? (
                <CheckCircle2 size={14} />
              ) : (
                <Save size={14} />
              )}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 pb-20">
          {/* Top Horizontal Navigation */}
          <div className="bg-white rounded-2xl border border-slate-100 p-1.5 shadow-lg shadow-slate-200/30 sticky top-4 z-20">
            <div className="flex items-center overflow-x-auto no-scrollbar gap-1 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group
                      ${isActive 
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-500'} />
                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {tab.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area - Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-10 min-h-[600px] transition-all">
                {activeTab === 'general' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 text-2xl font-black shadow-inner">
                          {profile.name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <button className="absolute -bottom-1 -right-1 bg-white border border-slate-200 p-2 rounded-lg shadow-lg text-slate-600 hover:text-brand-600 transition-all hover:scale-105">
                          <User size={14} />
                        </button>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Personal Identity</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Manage your public profile and interface preferences</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                          value={profile.name || ''}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                        <input 
                          type="text" 
                          disabled
                          className="w-full bg-slate-100 border-none rounded-xl px-5 py-3.5 text-slate-400 font-bold text-sm cursor-not-allowed"
                          value={profile.username || ''}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          type="email" 
                          disabled
                          className="w-full bg-slate-100 border-none rounded-xl px-5 py-3.5 text-slate-400 font-bold text-sm cursor-not-allowed"
                          value={profile.email || ''}
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50">
                       <h3 className="text-[11px] font-bold text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-widest opacity-60">
                         App Customization
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Interface Theme</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">{profile.settings?.theme || 'Light'}</p>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                               <button 
                                 type="button"
                                 onClick={() => setProfile({...profile, settings: {...profile.settings, theme: 'light'}})}
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${profile.settings?.theme === 'light' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                               >
                                 LIGHT
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setProfile({...profile, settings: {...profile.settings, theme: 'dark'}})}
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${profile.settings?.theme === 'dark' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' : 'text-slate-400 hover:text-slate-600'}`}
                               >
                                 DARK
                               </button>
                            </div>
                          </div>
                          
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Primary Currency</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">{profile.settings?.currency || 'NZD'}</p>
                            </div>
                            <select 
                              className="bg-white border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-brand-500"
                              value={profile.settings?.currency || 'NZD'}
                              onChange={(e) => setProfile({...profile, settings: {...profile.settings, currency: e.target.value}})}
                            >
                               <option value="NZD">NZD ($)</option>
                               <option value="USD">USD ($)</option>
                               <option value="AUD">AUD ($)</option>
                            </select>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'risk' && (
                  <RiskStrategySection 
                    data={profile.riskProfile || {}} 
                    onChange={(riskData) => setProfile({...profile, riskProfile: riskData})} 
                  />
                )}

                {activeTab === 'household' && (
                  <HouseholdSection 
                    data={profile.household || {}} 
                    onChange={(houseData) => setProfile({...profile, household: houseData})} 
                  />
                )}

                {activeTab === 'tax' && (
                  <TaxComplianceSection 
                    data={profile.compliance || {}} 
                    onChange={(taxData) => setProfile({...profile, compliance: taxData})} 
                  />
                )}

                {activeTab === 'flow' && (
                  <AssetFlowSection 
                    data={profile.allocation || {}} 
                    onChange={(allocData) => setProfile({...profile, allocation: allocData})} 
                  />
                )}

                {activeTab === 'privacy' && (
                  <PrivacySecuritySection 
                    data={{...(profile.privacy || {}), ...(profile.security || {})}} 
                    onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
                    onChange={(combinedData) => {
                       const { isPrivateMode, shareWithAI, shareWithPartners, ...securityData } = combinedData;
                       setProfile({
                         ...profile, 
                         privacy: { isPrivateMode, shareWithAI, shareWithPartners },
                         security: { ...profile.security, ...securityData }
                       });
                    }} 
                  />
                )}
                
                {/* Global Security Callout (Moved from internal sidebar to bottom of content) */}
                <div className="mt-16 pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xl shadow-slate-900/20">
                         <ShieldCheck size={32} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-none mb-2">Your Financial Identity is Protected</h3>
                        <p className="text-slate-500 text-sm max-w-lg">Bank-level encryption and NZ Privacy Act compliant data handling. Your data is your own.</p>
                      </div>
                   </div>
                   <button className="px-6 py-3 bg-slate-50 text-slate-600 font-bold text-xs rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">
                      Security Audit Log
                   </button>
                </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-8 border-b border-slate-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-500 mt-1">Ensure your account stays secure</p>
                </div>
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                {passwordStatus.error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                    {passwordStatus.error}
                  </div>
                )}
                {passwordStatus.success && (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-xs font-bold">
                    Password updated successfully!
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition-all shadow-inner"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={passwordStatus.loading}
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {passwordStatus.loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Lock size={16} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
