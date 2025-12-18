import React, { useContext } from 'react';
import { WealthContext } from '../WealthCenterPage'; // Import from parent
import WealthDashboardGrid from '../../components/wealth/WealthDashboardGrid';
import { Loader2, Plus, Calendar, Settings2 } from 'lucide-react';

const WealthOverview = () => {
  const { data, loading, onAddAsset } = useContext(WealthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview Toolbar (Right Aligned) */}
      <div className="flex justify-end items-center gap-3 mb-2">
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
          
          {/* Add Widget Button */}
          <button 
            onClick={onAddAsset} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
          >
            <Plus size={16} />
            <span>Add Widget</span>
          </button>
      </div>

      {/* 2. Dashboard Grid (The Core Analysis) */}
      <WealthDashboardGrid 
          assets={data.assets} 
          liabilities={data.liabilities} 
          summary={data.summary} 
      />
    </div>
  );
};

export default WealthOverview;

