import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as wealthService from '../services/wealthService';
import MainLayout from '../components/layout/MainLayout';
import AddAssetModal from '../components/wealth/AssetFormModal'; // Renamed import
import AssetConversionModal from '../components/wealth/AssetConversionModal';
import WealthOverview from './wealth/WealthOverview';
import WealthPortfolio from './wealth/WealthPortfolio';
import WealthCashflow from './wealth/WealthCashflow';
import { WealthContext } from '../context/WealthContext'; // Import from standalone file
import { 
  LayoutDashboard, Wallet, ArrowRightLeft, Zap, 
  RefreshCw, Search, Download, Plus, Check, AlertCircle, 
  TrendingUp, ArrowDownRight 
} from 'lucide-react';
import InfoTooltip from '../components/common/InfoTooltip';
import { HELP_ANCHORS } from '../constants/helpAnchors';
import { useSimulatedData, useSimulation } from '../context/SimulationContext';
import { getCashFlows, syncCashAssets } from '../services/cashFlowService';
import { getGoals } from '../services/goalService';

const WealthCenterPage = () => {
  const location = useLocation();
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'portfolio' | 'cashflow'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertAsset, setConvertAsset] = useState(null);
  const [convertMode, setConvertMode] = useState('asset-to-cash');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { timeOffset, marketMode } = useSimulation();
  
  const [data, setData] = useState({
    summary: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, liquidCapital: 0 },
    assets: [],
    liabilities: [],
    cashFlows: [],
    goals: []
  });

  const fetchData = async () => {
    try {
      const [summary, assets, cashFlows, goals] = await Promise.all([
        wealthService.getWealthSummary(),
        wealthService.getAssets(),
        getCashFlows(),
        getGoals()
      ]);
      
      const allItems = assets; 
      const actualAssets = allItems.filter(item => item.record_type === 'Asset');
      const actualLiabilities = allItems.filter(item => item.record_type === 'Liability');

      setData({
        summary,
        assets: actualAssets,
        liabilities: actualLiabilities,
        cashFlows: cashFlows || [],
        goals: goals || []
      });
    } catch (error) {
      console.error('Failed to fetch wealth data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const stateTab = location.state?.tab;
    const params = new URLSearchParams(location.search);
    const queryTab = params.get('tab');
    const nextTab = stateTab || queryTab;
    if (nextTab && ['overview', 'portfolio', 'cashflow'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [location.state, location.search]);

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setTimeout(() => setEditingAsset(null), 300);
  };

  const handleOpenConversion = (asset, mode) => {
    setConvertAsset(asset);
    setConvertMode(mode);
    setIsConvertModalOpen(true);
  };

  const handleCloseConversion = () => {
    setIsConvertModalOpen(false);
    setTimeout(() => setConvertAsset(null), 300);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await syncCashAssets({ includeTermDeposits: true });
      const { summary, assetsUpdated, details } = result;
      const daysSynced = details?.[0]?.daysSynced || 0;
      
      setSyncResult({
        success: true,
        message: `Synced ${assetsUpdated} asset(s) over ${daysSynced} days`,
        data: result,
        summary: summary,
      });
      
      await fetchData();
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

  // �?原生PDF打印导出
  const handleExport = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const tabLabels = {
        'overview': 'Overview',
        'portfolio': 'Portfolio',
        'cashflow': 'Cash Flow'
      };
      
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');
      
      const clonedContent = contentRef.current.cloneNode(true);
      clonedContent.querySelectorAll('[data-export-ignore="true"]').forEach(el => el.remove());
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Wealth Center - ${tabLabels[activeTab]}</title>
            <meta charset="UTF-8">
            <style>
              ${styles}
              @media print {
                body { margin: 0; padding: 20px; background: white; }
                button { display: none !important; }
                [data-export-ignore="true"] { display: none !important; }
                @page { margin: 1.5cm; size: A4; }
                h1, h2, h3 { page-break-after: avoid; }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #1e293b;
              }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #6366f1;">
              <h1 style="font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
                Wealth Center - ${tabLabels[activeTab]}
              </h1>
              <p style="color: #64748b; font-size: 14px;">
                Report Generated �?${new Date().toLocaleDateString('en-NZ', { dateStyle: 'long' })}
              </p>
            </div>
            ${clonedContent.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 1000);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`导出失败: ${err.message || '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { 
    style: 'currency', 
    currency: 'NZD',
    minimumFractionDigits: 2 
  }).format(val);

  // --- Simulation Interceptor ---
  // The hook returns { assets, goals, wealth, cashFlows } - we use 'wealth' as our live summary
  const simulatedData = useSimulatedData({
    assets: data.assets,
    liabilities: data.liabilities,
    cashFlows: data.cashFlows,
    goals: data.goals,
    wealth: data.summary // Map 'summary' to 'wealth' for engine compatibility
  });

  const contextValue = { 
    data: {
        ...simulatedData,
        summary: simulatedData?.wealth || data.summary // Use the authoritative summary from engine
    } || data, 
    loading, 
    onAddAsset: () => { setEditingAsset(null); setIsAddModalOpen(true); },
    onEditAsset: handleEditAsset,
    onOpenConversion: handleOpenConversion,
    onRefresh: fetchData
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8">
          
          {/* Level 1: Page Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wealth Center</h1>
                <InfoTooltip 
                    content="Your holistic Balance Sheet: Track Net Worth, Liquidity, and Cash Flow performance."
                    anchor={HELP_ANCHORS.WEALTH.INTRO} 
                />
              </div>
              {timeOffset > 0 && (
                <div className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1 shadow-sm animate-pulse">
                  <Zap size={12} fill="currentColor" /> Simulation Mode
                </div>
              )}
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              {timeOffset > 0 
                ? `Projecting ${timeOffset} years into the future (${marketMode} market conditions)` 
                : "Your financial command center & asset manager."}
            </p>
          </div>

          {/* Level 2: Navigation Tabs & Global Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200">
            <div className="flex items-center gap-1">
              <TabButton 
                id="overview" 
                label="Overview" 
                icon={LayoutDashboard} 
                active={activeTab === 'overview'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="portfolio" 
                label="Portfolio" 
                icon={Wallet} 
                active={activeTab === 'portfolio'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="cashflow" 
                label="Cash Flow" 
                icon={ArrowRightLeft} 
                active={activeTab === 'cashflow'} 
                onClick={setActiveTab} 
              />
            </div>

            {/* Global Actions Toolbar */}
            <div className="flex items-center gap-3 pb-2 md:pb-0">
              {activeTab === 'overview' && (
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
              )}

              {activeTab === 'portfolio' && (
                <>
                  <div className="relative hidden sm:block">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search assets..." 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all w-48"
                    />
                  </div>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} className={isExporting ? 'animate-pulse' : ''} />
                    <span className="hidden lg:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
                  </button>
                  <button 
                    onClick={() => { setEditingAsset(null); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                  >
                    <Plus size={16} />
                    <span>Add Item</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sync Result Toast - Global Position */}
          {syncResult && (
            <div className={`mb-6 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 overflow-hidden ${
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
                <div className="px-4 pb-3 flex items-center gap-6 text-xs border-t border-emerald-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownRight size={14} className={syncResult.summary.totalCashFlowApplied >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                    <span className="text-slate-500">Cash Flow:</span>
                    <span className={`font-bold ${syncResult.summary.totalCashFlowApplied >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {syncResult.summary.totalCashFlowApplied >= 0 ? '+' : ''}{formatCurrency(syncResult.summary.totalCashFlowApplied)}
                    </span>
                  </div>
                  
                  {syncResult.summary.totalInterestEarned > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-500" />
                      <span className="text-slate-500">Interest:</span>
                      <span className="font-bold text-indigo-600">
                        +{formatCurrency(syncResult.summary.totalInterestEarned)}
                      </span>
                    </div>
                  )}
                  
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

          {/* Level 3: Content Area */}
          <div ref={contentRef} className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <WealthContext.Provider value={contextValue}>
              {activeTab === 'overview' && <WealthOverview />}
              {activeTab === 'portfolio' && <WealthPortfolio />}
              {activeTab === 'cashflow' && <WealthCashflow />}
            </WealthContext.Provider>
          </div>

        </div>

        {/* Global Asset Modal (Create/Edit) */}
        <AddAssetModal 
          isOpen={isAddModalOpen} 
          onClose={handleCloseModal} 
          onRefresh={fetchData}
          assetToEdit={editingAsset}
          onOpenConversion={handleOpenConversion}
        />

        <AssetConversionModal
          isOpen={isConvertModalOpen}
          onClose={handleCloseConversion}
          onRefresh={fetchData}
          asset={convertAsset}
          mode={convertMode}
          cashAssets={data.assets}
          nonCashAssets={data.assets}
        />
        
      </div>
    </MainLayout>
  );
};

// Helper components
const TabButton = ({ id, label, icon: Icon, active, onClick, disabled, badge }) => (
  <button
    onClick={() => !disabled && onClick(id)}
    disabled={disabled}
    className={`
      relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2
      ${active 
        ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' 
        : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <Icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400'} />
    <span>{label}</span>
    {badge && (
      <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
        {badge}
      </span>
    )}
  </button>
);

export default WealthCenterPage;
export { WealthContext };





