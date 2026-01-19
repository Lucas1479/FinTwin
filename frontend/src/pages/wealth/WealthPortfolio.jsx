import React, { useContext } from 'react';
import { WealthContext } from '../../context/WealthContext';
import AssetLiabilityList from '../../components/wealth/AssetLiabilityList';
import InfoTooltip from '../../components/common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry
import { 
  Download, Plus, Search, Filter, Wallet, Building2, TrendingUp, CreditCard,
  ArrowUpRight, ArrowDownRight, PieChart, ShieldCheck, Banknote
} from 'lucide-react';
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
  const totalLiabilities = data.summary.totalLiabilities || 0;
  const netWorth = data.summary.netWorth || (totalAssets - totalLiabilities);
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  // Colors for the bar (Purple / Cool Theme)
  const COLORS = {
    Cash: 'bg-teal-400',
    Investments: 'bg-indigo-600', // Primary Brand Purple
    Property: 'bg-violet-400',
    Other: 'bg-slate-300'
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { 
    style: 'currency', 
    currency: 'NZD',
    maximumFractionDigits: 0
  }).format(val);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Main Net Worth Card - Enhanced Design (Compact Version) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
        {/* Decorative Background */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/80 to-transparent pointer-events-none"></div>
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-10 translate-y-10">
             <PieChart size={180} />
        </div>

        <div className="p-5 relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={14} className="text-indigo-500" />
                            Net Wealth Position
                        </h2>
                        <InfoTooltip 
                            content="The 'Scorecard' of your financial life. Assets (Owned) minus Liabilities (Owed)."
                            anchor={HELP_ANCHORS.WEALTH.BALANCE_SHEET} 
                        />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-slate-900 tracking-tight">
                            {formatCurrency(netWorth)}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${debtRatio < 30 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {debtRatio.toFixed(1)}% Debt Ratio
                        </span>
                    </div>
                </div>
                
                {/* Secondary Stats */}
                <div className="hidden md:flex gap-6">
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solvency</span>
                        <span className="text-sm font-bold text-slate-700">Healthy</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Liquid Capital</span>
                        <span className="text-sm font-bold text-slate-700">{formatCurrency(data.summary.liquidCapital || 0)}</span>
                     </div>
                </div>
            </div>

            {/* Split Metrics - More Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Assets Side */}
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group/asset">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">Total Assets</span>
                        <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {formatCurrency(totalAssets)}
                            <ArrowUpRight size={16} className="text-emerald-500 opacity-0 group-hover/asset:opacity-100 transition-opacity transform group-hover/asset:translate-x-1" />
                        </div>
                    </div>
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-emerald-600">
                        <TrendingUp size={16} />
                    </div>
                </div>

                {/* Liabilities Side */}
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group/debt">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">Total Liabilities</span>
                        <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            -{formatCurrency(totalLiabilities)}
                            <ArrowDownRight size={16} className="text-rose-500 opacity-0 group-hover/debt:opacity-100 transition-opacity transform group-hover/debt:translate-x-1" />
                        </div>
                    </div>
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-rose-500">
                        <CreditCard size={16} />
                    </div>
                </div>
            </div>

            {/* Allocation Bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Allocation</span>
                </div>
                
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                {Object.entries(composition).map(([key, value]) => {
                    const pct = (value / totalAssets) * 100;
                    if (pct < 1) return null;
                    return (
                    <div 
                        key={key}
                        className={`h-full ${COLORS[key]} hover:opacity-80 transition-all relative group cursor-help`} 
                        style={{ width: `${pct}%` }}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                            {key}: {formatCurrency(value)} ({pct.toFixed(1)}%)
                        </div>
                    </div>
                    );
                })}
                </div>

                {/* Refined Legend - Compact */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                    <LegendItem label="Cash" value={composition.Cash} total={totalAssets} color="bg-teal-400" icon={Wallet} compact />
                    <LegendItem label="Investments" value={composition.Investments} total={totalAssets} color="bg-indigo-600" icon={TrendingUp} compact />
                    <LegendItem label="Property" value={composition.Property} total={totalAssets} color="bg-violet-400" icon={Building2} compact />
                    <LegendItem label="Other" value={composition.Other} total={totalAssets} color="bg-slate-300" icon={Banknote} compact />
                </div>
            </div>
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

const LegendItem = ({ label, value, total, color, icon: Icon, compact }) => (
  <div className="flex items-center gap-1.5 group cursor-default">
    <div className={`w-6 h-6 rounded-md ${color.replace('bg-', 'bg-opacity-10 bg-')} flex items-center justify-center`}>
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
    </div>
    <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors">{label}</span>
        <span className="text-[9px] font-medium text-slate-400">
            {Math.round((value / (total || 1)) * 100)}% • {new Intl.NumberFormat('en-NZ', { notation: "compact", compactDisplay: "short" }).format(value)}
        </span>
    </div>
  </div>
);

export default WealthPortfolio;
