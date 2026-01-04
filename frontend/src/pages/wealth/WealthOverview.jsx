import React, { useContext, useState } from 'react';
import { WealthContext } from '../WealthCenterPage';
import WealthDashboardGrid from '../../components/wealth/WealthDashboardGrid';
import LiquidityDetailModal from '../../components/wealth/LiquidityDetailModal';
import { syncCashAssets } from '../../services/cashFlowService';
import { Loader2, Plus, Calendar, Settings2, RefreshCw, Check, AlertCircle, TrendingUp, ArrowDownRight } from 'lucide-react';

const WealthOverview = () => {
  const { data, loading, onAddAsset, onRefresh } = useContext(WealthContext);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { success, message, data }
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [includeTermDeposits, setIncludeTermDeposits] = useState(true); // Sync term deposits by default

  const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { 
    style: 'currency', 
    currency: 'NZD',
    minimumFractionDigits: 2 
  }).format(val);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await syncCashAssets({ includeTermDeposits });
      
      // Build detailed message
      const { summary, assetsUpdated, details } = result;
      const daysSynced = details?.[0]?.daysSynced || 0;
      
      setSyncResult({
        success: true,
        message: `Synced ${assetsUpdated} asset(s) over ${daysSynced} days`,
        data: result,
        summary: summary,
      });
      
      // Refresh wealth data to reflect new values
      if (onRefresh) {
        await onRefresh();
      }
      
      // Auto-hide success message after 8 seconds (longer to show details)
      setTimeout(() => setSyncResult(null), 8000);
    } catch (error) {
      setSyncResult({
        success: false,
        message: error.response?.data?.message || 'Sync failed. Please try again.',
        data: null,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Sync Result Toast - Enhanced with Interest Details */}
      {syncResult && (
        <div className={`rounded-2xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 overflow-hidden ${
          syncResult.success 
            ? 'bg-emerald-50 border border-emerald-200' 
            : 'bg-rose-50 border border-rose-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 ${syncResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
            {syncResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold">{syncResult.message}</span>
            <button 
              onClick={() => setSyncResult(null)} 
              className="ml-auto text-current opacity-50 hover:opacity-100 text-lg"
            >
              ×
            </button>
          </div>
          
          {/* Detailed Summary (Only on success) */}
          {syncResult.success && syncResult.summary && (
            <div className="px-4 pb-3 flex items-center gap-6 text-xs">
              {/* Cash Flow */}
              <div className="flex items-center gap-1.5">
                <ArrowDownRight size={14} className={syncResult.summary.totalCashFlowApplied >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                <span className="text-slate-500">Cash Flow:</span>
                <span className={`font-bold ${syncResult.summary.totalCashFlowApplied >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {syncResult.summary.totalCashFlowApplied >= 0 ? '+' : ''}{formatCurrency(syncResult.summary.totalCashFlowApplied)}
                </span>
              </div>
              
              {/* Interest Earned */}
              {syncResult.summary.totalInterestEarned > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-500" />
                  <span className="text-slate-500">Interest Earned:</span>
                  <span className="font-bold text-indigo-600">
                    +{formatCurrency(syncResult.summary.totalInterestEarned)}
                  </span>
                </div>
              )}
              
              {/* Net Change */}
              <div className="flex items-center gap-1.5 ml-auto bg-white/50 px-2.5 py-1 rounded-lg">
                <span className="text-slate-500">Net:</span>
                <span className={`font-bold ${syncResult.summary.totalNetChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {syncResult.summary.totalNetChange >= 0 ? '+' : ''}{formatCurrency(syncResult.summary.totalNetChange)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Toolbar (Right Aligned) */}
      <div className="flex justify-end items-center gap-3 mb-2">
          {/* Sync Cash Button */}
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              syncing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
            }`}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Cash'}</span>
          </button>

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
          onOpenLiquidity={() => setIsLiquidityModalOpen(true)}
      />

      {/* 3. Drill-down Modals */}
      <LiquidityDetailModal 
        isOpen={isLiquidityModalOpen}
        onClose={() => setIsLiquidityModalOpen(false)}
        assets={data.assets}
      />
    </div>
  );
};

export default WealthOverview;

