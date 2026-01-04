import React from 'react';
import { Plus, Settings2, Calendar } from 'lucide-react';

const WealthNetWorthHeader = ({ summary, onAddAsset }) => {
  return (
    <div className="mb-6">
      {/* Top Bar with Title and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        {/* Left: Title & Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wealth Center</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your assets and analyze your financial health.</p>
        </div>
        
        {/* Right: Actions (Compact FinSet Style) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Date Picker Button */}
          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <span>This month</span>
          </button>
          
          {/* Manage Widgets Button */}
          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Settings2 size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Manage widgets</span>
          </button>
          
          {/* Add Widget / Asset Button (Primary) */}
          <button 
            onClick={onAddAsset} // Note: Parent might want to change this handler later for widget logic
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
          >
            <Plus size={16} />
            <span>Add Widget</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default WealthNetWorthHeader;
