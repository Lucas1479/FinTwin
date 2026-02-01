import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Plus, LayoutGrid, Sparkles, Zap } from 'lucide-react';
import { getGoals } from '../services/goalService';
import { useSimulatedData, useSimulation } from '../context/SimulationContext';
import InfoTooltip from '../components/common/InfoTooltip';
import { HELP_ANCHORS } from '../constants/helpAnchors';
import GoalsOverview from './goals/GoalsOverview';
import GoalsOptimizer from './goals/GoalsOptimizer';

const GoalsPage = () => {
  const location = useLocation();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'optimizer'
  const { timeOffset, marketMode } = useSimulation();

  // --- Simulation Integration ---
  const simulatedData = useSimulatedData({
    goals: goals,
    assets: [],
    cashFlows: []
  });

  const displayGoals = simulatedData?.goals || goals;

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    const stateTab = location.state?.tab;
    const params = new URLSearchParams(location.search);
    const queryTab = params.get('tab');
    const nextTab = stateTab || queryTab;
    if (nextTab && ['overview', 'optimizer'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [location.state, location.search]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const realGoals = await getGoals();
      setGoals(Array.isArray(realGoals) ? realGoals : []);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8">
          
          {/* Level 1: Page Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Goals</h1>
                <InfoTooltip 
                  content="Goal-Based Investing (GBI) focuses on funding your specific life aspirations rather than beating the market."
                  anchor={HELP_ANCHORS.GOALS.INTRO} 
                />
              </div>
              {timeOffset > 0 && (
                <div className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1 shadow-sm animate-pulse">
                  <Zap size={12} fill="currentColor" /> Simulation Mode
                </div>
              )}
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              {timeOffset > 0 
                ? `Projecting ${timeOffset} years into the future (${marketMode} market conditions)` 
                : "Create financial goals and manage your savings"}
            </p>
          </div>

          {/* Level 2: Navigation Tabs & Global Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200">
            <div className="flex items-center gap-1">
              <TabButton 
                id="overview" 
                label="Overview" 
                icon={LayoutGrid} 
                active={activeTab === 'overview'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="optimizer" 
                label="Optimizer" 
                icon={Sparkles} 
                active={activeTab === 'optimizer'} 
                onClick={setActiveTab} 
              />
            </div>

            {/* Global Actions Toolbar */}
            {activeTab === 'overview' && (
              <div className="flex items-center gap-3 pb-2 md:pb-0">
                <Link 
                  to="/goals/new/ai" 
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                >
                  <Plus size={16} />
                  <span>Create New Goal</span>
                </Link>
              </div>
            )}
          </div>

          {/* Level 3: Content Area */}
          <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'overview' && (
              <GoalsOverview 
                displayGoals={displayGoals} 
                isLoading={isLoading}
                onRefresh={fetchGoals}
              />
            )}
            {activeTab === 'optimizer' && (
              <GoalsOptimizer 
                goals={displayGoals} 
                isLoading={isLoading}
              />
            )}
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

// Helper components
const TabButton = ({ id, label, icon: Icon, active, onClick, disabled }) => (
  <button
    onClick={() => !disabled && onClick(id)}
    disabled={disabled}
    className={`
      relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2
      ${active 
        ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' 
        : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <Icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400'} />
    <span>{label}</span>
  </button>
);

export default GoalsPage;
