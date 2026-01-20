import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getWealthSummary, getAssets } from '../services/wealthService';
import { getGoals } from '../services/goalService';
import { getUserProfile } from '../services/userService';
import { getCashFlows } from '../services/cashFlowService';
import { useSimulation, useSimulatedData } from '../context/SimulationContext';

// New Widgets
import HealthScoreWidget from '../components/dashboard/widgets/HealthScoreWidget';
import GoalHeatmapWidget from '../components/dashboard/widgets/GoalHeatmapWidget';
import AdvisorPulseWidget from '../components/dashboard/widgets/AdvisorPulseWidget';
import FundingFlowWidget from '../components/dashboard/widgets/FundingFlowWidget';
import GoalProgressChartWidget from '../components/dashboard/widgets/GoalProgressChartWidget';
import DigitalTwinCore from '../components/dashboard/DigitalTwinCore';
import { Zap, Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { timeOffset, marketMode } = useSimulation(); // Consume global simulation state
  
  const [data, setData] = useState({
    profile: null,
    wealth: null,
    assets: [],
    goals: [],
    cashFlows: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profile, wealth, assets, goals, cashFlows] = await Promise.all([
        getUserProfile(),
        getWealthSummary(),
        getAssets(),
        getGoals(),
        getCashFlows()
      ]);

      setData({
        profile,
        wealth,
        assets: assets || [],
        goals: goals || [],
        cashFlows: cashFlows || []
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      // Fallback to minimal data if APIs fail
      setData(prev => ({
        ...prev,
        wealth: { netWorth: 154000, liquidCapital: 42000, totalAssets: 180000, totalLiabilities: 26000 }
      }));
    } finally {
      setLoading(false);
    }
  };

  // --- Time Machine Logic (Evolution Interceptor) ---
  const actualAssets = useMemo(
    () => data.assets.filter(item => item.record_type === 'Asset'),
    [data.assets]
  );
  const actualLiabilities = useMemo(
    () => data.assets.filter(item => item.record_type === 'Liability'),
    [data.assets]
  );

  const simulationInput = useMemo(() => ({
    assets: actualAssets,
    liabilities: actualLiabilities,
    cashFlows: data.cashFlows,
    goals: data.goals,
    wealth: data.wealth
  }), [actualAssets, actualLiabilities, data.cashFlows, data.goals, data.wealth]);

  const evolvedSnapshot = useSimulatedData(simulationInput) || simulationInput;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  // Abstracted Header Section
  const Greeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good Afternoon";
    if (hour >= 17) timeGreeting = "Good Evening";

    return (
      <div className="mb-8 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="hidden md:block">
            <DigitalTwinCore size={80} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {timeGreeting}, {data.profile?.name?.split(' ')[0] || 'User'} 
              <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {timeOffset > 0 ? `Simulating ${timeOffset} years into the future (${marketMode})` : "Your digital twin is currently processing latest market data"}
            </p>
          </div>
        </div>

        {/* New Goal CTA - Minimalist Professional Style */}
        <button 
          onClick={() => navigate('/goals/intake')}
          className="hidden sm:flex items-center gap-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-5 py-2.5 rounded-2xl transition-all duration-300 group border border-indigo-100/50 shadow-sm"
        >
          <Plus size={16} className="transition-transform group-hover:rotate-90" />
          <span className="text-xs font-bold tracking-tight">New Goal</span>
        </button>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className={`max-w-[1600px] mx-auto animate-fade-in px-6 pb-20 transition-all duration-700 ${timeOffset > 0 ? 'bg-indigo-50/10' : ''}`}>
        <Greeting />

        {/* Level 1: Global Health Pulse */}
        <section className="mb-8 relative">
          {timeOffset > 0 && (
            <div className="absolute -top-4 left-6 z-20 bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 shadow-lg animate-bounce">
              <Zap size={8} fill="white" /> Simulation Mode
            </div>
          )}
          <HealthScoreWidget 
            netWorth={evolvedSnapshot.wealth?.netWorth || 0} 
            liquidCapital={evolvedSnapshot.wealth?.liquidCapital || 0}
            totalAssets={evolvedSnapshot.wealth?.totalAssets || 0}
            totalLiabilities={evolvedSnapshot.wealth?.totalLiabilities || 0}
            healthScore={timeOffset > 0 ? 92 : 88}
          />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Level 2: Resource Mapping & Progress Tracking */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <GoalHeatmapWidget 
              assets={evolvedSnapshot.assets} 
              goals={evolvedSnapshot.goals} 
            />
            <GoalProgressChartWidget 
              goals={evolvedSnapshot.goals} 
            />
          </div>

          {/* Level 3: Funding Flow & AI Advisor Pulse */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            <FundingFlowWidget 
              cashFlows={data.cashFlows} 
              profile={data.profile} 
            />
            <AdvisorPulseWidget />
          </div>
        </div>

        {/* Hidden / Developer Quick Links Footnote */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center opacity-40">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Connected Modules: WealthCenter, GoalEngine, UserProfile, TimeMachine
           </p>
           <div className="flex gap-4">
              <span className="text-[10px] font-black text-slate-900">v2.1.0-SIMULATOR</span>
           </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
