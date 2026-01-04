import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { getWealthSummary, getAssets } from '../services/wealthService';
import { getGoals } from '../services/goalService';
import { getUserProfile } from '../services/userService';

// New Widgets
import HealthScoreWidget from '../components/dashboard/widgets/HealthScoreWidget';
import GoalHeatmapWidget from '../components/dashboard/widgets/GoalHeatmapWidget';
import AdvisorPulseWidget from '../components/dashboard/widgets/AdvisorPulseWidget';
import FundingFlowWidget from '../components/dashboard/widgets/FundingFlowWidget';
import GoalProgressChartWidget from '../components/dashboard/widgets/GoalProgressChartWidget';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    profile: null,
    wealth: null,
    assets: [],
    goals: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profile, wealth, assets, goals] = await Promise.all([
        getUserProfile(),
        getWealthSummary(),
        getAssets(),
        getGoals()
      ]);

      setData({
        profile,
        wealth,
        assets: assets || [],
        goals: goals || []
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      // Fallback to minimal data if APIs fail
      setData(prev => ({
        ...prev,
        wealth: { net_worth: 154000, liquid_capital: 42000 }
      }));
    } finally {
      setLoading(false);
    }
  };

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
      <div className="mb-8 pt-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          {timeGreeting}, {data.profile?.name?.split(' ')[0] || 'User'} 
          <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-70">
          Your digital twin is currently processing latest market data
        </p>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto animate-fade-in px-6 pb-20">
        <Greeting />

        {/* Level 1: Global Health Pulse */}
        <section className="mb-8">
          <HealthScoreWidget 
            netWorth={data.wealth?.net_worth || 0} 
            liquidCapital={data.wealth?.liquid_capital || 0}
            healthScore={88}
          />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Level 2: Resource Mapping & Progress Tracking */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <GoalHeatmapWidget 
              assets={data.assets} 
              goals={data.goals} 
            />
            <GoalProgressChartWidget 
              goals={data.goals} 
            />
          </div>

          {/* Level 3: Funding Flow & AI Advisor Pulse */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            <FundingFlowWidget 
              goals={data.goals} 
              profile={data.profile} 
            />
            <AdvisorPulseWidget />
          </div>
        </div>

        {/* Hidden / Developer Quick Links Footnote */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center opacity-40">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Connected Modules: WealthCenter, GoalEngine, UserProfile
           </p>
           <div className="flex gap-4">
              <span className="text-[10px] font-black text-slate-900">v2.0.0-BETA</span>
           </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
