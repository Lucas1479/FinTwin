import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Landmark, Activity, Percent } from 'lucide-react';

const MetricCard = ({ title, amount, subtext, icon: Icon, colorClass, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">
            {amount}
        </h3>
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={22} />
      </div>
    </div>
    {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
            <span className={trend > 0 ? 'text-emerald-600' : 'text-red-600'}>
                {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-gray-400">vs last month</span>
        </div>
    )}
  </div>
);

const WealthSummaryCards = ({ summary }) => {
  const formatCurrency = (val) => '$' + new Intl.NumberFormat('en-NZ').format(val);
  
  // Calculate Health Metrics
  const totalAssets = summary.totalAssets || 0;
  const totalLiabilities = summary.totalLiabilities || 0;
  // Handle division by zero
  const gearingRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <MetricCard 
        title="Net Worth" 
        amount={formatCurrency(summary.netWorth)}
        subtext="Total Assets - Total Liabilities"
        icon={Landmark}
        colorClass="bg-indigo-50 text-indigo-600"
        trend={2.4}
      />
      
      <MetricCard 
        title="Total Assets" 
        amount={formatCurrency(summary.totalAssets)}
        subtext="Across 4 categories"
        icon={TrendingUp}
        colorClass="bg-emerald-50 text-emerald-600"
        trend={1.8}
      />
      
      <MetricCard 
        title="Total Liabilities" 
        amount={formatCurrency(summary.totalLiabilities)}
        subtext="Mortgages & Loans"
        icon={TrendingDown}
        colorClass="bg-red-50 text-red-600"
        trend={-0.5}
      />

      {/* Financial Health Indicator */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
         <div>
             <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-500 mb-1">Gearing Ratio</p>
                <div className={`p-2 rounded-lg ${gearingRatio < 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Activity size={18} />
                </div>
             </div>
             <div className="flex items-end gap-2">
                 <h3 className="text-2xl font-bold text-gray-900">{gearingRatio}%</h3>
                 <span className="text-xs text-gray-400 mb-1.5">Debt / Assets</span>
             </div>
         </div>
         
         <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
             <div 
                className={`h-full rounded-full transition-all duration-500 ${gearingRatio < 30 ? 'bg-emerald-500' : gearingRatio < 60 ? 'bg-amber-400' : 'bg-red-500'}`} 
                style={{ width: `${Math.min(gearingRatio, 100)}%` }}
             ></div>
         </div>
         <p className="text-xs text-gray-400 mt-2">
             {gearingRatio < 30 ? 'Healthy leverage' : gearingRatio < 60 ? 'Moderate leverage' : 'High leverage'}
         </p>
      </div>
    </div>
  );
};

export default WealthSummaryCards;
