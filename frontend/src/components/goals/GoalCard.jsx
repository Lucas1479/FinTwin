import { useNavigate } from 'react-router-dom';
import { Calendar, Pencil } from 'lucide-react';

// Helper for currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Helper for date formatting
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-NZ', options);
};

// Helper to calculate days left
const getDaysLeft = (targetDate) => {
  if (!targetDate) return '';
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays} days left` : 'Due or Passed';
};

const GoalCard = ({ goal, onClick }) => {
  const navigate = useNavigate();
  const progress = Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100)) || 0;
  const leftToComplete = Math.max(0, goal.target_amount - goal.current_amount);

  // Status mapping
  let displayStatus = goal.status || 'In Progress';
  if (displayStatus === 'Active') displayStatus = 'In Progress';
  if (displayStatus === 'Completed') displayStatus = 'Finished';

  const statusStyles = {
    'Not Started': 'bg-yellow-50 text-yellow-700 border-yellow-100',
    'In Progress': 'bg-green-50 text-green-700 border-green-100',
    'Finished': 'bg-brand-50 text-brand-700 border-brand-100',
    'Canceled': 'bg-red-50 text-red-700 border-red-100',
  };
  
  const statusColor = statusStyles[displayStatus] || 'bg-slate-50 text-slate-600 border-slate-100';

  // Bar color
  let barColor = 'bg-brand-500';
  if (progress < 30) barColor = 'bg-brand-300';
  else if (progress > 80) barColor = 'bg-green-500';

  const handleClick = () => {
    if (onClick) {
        onClick(goal);
    } else {
        // Fallback to navigation if no onClick handler provided
        navigate(`/goals/${goal._id}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group relative flex flex-col justify-between h-full cursor-pointer"
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base mb-0.5 group-hover:text-brand-600 transition-colors truncate pr-2">
              {goal.title || goal.goal_name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Calendar size={12} className="text-slate-400" />
              <span>Due {formatDate(goal.target_date || goal.due_date)}</span>
            </div>
          </div>
          <button 
            className="p-1.5 -mr-1.5 -mt-1.5 rounded-lg text-slate-300 hover:bg-slate-50 hover:text-brand-600 transition-colors"
            aria-label="Edit goal"
          >
            <Pencil size={14} />
          </button>
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-xl font-bold text-slate-900">{formatCurrency(goal.current_amount || 0)}</span>
          <span className="text-xs font-medium text-slate-400">/ {formatCurrency(goal.target_amount)}</span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-slate-50 rounded-full overflow-hidden mb-2">
          <div 
            className={`absolute top-0 left-0 h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-[11px] mb-4">
          <span className={`font-bold px-1.5 py-0.5 rounded ${progress > 0 ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
            {Math.round(progress)}%
          </span>
          <span className="text-slate-400 font-medium">
             Left <span className="text-slate-700 font-bold ml-0.5">{formatCurrency(leftToComplete)}</span>
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-auto">
         <div className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 border ${statusColor}`}>
            <div className="w-1 h-1 rounded-full bg-current"></div>
            {displayStatus}
         </div>
         <span className="text-[10px] text-slate-400 font-medium">
            {getDaysLeft(goal.target_date || goal.due_date)}
         </span>
      </div>
    </div>
  );
};

export default GoalCard;
