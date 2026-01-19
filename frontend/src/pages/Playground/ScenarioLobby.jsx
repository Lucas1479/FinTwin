import React, { useState, useEffect } from 'react';
import { PlusCircle, Play, Copy, Trash2, Edit2, UserCircle2, Briefcase, TrendingUp, X, ChevronDown, ChevronUp, Wallet, Landmark, TrendingDown, Info, ShieldCheck, Save, BarChart3, Activity, Target } from 'lucide-react';
import InfoTooltip from '../../components/common/InfoTooltip';
import { HELP_ANCHORS } from '../../constants/helpAnchors';

const ScenarioLobby = ({
  onEditScenario,
  onCreateScenario,
  onDeleteScenario,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  profiles,
  scenarios,
  goals = [],
  goalsLoading,
  loading
}) => {
  const [expandedProfileId, setExpandedProfileId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  const handleUpdateProfile = async (updatedProfile) => {
    if (!onUpdateProfile) return;
    try {
      await onUpdateProfile(updatedProfile);
    } catch (err) {
      console.error('[ScenarioLobby] Failed to update background', err);
    }
  };

  const handleDeleteProfile = async (e, profileId) => {
    e?.stopPropagation?.();
    if (!onDeleteProfile || !profileId) return;
    if (!window.confirm('Delete this background?')) return;
    try {
      await onDeleteProfile(profileId);
    } catch (err) {
      console.error('[ScenarioLobby] Failed to delete background', err);
    }
  };

  const handleCreateProfile = async (newProfile) => {
    if (!onCreateProfile) return;
    try {
      await onCreateProfile(newProfile);
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('[ScenarioLobby] Failed to create background', err);
    }
  };

  const handleCreateScenario = async (payload) => {
    if (!onCreateScenario) return;
    try {
      await onCreateScenario(payload);
      setIsPathModalOpen(false);
    } catch (err) {
      console.error('[ScenarioLobby] Failed to create scenario', err);
    }
  };

  // loading state is now passed from parent
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* 1. Full-Width Background Profiles */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCircle2 size={18} strokeWidth={2.5} />
             </div>
             <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Simulation Backgrounds
                </h2>
                <InfoTooltip 
                    content="A snapshot of your identity, financials, and risk profile. Create different 'Versions of You' to test."
                    anchor={HELP_ANCHORS.PLAYGROUND.BACKGROUNDS} 
                />
             </div>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95 group"
          >
            <PlusCircle size={14} className="group-hover:text-indigo-600 transition-colors" />
            New Background
          </button>
        </div>

        <div className="space-y-4">
          {profiles.map(profile => (
            <ProfileRow 
              key={profile.id} 
              profile={profile} 
              isExpanded={expandedProfileId === profile.id}
              onToggle={() => setExpandedProfileId(expandedProfileId === profile.id ? null : profile.id)}
              onUpdate={handleUpdateProfile}
              onDelete={handleDeleteProfile}
            />
          ))}
        </div>
      </section>

      {/* 2. Scenarios List */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2 pt-8 border-t border-slate-200/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Play size={18} strokeWidth={2.5} fill="currentColor" className="ml-0.5" />
             </div>
             <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Saved Life Paths
                </h2>
                <InfoTooltip 
                    content="A 'What-If' simulation connecting a Background to a specific Goal to test feasibility."
                    anchor={HELP_ANCHORS.PLAYGROUND.SCENARIOS} 
                />
             </div>
          </div>
          <button
            onClick={() => setIsPathModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <PlusCircle size={14} />
            Run New Path
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map(scenario => (
            <div key={scenario.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group relative overflow-hidden flex flex-col h-full">
              
              {/* Header Status */}
              <div className="flex justify-between items-start mb-5">
                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  scenario.status === 'safe' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {scenario.status}
                </div>
                
                {/* Linked Entities Badge */}
                <div className="flex gap-1">
                   {scenario.goalId && (
                      <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600" title="Has Goal">
                         <Target size={12} />
                      </div>
                   )}
                   <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400" title="Has Profile">
                         <UserCircle2 size={12} />
                   </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                  {scenario.name}
              </h3>
              
              <div className="text-xs text-slate-500 mb-6 font-medium">
                  Based on <span className="text-slate-700 font-semibold">{profiles.find(p => p.id === scenario.profileId)?.name || 'Unknown'}</span>
              </div>

              <div className="mt-auto space-y-5">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Survival Probability</span>
                    <span className={(scenario.successProbability || 0) >= 70 ? 'text-emerald-600' : 'text-rose-600'}>{(scenario.successProbability || 0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${(scenario.successProbability || 0) >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${(scenario.successProbability || 0)}%` }} 
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                    <button
                    onClick={() => onEditScenario(scenario.id)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                    Enter Decision Space
                    <TrendingUp size={14} className="text-slate-400 group-hover/btn:text-indigo-600 transition-colors" />
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete this scenario?')) onDeleteScenario(scenario.id);
                        }}
                        className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add New Placeholder Card */}
          <button 
             onClick={() => setIsPathModalOpen(true)}
             className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-[280px]"
          >
             <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <PlusCircle size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
             </div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Create New Path</span>
          </button>
        </div>
      </section>

      {isProfileModalOpen && (
        <CreateProfileModal 
          onClose={() => setIsProfileModalOpen(false)} 
          onSave={handleCreateProfile}
        />
      )}

      {isPathModalOpen && (
        <CreatePathModal
          profiles={profiles}
          goals={goals}
          goalsLoading={goalsLoading}
          onClose={() => setIsPathModalOpen(false)}
          onSave={handleCreateScenario}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---

const ProfileRow = ({ profile, isExpanded, onToggle, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState('identity'); 
  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const totalAssets = (localProfile.financials.cash || 0) + 
                     (localProfile.financials.investments || 0) + 
                     (localProfile.financials.property || 0) + 
                     (localProfile.financials.pension || 0);
  const totalLiabilities = (localProfile.financials.mortgage || 0) + 
                          (localProfile.financials.otherDebt || 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = (totalLiabilities / Math.max(totalAssets, 1)) * 100;

  const handleFieldChange = (section, field, value) => {
    setLocalProfile(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  return (
    <div className={`bg-white rounded-[1.5rem] border transition-all duration-300 ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-50/50' : 'border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md'}`}>
      <div className="px-6 py-5 flex items-center justify-between cursor-pointer group" onClick={onToggle}>
        <div className="flex items-center gap-6 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-indigo-600 text-white scale-110 rotate-3' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
            <UserCircle2 size={20} />
          </div>
          <div className={`grid flex-1 gap-x-8 gap-y-4 transition-all duration-500 ${isExpanded ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <Stat label="Background Name" value={profile.name} isPrimary />
            <Stat label="Net Worth Base" value={`$${netWorth.toLocaleString()}`} />
            <Stat label="Age / Ret." value={`${profile.identity.age} / ${profile.identity.retirementAge}`} />
            <Stat label="Annual Income" value={`$${profile.income.annualGross.toLocaleString()}`} isIndigo />
            
            {/* Extended fields shown only when expanded */}
            {isExpanded && (
              <>
                <Stat label="Risk Profile" value={profile.preferences.riskTolerance} />
                <Stat label="Cash Reserves" value={`$${localProfile.financials.cash.toLocaleString()}`} />
                <Stat label="Debt Ratio" value={`${debtRatio.toFixed(1)}%`} isRose={debtRatio > 40} />
                <Stat label="Growth Exp." value={`${profile.income.growthRate}%`} />
                <Stat label="Max Drawdown" value={`${profile.preferences.maxDrawdown || 20}%`} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start mt-1">
          <button onClick={(e) => onDelete(e, profile.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-300'}`}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-500">
          <div className="border-t border-slate-50 pt-6 mt-2">
            <div className="flex gap-2 mb-8 bg-slate-50/50 p-1.5 rounded-[1rem] w-fit border border-slate-100">
              <TabBtn id="identity" label="Identity" active={activeTab === 'identity'} onClick={setActiveTab} icon={<Info size={14} />} />
              <TabBtn id="financials" label="Balance Sheet" active={activeTab === 'financials'} onClick={setActiveTab} icon={<Wallet size={14} />} />
              <TabBtn id="income" label="Earnings" active={activeTab === 'income'} onClick={setActiveTab} icon={<Landmark size={14} />} />
              <TabBtn id="preferences" label="Risk Profile" active={activeTab === 'preferences'} onClick={setActiveTab} icon={<ShieldCheck size={14} />} />
            </div>

            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {activeTab === 'identity' && (
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <Field label="Full Name" value={localProfile.name} icon={<UserCircle2 size={16}/>} onChange={(v) => setLocalProfile({...localProfile, name: v})} />
                    <Field label="Current Age" value={localProfile.identity.age} type="number" min={18} max={80} step={1} icon={<Info size={16}/>} onChange={(v) => handleFieldChange('identity', 'age', v)} />
                    <Field label="Target Retirement" value={localProfile.identity.retirementAge} type="number" min={40} max={85} step={1} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('identity', 'retirementAge', v)} />
                    <Field label="Life Expectancy" value={localProfile.identity.lifeExpectancy} type="number" min={70} max={110} step={1} icon={<Play size={16}/>} onChange={(v) => handleFieldChange('identity', 'lifeExpectancy', v)} />
                  </div>
                )}
                {activeTab === 'financials' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                      <Field label="Liquid Cash ($)" value={localProfile.financials.cash} type="number" max={2000000} step={1000} icon={<Wallet size={16}/>} onChange={(v) => handleFieldChange('financials', 'cash', v)} />
                      <Field label="Brokerage Portfolio ($)" value={localProfile.financials.investments} type="number" max={5000000} step={5000} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('financials', 'investments', v)} />
                      <Field label="Real Estate Equity ($)" value={localProfile.financials.property} type="number" max={10000000} step={10000} icon={<Landmark size={16}/>} onChange={(v) => handleFieldChange('financials', 'property', v)} />
                      <Field label="Pension Assets ($)" value={localProfile.financials.pension} type="number" max={2000000} step={1000} icon={<Briefcase size={16}/>} onChange={(v) => handleFieldChange('financials', 'pension', v)} />
                    </div>
                    <div className="pt-8 border-t border-slate-100 grid grid-cols-2 gap-x-10 gap-y-8">
                      <Field label="Mortgage Balance ($)" value={localProfile.financials.mortgage} type="number" max={5000000} step={10000} color="rose" icon={<TrendingDown size={16}/>} onChange={(v) => handleFieldChange('financials', 'mortgage', v)} />
                      <Field label="Consumer Debt ($)" value={localProfile.financials.otherDebt} type="number" max={500000} step={1000} color="rose" icon={<Trash2 size={16}/>} onChange={(v) => handleFieldChange('financials', 'otherDebt', v)} />
                    </div>
                  </div>
                )}
                {activeTab === 'income' && (
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <Field label="Gross Annual Salary ($)" value={localProfile.income.annualGross} type="number" max={1000000} step={1000} icon={<Landmark size={16}/>} onChange={(v) => handleFieldChange('income', 'annualGross', v)} />
                    <Field label="Career Growth Rate (%)" value={localProfile.income.growthRate} type="number" min={0} max={20} step={0.5} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('income', 'growthRate', v)} />
                  </div>
                )}
                {activeTab === 'preferences' && (
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-semibold text-slate-700 ml-1 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-indigo-400" strokeWidth={2} />
                        Risk Appetite
                      </label>
                      <select 
                        value={localProfile.preferences.riskTolerance}
                        onChange={(e) => handleFieldChange('preferences', 'riskTolerance', e.target.value)}
                        className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none appearance-none cursor-pointer transition-all text-sm"
                      >
                        <option value="Conservative">Conservative</option>
                        <option value="Balanced">Balanced</option>
                        <option value="Growth">Growth</option>
                        <option value="Aggressive">Aggressive</option>
                      </select>
                    </div>
                    <Field label="Volatility Limit (%)" value={localProfile.preferences.volatilityLimit} type="number" min={0} max={50} step={1} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('preferences', 'volatilityLimit', v)} />
                    <Field label="Max Drawdown Limit (%)" value={localProfile.preferences.maxDrawdown || 20} type="number" min={0} max={100} step={1} icon={<TrendingDown size={16}/>} onChange={(v) => handleFieldChange('preferences', 'maxDrawdown', v)} />
                  </div>
                )}
              </div>

              {/* Minimalist Background Health Sidebar */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 h-full flex flex-col">
                  <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-8 flex items-center gap-3">
                    <Activity size={16} className="text-indigo-500" strokeWidth={2.5} />
                    Background Health
                  </h5>
                  
                  <div className="space-y-8 flex-1">
                    <Metric 
                      label="Liquidity Ratio" 
                      percentage={((localProfile.financials.cash / Math.max(totalAssets, 1)) * 100)} 
                      colorClass="bg-indigo-500" 
                    />
                    <Metric 
                      label="Debt-to-Asset" 
                      percentage={debtRatio} 
                      colorClass={debtRatio > 40 ? 'bg-rose-400' : 'bg-sky-400'} 
                    />
                    <Metric 
                      label="Risk Exposure" 
                      percentage={(( (localProfile.financials.investments + localProfile.financials.pension) / Math.max(totalAssets, 1)) * 100)} 
                      colorClass="bg-fuchsia-500" 
                    />
                  </div>

                  <div className="mt-8">
                    <button 
                      onClick={() => onUpdate(localProfile)} 
                      className="w-full bg-slate-900 text-white font-bold uppercase tracking-widest text-[11px] py-4 rounded-xl hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3"
                    >
                      <Save size={16} /> Commit Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helpers ---

const Metric = ({ label, percentage, colorClass }) => (
  <div className="space-y-2.5">
    <div className="flex justify-between items-end px-0.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-slate-900">{percentage.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-slate-200/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
      <div 
        className={`h-full rounded-full ${colorClass} transition-all duration-1000 shadow-sm`} 
        style={{ width: `${Math.min(percentage, 100)}%` }} 
      />
    </div>
  </div>
);

const Stat = ({ label, value, isPrimary, isIndigo, isRose }) => (
  <div className="flex flex-col min-w-0">
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
    <h4 className={`font-bold text-sm truncate ${
      isPrimary ? 'text-slate-900' : 
      isRose ? 'text-rose-600' : 
      isIndigo ? 'text-indigo-600' :
      'text-slate-700'
    }`}>{value}</h4>
  </div>
);

const TabBtn = ({ id, label, active, onClick, icon }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
    {React.cloneElement(icon, { size: 14, strokeWidth: 2.5 })} {label}
  </button>
);

const Field = ({ label, value, type = "text", onChange, color = "indigo", icon, min = 0, max = 1000000, step = 100 }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
        {icon && React.cloneElement(icon, { size: 14, className: `text-slate-400`, strokeWidth: 2 })}
        {label}
      </label>
      {type === "number" && (
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
          {label.includes('%') ? `${value}%` : `$${value.toLocaleString()}`}
        </span>
      )}
    </div>
    
    <div className="space-y-2">
      {type === "number" ? (
        <>
          <input 
            type="range" 
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600`}
          />
          <div className="relative group/field">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-full opacity-0 group-hover/field:opacity-100 transition-opacity" />
            <input 
              type="number" 
              value={value} 
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
              className={`w-full pl-8 pr-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50/50 focus:bg-white outline-none transition-all text-sm tracking-tight shadow-sm`} 
            />
          </div>
        </>
      ) : (
        <input 
          type={type} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className={`w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50/50 focus:bg-white outline-none transition-all text-sm tracking-tight shadow-sm`} 
        />
      )}
    </div>
  </div>
);

const CreateProfileModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-12 text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner"><UserCircle2 size={40} /></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Init Background</h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed px-6">Create a distinct simulation profile to test your financial resilience.</p>
          <input type="text" placeholder="Identity Name (e.g. Dream Self)" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none mb-10 text-center text-lg" />
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-slate-200 transition-all">Abort</button>
            <button disabled={!name} onClick={() => onSave({ name, identity: { age: 30, retirementAge: 65, lifeExpectancy: 90 }, financials: { cash: 50000, investments: 100000, property: 0, pension: 20000, mortgage: 0, otherDebt: 0 }, income: { annualGross: 80000, growthRate: 3 }, preferences: { riskTolerance: 'Balanced', volatilityLimit: 15 } })} className="flex-1 py-5 bg-indigo-600 text-white font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatePathModal = ({ profiles, goals, goalsLoading, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState(profiles[0]?.id);
  const [goalId, setGoalId] = useState(goals[0]?.id);

  useEffect(() => {
    if (goals?.length && !goalId) {
      setGoalId(goals[0].id);
    }
  }, [goals, goalId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
              <Play size={32} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Run New Path</h2>
              <p className="text-slate-500 text-sm font-medium">Connect a background to a goal to start simulating.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Edit2 size={12} className="text-indigo-400" /> Path Name
              </label>
              <input 
                type="text" 
                placeholder="e.g. Aggressive Growth Plan" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <UserCircle2 size={12} className="text-indigo-400" /> Select Background
                </label>
                <select 
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none"
                >
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Target size={12} className="text-indigo-400" /> Select Goal
                </label>
                <select 
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  disabled={goalsLoading || !goals.length}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none"
                >
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  {!goals.length && <option value="">No goals available</option>}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-10">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
            <button 
              disabled={!name || !goalId}
              onClick={() => onSave({ name, profileId, goalId })} 
              className="flex-1 py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
            >
              Start Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioLobby;
