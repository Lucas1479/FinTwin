import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getGoals, updateGoal, deleteGoal } from '../../services/goalService';
import GoalCard from '../../components/goals/GoalCard';
import GoalSummaryWidget from '../../components/goals/GoalSummaryWidget';
import SavingsOverviewWidget from '../../components/goals/SavingsOverviewWidget';
import GoalFilters from '../../components/goals/GoalFilters';
import GoalDetailModal from '../../components/goals/GoalDetailModal';

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
      // If it's a mock goal (starts with 'mock-'), we can't save to backend. 
      if (updatedGoal._id.startsWith('mock-')) {
        alert('Mock goal - cannot save to backend.');
        handleCloseModal();
        return;
      }

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
      if (goalId.startsWith('mock-')) {
        alert('Mock goal - cannot delete from backend.');
        handleCloseModal();
        return;
      }

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
    </>
  );
};

export default GoalsOverview;
