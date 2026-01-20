import React, { useState, useEffect } from 'react';
import { PlusCircle, Play, Copy, Trash2, Edit2, UserCircle2, Briefcase, TrendingUp, X, ChevronDown, ChevronUp, Wallet, Landmark, TrendingDown, Info, ShieldCheck, Save, BarChart3, Activity, Target, CheckCircle2 } from 'lucide-react';
import InfoTooltip from '../../components/common/InfoTooltip';
import { HELP_ANCHORS } from '../../constants/helpAnchors';

const PlaygroundLobby = ({
  onEditSimulation,
  onCreateSimulation,
  onDeleteSimulation,
  onCreateBackground,
  onUpdateBackground,
  onDeleteBackground,
  backgrounds,
  simulations,
  goals = [],
  goalsLoading,
  loading
}) => {
  const [expandedBackgroundId, setExpandedBackgroundId] = useState(null);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);

  const handleUpdateBackground = async (updatedBackground) => {
    if (!onUpdateBackground) return;
    try {
      await onUpdateBackground(updatedBackground);
    } catch (err) {
      console.error('[PlaygroundLobby] Failed to update background', err);
      throw err;
    }
  };

  const handleDeleteBackground = async (e, backgroundId) => {
    e?.stopPropagation?.();
    if (!onDeleteBackground || !backgroundId) return;
    if (!window.confirm('Delete this background?')) return;
    try {
      await onDeleteBackground(backgroundId);
    } catch (err) {
      console.error('[PlaygroundLobby] Failed to delete background', err);
    }
  };

  const handleCreateBackground = async (newBackground) => {
    if (!onCreateBackground) return;
    try {
      await onCreateBackground(newBackground);
      setIsBackgroundModalOpen(false);
    } catch (err) {
      console.error('[PlaygroundLobby] Failed to create background', err);
    }
  };

  const handleCreateSimulation = async (payload) => {
    if (!onCreateSimulation) return;
    try {
      await onCreateSimulation(payload);
      setIsSimulationModalOpen(false);
    } catch (err) {
      console.error('[PlaygroundLobby] Failed to create simulation', err);
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
      {/* 1. Full-Width Backgrounds */}
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
            onClick={() => setIsBackgroundModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95 group"
          >
            <PlusCircle size={14} className="group-hover:text-indigo-600 transition-colors" />
            New Background
          </button>
        </div>

        <div className="space-y-4">
          {backgrounds.map(background => (
            <BackgroundRow 
              key={background.id} 
              background={background} 
              isExpanded={expandedBackgroundId === background.id}
              onToggle={() => setExpandedBackgroundId(expandedBackgroundId === background.id ? null : background.id)}
              onUpdate={handleUpdateBackground}
              onDelete={handleDeleteBackground}
            />
          ))}
        </div>
      </section>

      {/* 2. Simulations List */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2 pt-8 border-t border-slate-200/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Play size={18} strokeWidth={2.5} fill="currentColor" className="ml-0.5" />
             </div>
             <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Saved Simulations
                </h2>
                <InfoTooltip 
                    content="A 'What-If' simulation connecting a Background to a specific Goal to test feasibility."
                    anchor={HELP_ANCHORS.PLAYGROUND.SIMULATIONS} 
                />
             </div>
          </div>
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <PlusCircle size={14} />
            New Simulation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {simulations.map(simulation => (
            <div key={simulation.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group relative overflow-hidden flex flex-col h-full">
              
              {/* Header Status */}
              <div className="flex justify-between items-start mb-5">
                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  simulation.status === 'safe' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : simulation.status === 'risky'
                      ? 'bg-rose-50 text-rose-600 border-rose-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  {simulation.status === 'unknown' ? 'Pending' : simulation.status}
                </div>
                
                {/* Linked Entities Badge */}
                <div className="flex gap-1">
                   {simulation.goalId && (
                      <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600" title="Has Goal">
                         <Target size={12} />
                      </div>
                   )}
                   <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400" title="Has Background">
                         <UserCircle2 size={12} />
                   </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                  {simulation.name}
              </h3>
              
              <div className="text-xs text-slate-500 mb-6 font-medium">
                  Based on <span className="text-slate-700 font-semibold">{backgrounds.find(p => p.id === simulation.profileId)?.name || 'Unknown'}</span>
              </div>

              <div className="mt-auto space-y-5">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Survival Probability</span>
                    <span className={(simulation.successProbability || 0) >= 70 ? 'text-emerald-600' : 'text-rose-600'}>{(simulation.successProbability || 0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${(simulation.successProbability || 0) >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${(simulation.successProbability || 0)}%` }} 
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                    <button
                    onClick={() => onEditSimulation(simulation.id)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                    Enter Decision Space
                    <TrendingUp size={14} className="text-slate-400 group-hover/btn:text-indigo-600 transition-colors" />
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete this simulation?')) onDeleteSimulation(simulation.id);
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
             onClick={() => setIsSimulationModalOpen(true)}
             className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-[280px]"
          >
             <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <PlusCircle size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
             </div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Create New Simulation</span>
          </button>
        </div>
      </section>

      {isBackgroundModalOpen && (
        <CreateBackgroundModal 
          onClose={() => setIsBackgroundModalOpen(false)} 
          onSave={handleCreateBackground}
        />
      )}

      {isSimulationModalOpen && (
        <CreateSimulationModal
          backgrounds={backgrounds}
          goals={goals}
          goalsLoading={goalsLoading}
          onClose={() => setIsSimulationModalOpen(false)}
          onSave={handleCreateSimulation}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---

const BackgroundRow = ({ background, isExpanded, onToggle, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState('identity'); 
  const [localBackground, setLocalBackground] = useState(background);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalBackground(background);
  }, [background]);

  const totalAssets = (localBackground.financials.cash || 0) + 
                     (localBackground.financials.investments || 0) + 
                     (localBackground.financials.property || 0) + 
                     (localBackground.financials.pension || 0);
  const totalLiabilities = (localBackground.financials.mortgage || 0) + 
                          (localBackground.financials.otherDebt || 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = (totalLiabilities / Math.max(totalAssets, 1)) * 100;

  const handleFieldChange = (section, field, value) => {
    setLocalBackground(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onUpdate(localBackground);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
        console.error('[BackgroundRow] Save failed:', err);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-[1.5rem] border transition-all duration-300 ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-50/50' : 'border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md'}`}>
      <div className="px-6 py-5 flex items-center justify-between cursor-pointer group" onClick={onToggle}>
        <div className="flex items-center gap-6 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-indigo-600 text-white scale-110 rotate-3' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
            <UserCircle2 size={20} />
          </div>
          <div className={`grid flex-1 gap-x-8 gap-y-4 transition-all duration-500 ${isExpanded ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <Stat label="Background Name" value={background.name} isPrimary />
            <Stat label="Net Worth Base" value={`$${netWorth.toLocaleString()}`} />
            <Stat label="Age / Ret." value={`${background.identity.age} / ${background.identity.retirementAge}`} />
            <Stat label="Annual Income" value={`$${background.income.annualGross.toLocaleString()}`} isIndigo />
            
            {/* Extended fields shown only when expanded */}
            {isExpanded && (
              <>
                <Stat label="Risk Profile" value={background.preferences.riskTolerance} />
                <Stat label="Cash Reserves" value={`$${localBackground.financials.cash.toLocaleString()}`} />
                <Stat label="Debt Ratio" value={`${debtRatio.toFixed(1)}%`} isRose={debtRatio > 40} />
                <Stat label="Growth Exp." value={`${background.income.growthRate}%`} />
                <Stat label="Max Drawdown" value={`${background.preferences.maxDrawdown || 20}%`} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start mt-1">
          <button onClick={(e) => onDelete(e, background.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
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
                    <Field label="Full Name" value={localBackground.name} icon={<UserCircle2 size={16}/>} onChange={(v) => setLocalBackground({...localBackground, name: v})} />
                    <Field label="Current Age" value={localBackground.identity.age} type="number" min={18} max={80} step={1} icon={<Info size={16}/>} onChange={(v) => handleFieldChange('identity', 'age', v)} />
                    <Field label="Target Retirement" value={localBackground.identity.retirementAge} type="number" min={40} max={85} step={1} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('identity', 'retirementAge', v)} />
                    <Field label="Life Expectancy" value={localBackground.identity.lifeExpectancy} type="number" min={70} max={110} step={1} icon={<Play size={16}/>} onChange={(v) => handleFieldChange('identity', 'lifeExpectancy', v)} />
                  </div>
                )}
                {activeTab === 'financials' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                      <Field label="Liquid Cash ($)" value={localBackground.financials.cash} type="number" max={2000000} step={1000} icon={<Wallet size={16}/>} onChange={(v) => handleFieldChange('financials', 'cash', v)} />
                      <Field label="Brokerage Portfolio ($)" value={localBackground.financials.investments} type="number" max={5000000} step={5000} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('financials', 'investments', v)} />
                      <Field label="Real Estate Equity ($)" value={localBackground.financials.property} type="number" max={10000000} step={10000} icon={<Landmark size={16}/>} onChange={(v) => handleFieldChange('financials', 'property', v)} />
                      <Field label="Pension Assets ($)" value={localBackground.financials.pension} type="number" max={2000000} step={1000} icon={<Briefcase size={16}/>} onChange={(v) => handleFieldChange('financials', 'pension', v)} />
                    </div>
                    <div className="pt-8 border-t border-slate-100 grid grid-cols-2 gap-x-10 gap-y-8">
                      <Field label="Mortgage Balance ($)" value={localBackground.financials.mortgage} type="number" max={5000000} step={10000} color="rose" icon={<TrendingDown size={16}/>} onChange={(v) => handleFieldChange('financials', 'mortgage', v)} />
                      <Field label="Consumer Debt ($)" value={localBackground.financials.otherDebt} type="number" max={500000} step={1000} color="rose" icon={<Trash2 size={16}/>} onChange={(v) => handleFieldChange('financials', 'otherDebt', v)} />
                    </div>
                  </div>
                )}
                {activeTab === 'income' && (
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    <Field label="Gross Annual Salary ($)" value={localBackground.income.annualGross} type="number" max={1000000} step={1000} icon={<Landmark size={16}/>} onChange={(v) => handleFieldChange('income', 'annualGross', v)} />
                    <Field label="Career Growth Rate (%)" value={localBackground.income.growthRate} type="number" min={0} max={20} step={0.5} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('income', 'growthRate', v)} />
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
                        value={localBackground.preferences.riskTolerance}
                        onChange={(e) => handleFieldChange('preferences', 'riskTolerance', e.target.value)}
                        className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none appearance-none cursor-pointer transition-all text-sm"
                      >
                        <option value="Conservative">Conservative</option>
                        <option value="Balanced">Balanced</option>
                        <option value="Growth">Growth</option>
                        <option value="Aggressive">Aggressive</option>
                      </select>
                    </div>
                    <Field label="Volatility Limit (%)" value={localBackground.preferences.volatilityLimit} type="number" min={0} max={50} step={1} icon={<TrendingUp size={16}/>} onChange={(v) => handleFieldChange('preferences', 'volatilityLimit', v)} />
                    <Field label="Max Drawdown Limit (%)" value={localBackground.preferences.maxDrawdown || 20} type="number" min={0} max={100} step={1} icon={<TrendingDown size={16}/>} onChange={(v) => handleFieldChange('preferences', 'maxDrawdown', v)} />
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
                      percentage={((localBackground.financials.cash / Math.max(totalAssets, 1)) * 100)} 
                      colorClass="bg-indigo-500" 
                    />
                    <Metric 
                      label="Debt-to-Asset" 
                      percentage={debtRatio} 
                      colorClass={debtRatio > 40 ? 'bg-rose-400' : 'bg-sky-400'} 
                    />
                    <Metric 
                      label="Risk Exposure" 
                      percentage={(( (localBackground.financials.investments + localBackground.financials.pension) / Math.max(totalAssets, 1)) * 100)} 
                      colorClass="bg-fuchsia-500" 
                    />
                  </div>

                  <div className="mt-8">
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className={`w-full font-bold uppercase tracking-widest text-[11px] py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                        saveSuccess 
                          ? 'bg-emerald-500 text-white shadow-emerald-100' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                      } ${isSaving ? 'opacity-70 cursor-wait' : 'active:scale-95'}`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle2 size={16} />
                          Saved Successfully
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Commit Changes
                        </>
                      )}
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

const CreateBackgroundModal = ({ onClose, onSave }) => {
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

const CreateSimulationModal = ({ backgrounds, goals, goalsLoading, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [backgroundId, setBackgroundId] = useState(backgrounds[0]?.id);
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
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">New Simulation</h2>
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
                  value={backgroundId}
                  onChange={(e) => setBackgroundId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none"
                >
                  {backgrounds.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              onClick={() => onSave({ name, backgroundId, goalId })} 
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

export default PlaygroundLobby;
