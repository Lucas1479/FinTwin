import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Plus } from 'lucide-react';
import { getGoals, updateGoal, deleteGoal } from '../services/goalService';
import GoalCard from '../components/goals/GoalCard';
import GoalSummaryWidget from '../components/goals/GoalSummaryWidget';
import SavingsOverviewWidget from '../components/goals/SavingsOverviewWidget';
import GoalFilters from '../components/goals/GoalFilters';
import GoalDetailModal from '../components/goals/GoalDetailModal';
import { useSimulatedData, useSimulation } from '../context/SimulationContext';
import { Zap } from 'lucide-react';

// Mock data to match the design
const MOCK_GOALS = [
  {
    _id: 'mock-1',
    title: 'MacBook Pro',
    target_date: '2025-10-07',
    current_amount: 412.50,
    target_amount: 1650,
    status: 'In Progress',
    category: 'Purchase',
  },
  {
    _id: 'mock-2',
    title: 'New car',
    target_date: '2025-09-25',
    current_amount: 25000.50,
    target_amount: 60000,
    status: 'In Progress',
    category: 'Purchase',
  },
  {
    _id: 'mock-3',
    title: 'New house',
    target_date: '2027-04-20',
    current_amount: 5000.00,
    target_amount: 150000,
    status: 'Not Started',
    category: 'Housing',
  },
  {
    _id: 'mock-4',
    title: 'Vacation',
    target_date: '2025-12-01',
    current_amount: 2500.00,
    target_amount: 3500,
    status: 'Finished',
    category: 'Travel',
  }
];

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const { timeOffset, marketMode } = useSimulation();

  // --- Simulation Integration ---
  const simulatedData = useSimulatedData({
    goals: goals,
    assets: [], // Add if GoalsPage needs asset info later
    cashFlows: []
  });

  const displayGoals = simulatedData?.goals || goals;

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: 'all',       // Default to 'all' so users see their data across years
    sortBy: 'date_asc',     // Default to 'Soonest' to see what's due next or overdue
    status: 'all',          // 'all', 'in_progress', 'not_started'
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const realGoals = await getGoals();
      const combinedGoals = [...(realGoals || []), ...MOCK_GOALS];
      const uniqueGoals = Array.from(new Map(combinedGoals.map(g => [g._id, g])).values());
      setGoals(uniqueGoals);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      setGoals(MOCK_GOALS);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state: Filtered and Sorted Goals
  const processedGoals = useMemo(() => {
    let result = [...displayGoals]; // Use simulated goals as base
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Filter by Date Range
    if (filters.dateRange === 'this_year') {
      result = result.filter(g => {
        if (!g.target_date && !g.due_date) return false;
        const d = new Date(g.target_date || g.due_date);
        const isThisYear = d.getFullYear() === currentYear;
        // Natural logic: Also include overdue goals that are not yet finished
        const isOverdueActive = d.getTime() < now.getTime() && 
                               (g.status !== 'Finished' && g.status !== 'completed');
        return isThisYear || isOverdueActive;
      });
    } else if (filters.dateRange === 'next_year') {
      result = result.filter(g => {
        if (!g.target_date && !g.due_date) return false;
        const d = new Date(g.target_date || g.due_date);
        return d.getFullYear() === currentYear + 1;
      });
    }

    // 2. Filter by Status
    if (filters.status !== 'all') {
      if (filters.status === 'in_progress') {
        result = result.filter(g => {
          const s = g.status || 'In Progress';
          return s === 'In Progress' || s === 'Active';
        });
      } else if (filters.status === 'not_started') {
        result = result.filter(g => g.status === 'Not Started');
      }
    }

    // 3. Sort
    result.sort((a, b) => {
      const nameA = (a.title || a.goal_name || '').toLowerCase();
      const nameB = (b.title || b.goal_name || '').toLowerCase();
      const dateA = new Date(a.target_date || a.due_date || 0).getTime();
      const dateB = new Date(b.target_date || b.due_date || 0).getTime();
      const amtA = a.target_amount || 0;
      const amtB = b.target_amount || 0;

      switch (filters.sortBy) {
        case 'name_asc': return nameA.localeCompare(nameB);
        case 'name_desc': return nameB.localeCompare(nameA);
        case 'amount_desc': return amtB - amtA;
        case 'date_asc': return dateA - dateB;
        default: return 0;
      }
    });

    return result;
  }, [displayGoals, filters]);

  const handleReset = () => {
    setFilters({ dateRange: 'all', sortBy: 'date_asc', status: 'all' });
  };

  const hasActiveFilters = filters.dateRange !== 'all' || filters.status !== 'all' || filters.sortBy !== 'date_asc';

  const handleGoalClick = (goal) => {
    setSelectedGoal(goal);
  };

  const handleCloseModal = () => {
    setSelectedGoal(null);
  };

  const handleSaveGoal = async (updatedGoal) => {
    try {
      // If it's a mock goal (starts with 'mock-'), we can't save to backend. 
      // Just update local state for demo purposes.
      if (updatedGoal._id.startsWith('mock-')) {
        setGoals(prev => prev.map(g => g._id === updatedGoal._id ? updatedGoal : g));
        alert('Mock goal updated locally.');
        handleCloseModal();
        return;
      }

      await updateGoal(updatedGoal._id, updatedGoal);
      // Refresh goals to get latest data
      fetchGoals(); 
      handleCloseModal();
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Failed to save goal changes.');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      if (goalId.startsWith('mock-')) {
        setGoals(prev => prev.filter(g => g._id !== goalId));
        handleCloseModal();
        return;
      }

      await deleteGoal(goalId);
      fetchGoals();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal.');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
          <div>
             <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Goals</h1>
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
          
          <Link 
            to="/goals/new" 
            className="btn-primary-rounded flex items-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all px-5 py-2.5 text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add new goal
          </Link>
        </div>

        {/* Filter Component */}
        <GoalFilters 
          filters={filters} 
          onFilterChange={setFilters} 
          onReset={handleReset}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
            {/* Left Side: Filtered Goal Cards (2 cols) */}
            <div className="lg:col-span-3 xl:col-span-2">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="h-60 bg-slate-100 rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <>
                      {processedGoals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                          <p>No goals found matching filters.</p>
                          <button onClick={handleReset} className="text-brand-600 font-bold text-sm mt-2 hover:underline">Clear filters</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {processedGoals.map((goal) => (
                                <div key={goal._id} className="h-full">
                                    <GoalCard 
                                      goal={goal} 
                                      onClick={handleGoalClick}
                                    />
                                </div>
                            ))}
                        </div>
                      )}
                    </>
                )}
            </div>

            {/* Right Side: Widgets (1 col) */}
            <div className="lg:col-span-3 xl:col-span-1 flex flex-col gap-5">
                 {/* Summary widget always shows TOTAL stats, ignoring filters for "big picture" context */}
                 <div className="h-auto">
                    <GoalSummaryWidget goals={displayGoals} />
                 </div>
                 <div className="flex-1 min-h-[240px]">
                    <SavingsOverviewWidget />
                 </div>
            </div>
        </div>

        {/* Detail Modal */}
        {selectedGoal && (
          <GoalDetailModal 
            goal={selectedGoal} 
            onClose={handleCloseModal} 
            onSave={handleSaveGoal}
            onDelete={handleDeleteGoal}
          />
        )}

      </div>
    </MainLayout>
  );
};

export default GoalsPage;
