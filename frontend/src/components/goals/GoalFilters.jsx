import { useState } from 'react';
import { Calendar, ArrowUpDown, Filter, RotateCcw, XCircle } from 'lucide-react';

const GoalFilters = ({ filters, onFilterChange, onReset, hasActiveFilters }) => {
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Helper to update a filter field
  const updateFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
    if (key === 'dateRange') setIsDateDropdownOpen(false);
    if (key === 'sortBy') setIsSortDropdownOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm relative z-20">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar w-full md:w-auto">
        
        {/* Date Range Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filters.dateRange !== 'all' ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Calendar size={14} /> 
            {filters.dateRange === 'all' ? 'All time' : filters.dateRange === 'this_year' ? 'This year' : filters.dateRange}
          </button>
          
          {isDateDropdownOpen && (
             <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => updateFilter('dateRange', 'this_year')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">This year</button>
                <button onClick={() => updateFilter('dateRange', 'next_year')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">Next year</button>
                <button onClick={() => updateFilter('dateRange', 'all')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 border-t border-slate-50">All time</button>
             </div>
          )}
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={14} /> 
            Sort by: {filters.sortBy === 'name_asc' ? 'Name A-Z' : filters.sortBy === 'name_desc' ? 'Name Z-A' : filters.sortBy === 'amount_desc' ? 'Highest Amount' : 'Date'}
          </button>

          {isSortDropdownOpen && (
             <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => updateFilter('sortBy', 'name_asc')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">Name (A-Z)</button>
                <button onClick={() => updateFilter('sortBy', 'name_desc')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">Name (Z-A)</button>
                <button onClick={() => updateFilter('sortBy', 'amount_desc')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">Highest Amount</button>
                <button onClick={() => updateFilter('sortBy', 'date_asc')} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700">Due Date (Soonest)</button>
             </div>
          )}
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

           {/* Status Toggle: Not Started */}
           <button 
             onClick={() => updateFilter('status', filters.status === 'not_started' ? 'all' : 'not_started')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border whitespace-nowrap transition-colors ${
                filters.status === 'not_started' 
                  ? 'bg-yellow-50 text-yellow-600 border-yellow-100' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-yellow-500 hover:text-yellow-600'
             }`}
           >
               Not started
               {filters.status === 'not_started' && <XCircle size={12} className="opacity-60 hover:opacity-100"/>}
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

