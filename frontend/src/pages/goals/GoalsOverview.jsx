import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getGoals, updateGoal, deleteGoal } from '../../services/goalService';
import GoalCard from '../../components/goals/GoalCard';
import GoalSummaryWidget from '../../components/goals/GoalSummaryWidget';
import SavingsOverviewWidget from '../../components/goals/SavingsOverviewWidget';
import GoalFilters from '../../components/goals/GoalFilters';
import GoalDetailModal from '../../components/goals/GoalDetailModal';

const GoalsOverview = ({ displayGoals, isLoading, onRefresh }) => {
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: 'all',       // Default to 'all' so users see their data across years
    sortBy: 'date_asc',     // Default to 'Soonest' to see what's due next or overdue
    status: 'all',          // 'all', 'in_progress', 'not_started'
  });

  const normalizeStatus = (status) => {
    if (!status) return 'in_progress';
    const raw = String(status).toLowerCase().replace(/\s+/g, '_');
    if (raw === 'active') return 'in_progress';
    if (raw === 'finished') return 'completed';
    return raw;
  };

  const getGoalTimestamp = (goal) => {
    const rawDate = goal.target_date || goal.due_date;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : time;
  };

  // Derived state: Filtered and Sorted Goals
  const processedGoals = useMemo(() => {
    let result = [...displayGoals];
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
      result = result.filter(g => normalizeStatus(g.status) === filters.status);
    }

    // 3. Sort
    result.sort((a, b) => {
      const nameA = (a.title || a.goal_name || '').toLowerCase();
      const nameB = (b.title || b.goal_name || '').toLowerCase();
      const dateA = getGoalTimestamp(a);
      const dateB = getGoalTimestamp(b);
      const amtA = a.target_amount || 0;
      const amtB = b.target_amount || 0;

      const statusPriority = normalizeStatus(a.status) === 'in_progress' ? 0 : 1;
      const statusPriorityB = normalizeStatus(b.status) === 'in_progress' ? 0 : 1;

      switch (filters.sortBy) {
        case 'name_asc': return nameA.localeCompare(nameB);
        case 'name_desc': return nameB.localeCompare(nameA);
        case 'amount_desc': return amtB - amtA;
        case 'date_asc':
          if (statusPriority !== statusPriorityB) return statusPriority - statusPriorityB;
          return (dateA ?? Number.POSITIVE_INFINITY) - (dateB ?? Number.POSITIVE_INFINITY);
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
      await updateGoal(updatedGoal._id, updatedGoal);
      onRefresh?.();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Failed to save goal changes.');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      await deleteGoal(goalId);
      onRefresh?.();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal.');
    }
  };

  return (
    <>
      {/* Filter Component */}
      <GoalFilters 
        filters={filters} 
        onFilterChange={setFilters} 
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 mt-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Empty Slot / Guide Card */}
                  <Link 
                    to="/goals/new/ai"
                    className="group relative flex flex-col items-center justify-center h-64 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex flex-col items-center text-center px-8">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <Plus className="text-indigo-600 w-8 h-8" strokeWidth={2.5} />
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mb-2">Create Your First Goal</h3>
                      <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[200px]">
                        Talk to our AI advisor to define your financial aspirations.
                      </p>
                      
                      <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                        Start AI Conversation
                      </div>
                    </div>

                    {/* Decorative Sparkles */}
                    <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                    </div>
                  </Link>

                  {/* Placeholder for second column if needed, or just leave it for a cleaner look */}
                  <div className="hidden md:flex flex-col items-center justify-center h-64 bg-slate-50/30 rounded-[2.5rem] border border-slate-100 opacity-50">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Empty Slot</p>
                  </div>
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
                  
                  {/* Add an extra "Quick Add" slot at the end of the list if there are few goals */}
                  {processedGoals.length < 4 && (
                    <Link 
                      to="/goals/new/ai"
                      className="group flex flex-col items-center justify-center h-full min-h-[240px] bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-white transition-all duration-300"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <Plus className="text-slate-400 group-hover:text-indigo-600 w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Add Another Goal</span>
                    </Link>
                  )}
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
    </>
  );
};

export default GoalsOverview;
