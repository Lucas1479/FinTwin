import React, { useState, useEffect, createContext } from 'react';
import * as wealthService from '../services/wealthService';
import MainLayout from '../components/layout/MainLayout';
import AddAssetModal from '../components/wealth/AssetFormModal'; // Renamed import
import WealthOverview from './wealth/WealthOverview';
import WealthPortfolio from './wealth/WealthPortfolio';
import WealthCashflow from './wealth/WealthCashflow';
import { LayoutDashboard, Wallet, ArrowRightLeft } from 'lucide-react';

export const WealthContext = createContext(null);

const WealthCenterPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'portfolio' | 'cashflow'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [data, setData] = useState({
    summary: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, liquidCapital: 0 },
    assets: [],
    liabilities: []
  });

  const fetchData = async () => {
    try {
      const [summary, assets] = await Promise.all([
        wealthService.getWealthSummary(),
        wealthService.getAssets()
      ]);
      
      const allItems = assets; 
      const actualAssets = allItems.filter(item => item.record_type === 'Asset');
      const actualLiabilities = allItems.filter(item => item.record_type === 'Liability');

      setData({
        summary,
        assets: actualAssets,
        liabilities: actualLiabilities
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

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setTimeout(() => setEditingAsset(null), 300);
  };

  const contextValue = { 
    data, 
    loading, 
    onAddAsset: () => { setEditingAsset(null); setIsAddModalOpen(true); },
    onEditAsset: handleEditAsset
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-8">
          
          {/* Level 1: Page Title */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wealth Center</h1>
            <p className="text-slate-500 mt-1 text-sm">Your financial command center & asset manager.</p>
          </div>

          {/* Level 2: Navigation Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
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

          {/* Level 3: Content Area */}
          <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
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
