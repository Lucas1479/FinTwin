import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Calculator, PlayCircle, RotateCw } from 'lucide-react';
import InfoTooltip from '../components/common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../constants/helpAnchors'; // Import Registry
import PlaygroundLobby from './Playground/PlaygroundLobby';
import SimulationWorkspace from './Playground/SimulationWorkspace';
import PlaygroundTools, { CalculatorModal } from './Playground/PlaygroundTools';
import { getGoals } from '../services/goalService';
import {
  getBackgrounds,
  createBackground,
  updateBackground,
  deleteBackground,
  getSimulations,
  createSimulation,
  updateSimulation,
  deleteSimulation,
} from '../services/playgroundService';

const PlaygroundPage = () => {
  const [activeTab, setActiveTab] = useState('simulations'); // 'simulations' | 'tools'
  const [selectedSimulationId, setSelectedSimulationId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  
  const [backgrounds, setBackgrounds] = useState([]); // This might become deprecated if backgrounds are embedded in simulations
  const [simulations, setSimulations] = useState([]);
  const [simulationsLoading, setSimulationsLoading] = useState(true);

  // Normalize goal payloads
  const normalizeGoal = (goal) => {
    if (!goal) return null;
    const id = goal._id || goal.id || goal.goal_id;
    const name = goal.goal_name || goal.name || goal.title;
    if (!id || !name) return null;
    return {
      id,
      name,
      icon: goal.icon || goal.category || 'target',
      category: goal.category,
      target_amount: goal.target_amount ?? goal.goal_amount ?? goal.targetAmount ?? 0,
      current_amount: goal.current_amount ?? goal.progress_amount ?? goal.currentAmount ?? 0,
      due_date: goal.due_date || goal.target_date || goal.dueDate,
      raw: goal
    };
  };

  const normalizeBackground = (bg) => {
    if (!bg) return null;
    const id = bg._id || bg.id;
    if (!id) return null;
    return {
      id,
      name: bg.name || 'Untitled Background',
      identity: bg.identity || {},
      financials: bg.financials || {},
      income: bg.income || {},
      preferences: bg.preferences || {},
      meta: bg.meta || {},
      updatedAt: bg.updatedAt,
      createdAt: bg.createdAt,
    };
  };

  const normalizeSimulation = (sim) => {
    if (!sim) return null;
    const parameters = sim.parameters || {};
    const results = sim.results || {};

    return {
      id: sim._id || sim.id,
      name: sim.name || 'Untitled Simulation',
      profileId: sim.background || sim.backgroundId || sim.profileId || null,
      profile: sim.profile || {},
      goalId: sim.goalId || null,
      monthlyContribution: parameters.monthlyContribution ?? sim.monthlyContribution ?? 0,
      retirementAge: parameters.retirementAge ?? sim.retirementAge ?? 65,
      inflationRate: parameters.inflationRate ?? sim.inflationRate ?? 3,
      returnRate: parameters.returnRate ?? sim.returnRate ?? 7,
      lumpSum: parameters.lumpSum ?? parameters.lumpSumAmount ?? sim.lumpSum ?? 0,
      isInflationAdjusted: parameters.isInflationAdjusted ?? sim.isInflationAdjusted ?? true,
      successProbability: results.successProbability ?? sim.successProbability,
      finalAmount: results.finalAmount ?? sim.finalAmount,
      status: results.status ?? sim.status,
      updatedAt: sim.updatedAt,
    };
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setGoalsLoading(true);
    setSimulationsLoading(true);
    try {
      const [goalsData, backgroundsData, simsData] = await Promise.all([
        getGoals(),
        getBackgrounds(),
        getSimulations()
      ]);

      // Handle Goals
      const rawList = Array.isArray(goalsData) ? goalsData : goalsData?.goals || [];
      const normalizedGoals = rawList.map(normalizeGoal).filter(Boolean);
      setGoals(normalizedGoals);

      // Handle Backgrounds
      const rawBackgrounds = Array.isArray(backgroundsData) ? backgroundsData : [];
      const normalizedBackgrounds = rawBackgrounds.map(normalizeBackground).filter(Boolean);
      setBackgrounds(normalizedBackgrounds);

      // Handle Simulations
      const normalizedSimulations = Array.isArray(simsData)
        ? simsData.map(normalizeSimulation).filter(Boolean)
        : [];
      setSimulations(normalizedSimulations);

    } catch (err) {
      console.error('[Playground] Failed to load initial data', err);
    } finally {
      setGoalsLoading(false);
      setSimulationsLoading(false);
    }
  };

  const handleCreateBackground = async (payload) => {
    const cleaned = {
      name: payload.name,
      identity: payload.identity || {},
      financials: payload.financials || {},
      income: payload.income || {},
      preferences: payload.preferences || {},
      meta: payload.meta || {},
    };

    const created = await createBackground(cleaned);
    const normalized = normalizeBackground(created);
    if (normalized) {
      setBackgrounds((prev) => [normalized, ...prev]);
    }
    return normalized;
  };

  const handleUpdateBackground = async (payload) => {
    if (!payload?.id) return null;
    const { id, ...rest } = payload;
    const cleaned = {
      name: rest.name,
      identity: rest.identity || {},
      financials: rest.financials || {},
      income: rest.income || {},
      preferences: rest.preferences || {},
      meta: rest.meta || {},
    };

    const updated = await updateBackground(id, cleaned);
    const normalized = normalizeBackground(updated);
    if (normalized) {
      setBackgrounds((prev) => prev.map((p) => (p.id === normalized.id ? normalized : p)));
    }
    return normalized;
  };

  const handleDeleteBackground = async (id) => {
    await deleteBackground(id);
    setBackgrounds((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreateSimulation = async (newSimulation) => {
    try {
      // Backend expects: name, profile, goalId, parameters, results, backgroundId
      const background = backgrounds.find((p) => p.id === newSimulation.profileId) || newSimulation.profile;
      const backgroundId = newSimulation.profileId || background?.id;

      const parameters = {
        monthlyContribution: newSimulation.monthlyContribution ?? 0,
        retirementAge: newSimulation.retirementAge ?? background?.identity?.retirementAge ?? 65,
        inflationRate: newSimulation.inflationRate ?? 3,
        returnRate: newSimulation.returnRate ?? 7,
        lumpSum: newSimulation.lumpSum ?? 0,
        isInflationAdjusted: newSimulation.isInflationAdjusted ?? true,
      };

      const results = {};
      if (typeof newSimulation.successProbability !== 'undefined') {
        results.successProbability = newSimulation.successProbability;
      }
      if (typeof newSimulation.finalAmount !== 'undefined') {
        results.finalAmount = newSimulation.finalAmount;
      }
      if (newSimulation.status) {
        results.status = newSimulation.status;
      }

      const payload = {
        name: newSimulation.name,
        profile: background || {},
        goalId: newSimulation.goalId,
        backgroundId,
        parameters,
        results,
      };

      const created = await createSimulation(payload);

      const normalized = normalizeSimulation(created);

      setSimulations(prev => normalized ? [normalized, ...prev] : prev);
      return normalized;
    } catch (err) {
      console.error('Failed to create simulation', err);
      throw err;
    }
  };

  const handleUpdateSimulation = async (id, updates) => {
    try {
        const { name, goalId, profile, backgroundId, profileId, ...rest } = updates;

        const payload = {};
        if (name) payload.name = name;
        if (goalId !== undefined) payload.goalId = goalId;
        if (profile) payload.profile = profile;

        const resolvedBackgroundId = backgroundId || profileId;
        if (resolvedBackgroundId) {
          payload.backgroundId = resolvedBackgroundId;
        }

        const parameterKeys = ['monthlyContribution', 'retirementAge', 'inflationRate', 'returnRate', 'lumpSum', 'isInflationAdjusted'];
        const parameters = {};
        parameterKeys.forEach((key) => {
          if (typeof rest[key] !== 'undefined') {
            parameters[key] = rest[key];
          }
        });
        if (Object.keys(parameters).length) {
          payload.parameters = parameters;
        }

        const results = {};
        if (typeof rest.successProbability !== 'undefined') results.successProbability = rest.successProbability;
        if (typeof rest.finalAmount !== 'undefined') results.finalAmount = rest.finalAmount;
        if (rest.status) results.status = rest.status;
        if (Object.keys(results).length) {
          payload.results = results;
        }

        const updated = await updateSimulation(id, payload);
        const normalized = normalizeSimulation(updated);

        setSimulations(prev => prev.map(s => (s.id === id && normalized ? normalized : s)));
    } catch (err) {
        console.error('Failed to update simulation', err);
    }
  };

  const handleDeleteSimulation = async (id) => {
      try {
          await deleteSimulation(id);
          setSimulations(prev => prev.filter(s => s.id !== id));
          if (selectedSimulationId === id) setSelectedSimulationId(null);
      } catch (err) {
          console.error('Failed to delete simulation', err);
      }
  };

  const handleEditSimulation = (id) => {
    setSelectedSimulationId(id);
  };

  const handleBackToLobby = () => {
    setSelectedSimulationId(null);
    // Refresh list to ensure consistency? Not strictly needed if optimistic updates work well
    fetchInitialData(); 
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50/30 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
          
          {/* Header Section - Refined Title */}
          <div className="mb-8 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Playground</h1>
                    <InfoTooltip 
                        content="A sandbox environment to test 'What-If' scenarios without affecting your live financial plan."
                        anchor={HELP_ANCHORS.PLAYGROUND.SIMULATIONS} 
                    />
                </div>
                <p className="text-slate-500 text-sm mt-1">Design backgrounds and test life scenarios in a risk-free environment.</p>
            </div>
            {/* Refresh Button */}
            <button 
                onClick={fetchInitialData}
                disabled={simulationsLoading}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Refresh Simulations"
            >
                <RotateCw size={20} className={simulationsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Navigation Tabs - Wealth Center Style */}
          <div className="flex items-center gap-1 mb-8 border-b border-slate-200">
            <TabButton 
              id="simulations" 
              label="Simulations" 
              icon={PlayCircle} 
              active={activeTab === 'simulations'} 
              onClick={setActiveTab} 
            />
            <TabButton 
              id="tools" 
              label="Tools" 
              icon={Calculator} 
              active={activeTab === 'tools'} 
              onClick={setActiveTab} 
            />
          </div>

          {/* Content Area */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'simulations' ? (
              selectedSimulationId ? (
                <SimulationWorkspace 
                  simulationId={selectedSimulationId} 
                  simulation={simulations.find(s => s.id === selectedSimulationId)}
                  onBack={handleBackToLobby} 
                  onSave={handleUpdateSimulation}
                  backgrounds={backgrounds} // Pass empty or mock if now embedded
                  goals={goals}
                  goalsLoading={goalsLoading}
                />
              ) : (
                <PlaygroundLobby 
                  onEditSimulation={handleEditSimulation} 
                  onCreateSimulation={handleCreateSimulation}
                  onDeleteSimulation={handleDeleteSimulation}
                  onCreateBackground={handleCreateBackground}
                  onUpdateBackground={handleUpdateBackground}
                  onDeleteBackground={handleDeleteBackground}
                  backgrounds={backgrounds}
                  simulations={simulations}
                  goals={goals}
                  goalsLoading={goalsLoading}
                  loading={simulationsLoading}
                />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ToolCard 
                  title="Mortgage Calculator"
                  description="Calculate your monthly payments and interest for a home loan."
                  icon={<Calculator className="text-purple-600" />}
                  color="purple"
                  onClick={() => setActiveTool('mortgage')}
                />
                {/* Placeholder cards for future tools */}
                <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center group hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50/30">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                    <Calculator className="text-slate-300 group-hover:text-indigo-400" size={20} />
                  </div>
                  <h3 className="font-bold text-slate-400 group-hover:text-indigo-600 text-sm uppercase tracking-widest">Expansion Pack</h3>
                  <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-[0.2em]">Tax & ROI Coming Soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CalculatorModal 
        isOpen={!!activeTool} 
        onClose={() => setActiveTool(null)} 
        calculatorType={activeTool} 
        onAddToScenario={(data) => {
          console.log('Tool output:', data);
          // Optional: Create a new scenario from tool output?
          setActiveTool(null);
        }}
      />
    </MainLayout>
  );
};

const TabButton = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`
      relative flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2
      ${active 
        ? 'text-primary border-primary bg-primary/5' 
        : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50/50'
      }
    `}
  >
    <Icon size={16} className={active ? 'text-primary' : 'text-slate-400'} />
    <span>{label}</span>
  </button>
);

const ToolCard = ({ title, description, icon, color, onClick }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-950',
    purple: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
        {React.cloneElement(icon, { size: 120 })}
      </div>
      <div className={`w-14 h-14 ${colorMap[color] || 'bg-slate-50'} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner`}>
        {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-8 pr-4">
        {description}
      </p>
      <div className="flex items-center text-primary font-black text-[11px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
        Initialize Tool <PlayCircle size={16} className="ml-2" strokeWidth={3} />
      </div>
    </div>
  );
};

export default PlaygroundPage;
