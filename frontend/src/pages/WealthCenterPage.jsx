import React, { useState, useEffect } from 'react';
import * as wealthService from '../services/wealthService';
import MainLayout from '../components/layout/MainLayout';
import WealthNetWorthHeader from '../components/wealth/WealthNetWorthHeader';
import WealthDashboardGrid from '../components/wealth/WealthDashboardGrid';
import AssetLiabilityList from '../components/wealth/AssetLiabilityList';
import { Loader2 } from 'lucide-react';

const WealthCenterPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, liquidCapital: 0 },
    assets: [],
    liabilities: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summary, assets] = await Promise.all([
          wealthService.getWealthSummary(),
          wealthService.getAssets()
        ]);
        
        // Backend returns 'record_type' field to distinguish Asset vs Liability
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

    fetchData();
  }, []);

  return (
    <MainLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50/50 pb-20">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 animate-fade-in">
            
            {/* 1. Header (Big Numbers + Quick Stats) */}
            <WealthNetWorthHeader summary={data.summary} />

            {/* 2. Dashboard Grid (The Core Analysis) */}
            <WealthDashboardGrid 
                assets={data.assets} 
                liabilities={data.liabilities} 
                summary={data.summary} 
            />

            {/* 3. Detailed Management (The Inventory) */}
            <div className="mt-10 pt-8 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Portfolio Holdings</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {data.assets.length} assets · {data.liabilities.length} liabilities
                        </p>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                        Export CSV
                    </button>
                </div>
                <AssetLiabilityList assets={data.assets} liabilities={data.liabilities} />
            </div>

          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default WealthCenterPage;
