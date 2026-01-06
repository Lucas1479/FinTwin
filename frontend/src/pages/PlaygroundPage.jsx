import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Calculator, PlayCircle, Settings2 } from 'lucide-react';
import ScenarioLobby from './Playground/ScenarioLobby';
import ScenarioWorkspace from './Playground/ScenarioWorkspace';
import PlaygroundTools, { CalculatorModal } from './Playground/PlaygroundTools';
import { getGoals } from '../services/goalService';

const PlaygroundPage = () => {
  const [activeTab, setActiveTab] = useState('simulations'); // 'simulations' | 'tools'
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Mock initial profiles (Backgrounds)
  const [profiles, setProfiles] = useState([
    {
      id: 'prof_1',
      name: 'Current Reality',
      identity: { age: 30, retirementAge: 65, lifeExpectancy: 90 },
      financials: {
        cash: 45000,
        investments: 85000,
        property: 0,
        pension: 25400,
        mortgage: 0,
        otherDebt: 0
      },
      income: { annualGross: 120000, growthRate: 3 },
      preferences: { riskTolerance: 'Balanced', volatilityLimit: 15 }
    },
    {
      id: 'prof_2',
      name: 'Future High Earner',
      identity: { age: 30, retirementAge: 55, lifeExpectancy: 95 },
      financials: {
        cash: 100000,
        investments: 500000,
        property: 1200000,
        pension: 150000,
        mortgage: 800000,
        otherDebt: 0
      },
      income: { annualGross: 250000, growthRate: 5 },
      preferences: { riskTolerance: 'Aggressive', volatilityLimit: 25 }
    }
  ]);

  // Manage scenarios at this level to share with Workspace
  const [scenarios, setScenarios] = useState([
    { id: 'sim_1', name: 'Early Retirement Plan', profileId: 'prof_1', goalId: null, status: 'safe', successProbability: 78, monthlyContribution: 2000, retirementAge: 55 },
    { id: 'sim_2', name: 'Buying a Bach', profileId: 'prof_1', goalId: null, status: 'risky', successProbability: 42, monthlyContribution: 1500, retirementAge: 65 }
  ]);

  // Normalize goal payloads from API into the shape used by Playground
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

  useEffect(() => {
    const loadGoals = async () => {
      setGoalsLoading(true);
      try {
        const data = await getGoals();
        const rawList = Array.isArray(data) ? data : data?.goals || [];
        const normalized = rawList.map(normalizeGoal).filter(Boolean);
        setGoals(normalized);

        // Backfill existing scenarios to the first available goal when not set
        if (normalized.length) {
          setScenarios((prev) =>
            prev.map((s) => {
              if (s.goalId && normalized.some((g) => g.id === s.goalId)) return s;
              return { ...s, goalId: normalized[0].id };
            })
          );
        }
      } catch (err) {
        console.error('[Playground] Failed to load goals', err);
      } finally {
        setGoalsLoading(false);
      }
    };

    loadGoals();
  }, []);

  const handleEditScenario = (id) => {
    setSelectedScenarioId(id);
  };

  const handleBackToLobby = () => {
    setSelectedScenarioId(null);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50/30 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
          
          {/* Header Section - Refined Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Playground</h1>
            <p className="text-slate-500 text-sm mt-1">Design backgrounds and test life scenarios in a risk-free environment.</p>
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
              selectedScenarioId ? (
                <ScenarioWorkspace 
                  scenarioId={selectedScenarioId} 
                  scenario={scenarios.find(s => s.id === selectedScenarioId)}
                  onBack={handleBackToLobby} 
                  profiles={profiles}
                  goals={goals}
                  goalsLoading={goalsLoading}
                />
              ) : (
                <ScenarioLobby 
                  onEditScenario={handleEditScenario} 
                  profiles={profiles}
                  setProfiles={setProfiles}
                  scenarios={scenarios}
                  setScenarios={setScenarios}
                  goals={goals}
                  goalsLoading={goalsLoading}
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
                <ToolCard 
                  title="Latte Factor"
                  description="See how small daily savings grow over decades with compound interest."
                  icon={<PlayCircle className="text-emerald-600" />}
                  color="emerald"
                  onClick={() => setActiveTool('latte')}
                />
                <ToolCard 
                  title="Retirement Planner"
                  description="Estimate how much you need to save for your golden years."
                  icon={<Settings2 className="text-amber-600" />}
                  color="amber"
                  onClick={() => alert('Retirement tool coming soon!')}
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
