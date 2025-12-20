import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ArrowUpRight, TrendingUp, CreditCard, Wallet, DollarSign, ChevronDown } from 'lucide-react';

// ============ FINSET STYLE CONSTANTS ============
const COLORS = {
  primary: '#4f46e5',    // Indigo 600 (FinTwin Logo Deep Purple)
  secondary: '#c7d2fe',  // Indigo 200
  accent: '#8b5cf6',     // Violet 500 (Keep for Gearing Ring Accent)
  success: '#10b981',    // Emerald 500
  danger: '#f43f5e',     // Rose 500
  chart1: '#4f46e5',     // Indigo 600 (Deep/Rich)
  chart2: '#818cf8',     // Indigo 400
  chart3: '#a5b4fc',     // Indigo 300
  chart4: '#0f172a',     // Dark Slate
};

// Compact Card Style - Matching Goal Card (shadow-sm)
const CARD_BASE = "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300";

const formatCurrency = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl border border-slate-800">
        <p className="font-bold mb-1 text-slate-300">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></div>
            <p className="font-medium">{p.name}: <span className="text-white">${formatCurrency(p.value)}</span></p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ============ COMPACT KPI CARD ============
const KpiCard = ({ title, value, change, icon: Icon }) => {
  const valStr = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const [integerPart, decimalPart] = valStr.split('.');
  const isPositive = change >= 0;

  return (
    <div className={`${CARD_BASE} flex flex-col justify-between min-h-[140px]`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <button className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group">
          <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </button>
      </div>

      <div className="mt-2">
        <div className="flex items-baseline font-bold text-slate-900">
          <span className="text-2xl tracking-tight">${integerPart}</span>
          <span className="text-lg text-slate-300 ml-0.5">.{decimalPart}</span>
        </div>
        
        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
const WealthDashboardGrid = ({ assets, liabilities, summary, onOpenLiquidity }) => {
  
  // Data Logic (Updated to Industry Standard Tiers)
  const liquidityData = useMemo(() => {
    let t1 = 0; // Tier 1: Liquid Cash (T+0)
    let t2 = 0; // Tier 2: Semi-Liquid / Marketable (T+3)
    let t3 = 0; // Tier 3+4: Fixed / Locked (Illiquid)
    
    const total = summary.totalAssets || 1;
    
    assets.forEach(a => {
      const c = a.category;
      
      // Tier 1: Cash
      if (['Cash_Bank', 'Cash_Physical'].includes(c)) {
        t1 += a.value;
      } 
      // Tier 2: Marketable Securities (Shares + Funds)
      else if (['Invest_Shares', 'Invest_ManagedFund'].includes(c)) {
        t2 += a.value;
      }
      // Tier 3+4: Fixed & Locked (Property, KiwiSaver, TermDeposit, Vehicles)
      else {
        t3 += a.value;
      }
    });

    return [
      { name: 'Liquid', value: t1, fill: COLORS.chart1, percent: ((t1 / total) * 100).toFixed(0) },     // Deep Indigo
      { name: 'Semi-Liquid', value: t2, fill: COLORS.chart2, percent: ((t2 / total) * 100).toFixed(0) }, // Medium Indigo
      { name: 'Locked', value: t3, fill: '#cbd5e1', percent: ((t3 / total) * 100).toFixed(0) },        // Slate (Fixed)
    ].filter(item => item.value > 0);
  }, [assets, summary]);

  const trendData = useMemo(() => {
    const baseAssets = summary.totalAssets || 500000;
    const baseLiabilities = summary.totalLiabilities || 200000;
    return [
      { month: 'Jan', assets: baseAssets * 0.85, liabilities: baseLiabilities * 0.95 },
      { month: 'Feb', assets: baseAssets * 0.88, liabilities: baseLiabilities * 0.94 },
      { month: 'Mar', assets: baseAssets * 0.90, liabilities: baseLiabilities * 0.92 },
      { month: 'Apr', assets: baseAssets * 0.92, liabilities: baseLiabilities * 0.90 },
      { month: 'May', assets: baseAssets * 0.95, liabilities: baseLiabilities * 0.88 },
      { month: 'Jun', assets: baseAssets * 0.98, liabilities: baseLiabilities * 0.85 },
      { month: 'Jul', assets: baseAssets, liabilities: baseLiabilities },
    ];
  }, [summary]);

  const liabilityBreakdown = useMemo(() => {
    const grouped = {};
    liabilities.forEach(l => {
      const type = l.category.replace(/_/g, ' ');
      grouped[type] = (grouped[type] || 0) + l.value;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [liabilities]);

  const gearingRatio = summary.totalAssets > 0 
    ? ((summary.totalLiabilities / summary.totalAssets) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* === ROW 1: Compact KPI Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Net Worth" value={summary.netWorth} change={5.2} icon={Wallet} />
        <KpiCard title="Total Assets" value={summary.totalAssets} change={3.8} icon={TrendingUp} />
        <KpiCard title="Total Liabilities" value={summary.totalLiabilities} change={-2.1} icon={CreditCard} />
        <KpiCard title="Liquid Capital" value={summary.liquidCapital} change={8.4} icon={DollarSign} />
      </div>

      {/* === ROW 2: Money Flow & Liquidity === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT: Wealth Trend */}
        <div className={`${CARD_BASE} xl:col-span-2`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Wealth Trend</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.chart1 }}></span>
                <span className="text-xs font-medium text-slate-500">Assets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span>
                <span className="text-xs font-medium text-slate-500">Liabilities</span>
              </div>
              <button className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                This year <ChevronDown size={12} />
              </button>
            </div>
          </div>
          
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={8} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="assets" name="Assets" fill={COLORS.chart1} radius={[4, 4, 4, 4]} barSize={20} />
                <Bar dataKey="liabilities" name="Liabilities" fill={COLORS.secondary} radius={[4, 4, 4, 4]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: Liquidity Structure (FinSet Budget Style - Optimized) */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Liquidity</h3>
            <button 
              onClick={onOpenLiquidity}
              className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
            </button>
          </div>

          <div className="flex items-center h-[180px]">  
            {/* Legend List (Left) - Vertically Distributed */}
            <div className="flex-1 flex flex-col justify-center space-y-5">
              {liquidityData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 leading-none mb-1">{item.name}</p>
                    <p className="text-xs text-slate-400 leading-none">{item.percent}% of total</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart (Right) - Larger & Centered */}
            <div className="w-44 h-44 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liquidityData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    cornerRadius={6}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {liquidityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total</span>
                <span className="text-base font-bold text-slate-900">${(summary.totalAssets / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === ROW 3: Allocations & Debt === */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* LEFT: Capital Allocation */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Allocation Goals</h3>
            <button className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>
          </div>
          <div className="space-y-5">
            {[
              { name: 'Retirement', current: 165000, target: 500000, color: 'bg-indigo-600', bg: 'bg-indigo-100' },
              { name: 'House Deposit', current: 85000, target: 120000, color: 'bg-blue-600', bg: 'bg-blue-100' },
              { name: 'Emergency', current: 25000, target: 30000, color: 'bg-emerald-500', bg: 'bg-emerald-100' }
            ].map((goal, idx) => {
              const percent = Math.min((goal.current / goal.target) * 100, 100).toFixed(0);
              return (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">{goal.name}</span>
                    <span className="text-sm font-bold text-slate-900">${(goal.current / 1000).toFixed(0)}k <span className="text-slate-300 text-xs font-normal">/ ${(goal.target / 1000).toFixed(0)}k</span></span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`absolute top-0 left-0 h-full rounded-full ${goal.color}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Debt & Gearing */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Debt Analysis</h3>
            <button className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors">
               <ArrowUpRight size={14} className="text-slate-400" />
            </button>
          </div>
          <div className="flex gap-6 items-center">
             <div className="w-28 h-28 relative flex-shrink-0">
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="56" cy="56" r="48" fill="none" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />
                 <circle 
                    cx="56" cy="56" r="48" fill="none" stroke={gearingRatio < 50 ? COLORS.success : COLORS.accent} 
                    strokeWidth="8" 
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - gearingRatio / 100)}`}
                    strokeLinecap="round"
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-2xl font-bold text-slate-900">{gearingRatio}%</span>
                 <span className="text-[10px] text-slate-400 uppercase font-semibold">Gearing</span>
               </div>
             </div>
             <div className="flex-1 space-y-3">
               {liabilityBreakdown.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0">
                   <p className="text-xs font-semibold text-slate-700">{item.name}</p>
                   <p className="text-xs font-bold text-slate-900">{formatCurrency(item.value)}</p>
                 </div>
               ))}
               <p className="text-xs font-medium text-slate-400 pt-1">
                  Leverage is <span className={`font-bold ${gearingRatio < 50 ? 'text-emerald-600' : 'text-violet-500'}`}>{gearingRatio < 30 ? 'Low' : gearingRatio < 60 ? 'Moderate' : 'High'}</span>
               </p>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default WealthDashboardGrid;

