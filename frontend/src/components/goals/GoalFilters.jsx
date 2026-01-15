import { Calendar, ArrowUpDown, Filter, RotateCcw, XCircle } from 'lucide-react';

const GoalFilters = ({ filters, onFilterChange, onReset, hasActiveFilters }) => {
  // Helper to update a filter field
  const updateFilter = (key, value) => {
    onFilterChange(prev => ({ ...prev, [key]: value }));
  };

  const dateOptions = ['all', 'this_year', 'next_year'];
  const sortOptions = ['date_asc', 'name_asc', 'name_desc', 'amount_desc'];

  const cycleOption = (key, options, current) => {
    const index = options.indexOf(current);
    const nextIndex = index === -1 ? 0 : (index + 1) % options.length;
    updateFilter(key, options[nextIndex]);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm relative z-20">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar w-full md:w-auto">
        
        {/* Date Range Selector */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => cycleOption('dateRange', dateOptions, filters.dateRange)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filters.dateRange !== 'all' ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Calendar size={14} /> 
            {filters.dateRange === 'all' ? 'All time' : filters.dateRange === 'this_year' ? 'This year' : 'Next year'}
          </button>
        </div>

        {/* Sort Selector */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => cycleOption('sortBy', sortOptions, filters.sortBy)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={14} /> 
            Sort by: {filters.sortBy === 'name_asc' ? 'Name A-Z' : filters.sortBy === 'name_desc' ? 'Name Z-A' : filters.sortBy === 'amount_desc' ? 'Highest Amount' : 'Due Date'}
          </button>
        </div>

        <button className="p-2 text-slate-400 hover:text-brand-600 transition-colors hover:bg-slate-50 rounded-xl">
           <Filter size={18} />
        </button>
        
        <div className="w-px h-6 bg-slate-100 mx-2 hidden md:block"></div>

        <div className="flex gap-2 overflow-x-auto">
           {/* Status Toggle: In Progress */}
           <button 
             onClick={() => updateFilter('status', filters.status === 'in_progress' ? 'all' : 'in_progress')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                filters.status === 'in_progress' 
                  ? 'bg-brand-50 text-brand-600 border-brand-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-brand-500 hover:text-brand-600'
             }`}
           >
               In progress 
               {filters.status === 'in_progress' && <XCircle size={12} className="opacity-60 hover:opacity-100"/>}
           </button>

           {/* Status Toggle: Completed */}
           <button 
             onClick={() => updateFilter('status', filters.status === 'completed' ? 'all' : 'completed')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                filters.status === 'completed' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600'
             }`}
           >
               Completed
               {filters.status === 'completed' && <XCircle size={12} className="opacity-60 hover:opacity-100"/>}
           </button>

           {/* Status Toggle: Canceled */}
           <button 
             onClick={() => updateFilter('status', filters.status === 'canceled' ? 'all' : 'canceled')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                filters.status === 'canceled' 
                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-rose-500 hover:text-rose-600'
             }`}
           >
               Canceled
               {filters.status === 'canceled' && <XCircle size={12} className="opacity-60 hover:opacity-100"/>}
           </button>
        </div>
        
        {hasActiveFilters && (
           <button 
             onClick={onReset}
             className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 ml-auto px-4"
           >
              <RotateCcw size={12} /> Reset all
           </button>
        )}
      </div>
    </div>
  );
};

export default GoalFilters;

