import React, { useContext } from 'react';
import { WealthContext } from '../WealthCenterPage';
import AssetLiabilityList from '../../components/wealth/AssetLiabilityList';
import { Download, Plus, Search, Filter, Wallet, Building2, TrendingUp, CreditCard } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const WealthPortfolio = () => {
  const { data, loading, onAddAsset, onEditAsset, onOpenConversion } = useContext(WealthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Calculate Composition
  const composition = data.assets.reduce((acc, item) => {
    let group = 'Other';
    if (item.category.includes('Cash')) group = 'Cash';
    else if (item.category.includes('Invest') || item.category === 'KiwiSaver') group = 'Investments';
    else if (item.category === 'Property' || item.category === 'Vehicle') group = 'Property';
    
    acc[group] = (acc[group] || 0) + item.value;
    return acc;
  }, { Cash: 0, Investments: 0, Property: 0, Other: 0 });

  const totalAssets = data.summary.totalAssets || 1;
  
  // Colors for the bar (Purple / Cool Theme)
  const COLORS = {
    Cash: 'bg-teal-400',
    Investments: 'bg-indigo-600', // Primary Brand Purple
    Property: 'bg-violet-400',
    Other: 'bg-slate-300'
  };

  return (
    <div className="animate-fade-in">
      
      {/* Page Context Toolbar (Search & Actions) */}
      <div className="flex justify-end items-center gap-3 mb-6">
            <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search assets..." 
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all w-64"
                />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
            </button>

            <button 
                onClick={onAddAsset}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
            >
                <Plus size={18} />
                <span>Add Item</span>
            </button>
      </div>

      {/* Composition Bar (Replaces Cards) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Assets</span>
            <div className="text-4xl font-bold text-slate-900 mt-1 tracking-tight">
              ${data.summary.totalAssets.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Liabilities</span>
             <span className="text-xl font-medium text-slate-600">-${data.summary.totalLiabilities.toLocaleString()}</span>
          </div>
        </div>

        {/* The Bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
           {Object.entries(composition).map(([key, value]) => {
             const pct = (value / totalAssets) * 100;
             if (pct < 0.5) return null;
             return (
               <div 
                 key={key}
                 className={`h-full ${COLORS[key]} hover:opacity-90 transition-all relative group`} 
                 style={{ width: `${pct}%` }}
                 title={`${key}: $${value.toLocaleString()} (${pct.toFixed(1)}%)`}
               ></div>
             );
           })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6">
           <LegendItem label="Cash & Savings" value={composition.Cash} total={totalAssets} color="bg-teal-400" icon={Wallet} />
           <LegendItem label="Investments" value={composition.Investments} total={totalAssets} color="bg-indigo-600" icon={TrendingUp} />
           <LegendItem label="Property & Assets" value={composition.Property} total={totalAssets} color="bg-violet-400" icon={Building2} />
        </div>
      </div>

      {/* Main List */}
      <AssetLiabilityList 
        assets={data.assets} 
        liabilities={data.liabilities} 
        onEdit={onEditAsset}
        onOpenConversion={onOpenConversion}
      />
    </div>
  );
};

const LegendItem = ({ label, value, total, color, icon: Icon }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${color}`}></div>
    <span className="text-sm font-medium text-slate-600">{label}</span>
    <span className="text-xs text-slate-400">
      {Math.round((value / total) * 100)}%
    </span>
  </div>
);

export default WealthPortfolio;
