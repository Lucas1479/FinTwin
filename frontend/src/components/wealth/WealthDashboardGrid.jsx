import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ArrowUpRight, TrendingUp, CreditCard, Wallet, DollarSign, ChevronDown, Sparkles, Database } from 'lucide-react';
import InfoTooltip from '../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry
import { getWealthHistory } from '../../services/snapshotService';

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
const KpiCard = ({ title, value, change, icon: Icon, breakdown, tooltipContent, anchor }) => {
  const valStr = new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const [integerPart, decimalPart] = valStr.split('.');
  const isPositive = change >= 0;

  return (
    <div className={`${CARD_BASE} flex flex-col justify-between min-h-[140px] relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            {anchor && (
                <InfoTooltip 
                    content={tooltipContent}
                    anchor={anchor} 
                />
            )}
          </div>
          <div className={`p-1.5 rounded-lg bg-slate-50 text-slate-400`}>
            <Icon size={14} />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-baseline font-bold text-slate-900">
            <span className="text-2xl tracking-tight">${integerPart}</span>
            <span className="text-lg text-slate-300 ml-0.5">.{decimalPart}</span>
          </div>
          
          {change !== undefined && !breakdown && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(change)}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
            </div>
          )}
        </div>
      </div>

      {breakdown && (
        <div className="mt-4 relative z-10">
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
            {breakdown.map((item, idx) => (
              <div 
                key={idx} 
                className={`${item.color} h-full transition-all duration-500`} 
                style={{ width: `${item.percent}%` }}
                title={`${item.label}: ${item.percent}%`}
              ></div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.label}</span>
                <span className={`text-[10px] font-bold ${item.textColor}`}>${(item.value / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Background Subtle Gradient for Breakdown Card */}
      {breakdown && (
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tl from-slate-50 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============
const WealthDashboardGrid = ({ assets, liabilities, summary, goals = [], cashFlows = [], onOpenLiquidity, onOpenDebt, onOpenAllocation }) => {
  // Wealth Trend Data Mode State
  const [dataMode, setDataMode] = useState('demo'); // 'demo' | 'real'
  const [realTrendData, setRealTrendData] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  
  // Fetch real trend data when switching to real mode or when summary changes
  useEffect(() => {
    if (dataMode === 'real') {
      fetchRealTrendData();
    }
  }, [dataMode, summary]);
  
  const fetchRealTrendData = async () => {
    setLoadingTrend(true);
    try {
      const response = await getWealthHistory('6m');
      let formatted = [];
      
      if (response.data && response.data.length > 0) {
        // Format historical data for BarChart
        formatted = response.data.map(item => ({
          month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
          assets: item.assets,
          liabilities: item.liabilities
        }));
      }
      
      // Always append current month's data as the latest point
      if (summary.totalAssets > 0 || summary.totalLiabilities > 0) {
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        formatted.push({
          month: currentMonth,
          assets: summary.totalAssets,
          liabilities: summary.totalLiabilities
        });
      }
      
      setRealTrendData(formatted);
    } catch (error) {
      console.error('Failed to fetch wealth history:', error);
      // Fallback: show at least current month
      if (summary.totalAssets > 0 || summary.totalLiabilities > 0) {
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        setRealTrendData([{
          month: currentMonth,
          assets: summary.totalAssets,
          liabilities: summary.totalLiabilities
        }]);
      } else {
        setRealTrendData([]);
      }
    } finally {
      setLoadingTrend(false);
    }
  };
  
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

  // Investment Allocation Logic
  const investmentMetrics = useMemo(() => {
    // 1. Asset Ratio (Stock + Funds + KiwiSaver) / Total Assets
    const investedAssets = assets.filter(a => 
      ['Invest_Shares', 'Invest_ManagedFund', 'KiwiSaver'].includes(a.category)
    ).reduce((sum, a) => sum + a.value, 0);
    
    const investedRatio = summary.totalAssets > 0 
      ? (investedAssets / summary.totalAssets * 100).toFixed(0) 
      : 0;

    // 2. Flow Ratio: Monthly Investment / (Monthly Income - Monthly Living Expenses)
    // This represents "What % of my disposable income am I investing?"
    const incomes = cashFlows.filter(f => f.type === 'Income');
    // Expenses excluding investments
    const expenses = cashFlows.filter(f => ['Expense', 'Subscription'].includes(f.type));
    const investmentFlows = cashFlows.filter(f => f.type === 'Investment');
    
    const toMonthly = (amount, freq) => {
       if (freq === 'Weekly') return amount * 4.33;
       if (freq === 'Fortnightly') return amount * 2.16;
       if (freq === 'Yearly') return amount / 12;
       return amount; // Monthly
    };

    const monthlyIncome = incomes.reduce((sum, f) => sum + toMonthly(f.amount, f.frequency), 0);
    const monthlyLivingCost = expenses.reduce((sum, f) => sum + toMonthly(f.amount, f.frequency), 0);
    const monthlyInvested = investmentFlows.reduce((sum, f) => sum + toMonthly(f.amount, f.frequency), 0);
    
    // Disposable Surplus = Income - Living Expenses (Money available to save or invest)
    const monthlyDisposable = Math.max(0, monthlyIncome - monthlyLivingCost);
    
    // Investment Rate = Investment / Disposable
    const flowRatio = monthlyDisposable > 0 
      ? (monthlyInvested / monthlyDisposable * 100).toFixed(0)
      : 0;

    return {
      investedRatio,
      flowRatio,
      monthlyInvested,
      monthlyDisposable,
      investedAmount: investedAssets
    };
  }, [assets, summary, cashFlows]);

  const allocationGoals = useMemo(() => {
    if (!goals || goals.length === 0) return [];
    
    // Theme Rotation
    const themes = [
      { color: 'bg-indigo-600', bg: 'bg-indigo-100' },
      { color: 'bg-blue-600', bg: 'bg-blue-100' },
      { color: 'bg-emerald-500', bg: 'bg-emerald-100' },
      { color: 'bg-violet-500', bg: 'bg-violet-100' },
      { color: 'bg-amber-500', bg: 'bg-amber-100' },
    ];

    return goals
      .filter(g => g.target_amount > 0) // Only goals with targets
      .sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0)) // Sort by current amount (value)
      .slice(0, 4) // Top 4
      .map((g, idx) => {
        const theme = themes[idx % themes.length];
        return {
          id: g._id || idx,
          name: g.goal_name || g.title || 'Unnamed Goal',
          current: g.current_amount || 0,
          target: g.target_amount || 1,
          category: g.category || 'General',
          ...theme
        };
      });
  }, [goals]);

  // Mock trend data (demo mode)
  const mockTrendData = useMemo(() => {
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
  
  const trendData = dataMode === 'real' ? realTrendData : mockTrendData;
  const hasRealTrendData = realTrendData.length > 0;


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

  const liquidityBreakdown = useMemo(() => {
    let cash = 0;
    let funds = 0;
    assets.forEach(a => {
      // 1. Spendable: Banking and Physical Cash
      if (['Cash_Bank', 'Cash_Physical'].includes(a.category)) {
        cash += a.value;
      }
      
      // 2. Allocated: Managed Funds OR any asset explicitly linked to a goal
      // This ensures that when we create a Goal Portfolio, it's counted here.
      if (['Invest_ManagedFund'].includes(a.category) || a.asset_details?.linked_goal_id) {
        funds += a.value;
      }
    });
    const total = (cash + funds) || 1;
    return [
      { label: 'Spendable', value: cash, percent: (cash / total * 100).toFixed(0), color: 'bg-emerald-500', textColor: 'text-emerald-600' },
      { label: 'Allocated', value: funds, percent: (funds / total * 100).toFixed(0), color: 'bg-indigo-500', textColor: 'text-indigo-600' }
    ];
  }, [assets]);

  return (
    <div className="space-y-6">
      
      {/* === ROW 1: Compact KPI Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Net Worth" value={summary.netWorth} change={5.2} icon={Wallet} />
        <KpiCard title="Total Assets" value={summary.totalAssets} change={3.8} icon={TrendingUp} />
        <KpiCard title="Total Liabilities" value={summary.totalLiabilities} change={-2.1} icon={CreditCard} />
        <KpiCard 
          title="Liquid Capital" 
          value={summary.liquidCapital} 
          icon={DollarSign} 
          breakdown={liquidityBreakdown}
          tooltipContent="Spendable (Cash) vs Allocated (Invested). Your readily available funds."
          anchor={HELP_ANCHORS.WEALTH.LIQUID_CAPITAL}
        />
      </div>

      {/* === ROW 2: Money Flow & Liquidity === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT: Wealth Trend */}
        <div className={`${CARD_BASE} xl:col-span-2 min-w-0`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Wealth Trend</h3>
            <div className="flex items-center gap-4">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setDataMode('demo')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    dataMode === 'demo'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles size={12} />
                  Demo
                </button>
                <button
                  onClick={() => setDataMode('real')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    dataMode === 'real'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Database size={12} />
                  Real
                  {!hasRealTrendData && dataMode === 'real' && (
                    <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded">
                      No Data
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.chart1 }}></span>
                <span className="text-xs font-medium text-slate-500">Assets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span>
                <span className="text-xs font-medium text-slate-500">Liabilities</span>
              </div>
            </div>
          </div>
          
          <div className="h-[220px] min-w-0 relative">
            {loadingTrend && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 font-medium">Loading...</span>
                </div>
              </div>
            )}
            
            {dataMode === 'real' && !loadingTrend && trendData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg z-10">
                <div className="text-center px-6">
                  <Database size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-600 mb-1">No Historical Data</p>
                  <p className="text-[10px] text-slate-400">Snapshots will be created automatically</p>
                </div>
              </div>
            )}
            
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
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
            <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Liquidity</h3>
                <InfoTooltip 
                    content="Breakdown of assets by accessibility: Liquid (Cash), Semi-Liquid (Shares), and Locked (KiwiSaver)."
                    anchor={HELP_ANCHORS.WEALTH.LIQUIDITY_TIERS} 
                />
            </div>
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

      {/* === ROW 3: Allocations & Debt (Split into 3 Equal Cards) === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 1. Funding Alignment (Optimized for Long Names & Ultra-Thick Bars) */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">Funding Alignment</h3>
            <button 
              onClick={onOpenAllocation}
              className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
            </button>
          </div>
          <div className="flex flex-col justify-around h-[180px]">
            {allocationGoals.length > 0 ? (
              allocationGoals.slice(0, 3).map((goal) => {
                const percent = Math.min((goal.current / goal.target) * 100, 100).toFixed(0);
                return (
                  <div key={goal.id} className="group">
                    {/* Extra Thick Progress Bar */}
                    <div className="h-7 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100/50 p-1">
                       <div 
                          className={`h-full ${goal.color} rounded-[7px] transition-all duration-1000 shadow-inner`} 
                          style={{ width: `${percent}%` }} 
                       />
                    </div>

                    {/* Legend Below the Bar */}
                    <div className="flex justify-between items-center mt-1.5 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${goal.color}`} />
                        <span className="text-[11px] font-bold text-slate-600 truncate">{goal.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-indigo-600 ml-2">{percent}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-[140px] border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <p className="text-xs text-slate-400 font-medium italic">No active goals found.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Allocation Strategy (Matching Liquidity Style) */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Allocation Strategy</h3>
            <button 
              className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
            </button>
          </div>
          
          <div className="flex items-center h-[180px]">
             {/* Compact Metrics List - Vertically Distributed */}
             <div className="flex-1 flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.chart1 }}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 leading-none mb-1.5">Asset Mix</p>
                    <p className="text-xs text-slate-400 leading-none">{investmentMetrics.investedRatio}% Stocks/Funds</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.success }}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 leading-none mb-1.5">Flow Rate</p>
                    <p className="text-xs text-slate-400 leading-none">{investmentMetrics.flowRatio}% Reinvested</p>
                  </div>
                </div>
             </div>

             {/* Donut Chart - Matching Liquidity Size */}
             <div className="w-44 h-44 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Number(investmentMetrics.investedRatio), fill: COLORS.chart1 },
                        { value: 100 - Number(investmentMetrics.investedRatio), fill: '#f1f5f9' }
                      ]}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                    />
                    <Pie
                      data={[
                        { value: Number(investmentMetrics.flowRatio), fill: COLORS.success },
                        { value: 100 - Number(investmentMetrics.flowRatio), fill: '#f1f5f9' }
                      ]}
                      innerRadius={42}
                      outerRadius={52}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Strategy</span>
                  <span className="text-sm font-bold text-slate-900">Active</span>
                </div>
             </div>
          </div>
        </div>

        {/* 3. Debt Analysis (Matching Liquidity Style) */}
        <div className={CARD_BASE}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Debt Analysis</h3>
                <InfoTooltip 
                    content="Your Gearing Ratio (Leverage). Shows how much of your asset base is funded by debt."
                    anchor={HELP_ANCHORS.WEALTH.LVR} 
                />
            </div>
            <button 
              onClick={onOpenDebt}
              className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer"
            >
               <ArrowUpRight size={14} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
            </button>
          </div>
          
          <div className="flex items-center h-[180px]">  
            {/* Legend List (Left) - Simplified to high-level totals */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-slate-200"></div>
                <div>
                  <p className="text-sm font-bold text-slate-700 leading-none mb-1.5">Total Assets</p>
                  <p className="text-xs text-slate-400 leading-none">${formatCurrency(summary.totalAssets)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: gearingRatio < 40 ? COLORS.success : gearingRatio < 70 ? '#f59e0b' : COLORS.danger }}></div>
                <div>
                  <p className="text-sm font-bold text-slate-700 leading-none mb-1.5">Total Debt</p>
                  <p className="text-xs text-slate-400 leading-none">${formatCurrency(summary.totalLiabilities)}</p>
                </div>
              </div>
            </div>

            {/* Gearing Donut (Right) - Matching Liquidity Size (Yellow/Risk Style) */}
            <div className="w-44 h-44 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: Number(gearingRatio), fill: gearingRatio < 40 ? COLORS.success : gearingRatio < 70 ? '#f59e0b' : COLORS.danger },
                      { value: Math.max(0, 100 - Number(gearingRatio)), fill: '#f1f5f9' }
                    ]}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={6}
                    strokeWidth={0}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Gearing</span>
                <span className="text-base font-bold text-slate-900">{gearingRatio}%</span>
                <div className={`mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                  gearingRatio < 30 ? 'bg-emerald-50 text-emerald-600' : 
                  gearingRatio < 60 ? 'bg-amber-50 text-amber-600' : 
                  'bg-rose-50 text-rose-600'
                }`}>
                  {gearingRatio < 30 ? 'Low' : gearingRatio < 60 ? 'Med' : 'High'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default WealthDashboardGrid;

