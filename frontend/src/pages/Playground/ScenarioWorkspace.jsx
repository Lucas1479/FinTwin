import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, CheckCircle2, TrendingUp, Shield, ShoppingBag, Activity, Target, Zap, Info, ChevronRight, BarChart3, PieChart as PieChartIcon, RefreshCw, AlertCircle, Plus, Minus, ArrowRightLeft, Landmark, Wallet, Briefcase, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Cell, Pie, ReferenceLine, BarChart, Bar } from 'recharts';
import productService from '../../services/productService';
import InfoTooltip from '../../components/common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry

// --- Helper: compute exposure using real product allocation (fallback to strategy tags) ---
const computeExposureFromProducts = (portfolio, productsMap) => {
  if (!portfolio) return { growth: 0, defensive: 0, liquidity: 0 };
  return portfolio.products.reduce(
    (acc, item) => {
      const product = productsMap[item.productId] || {};
      const weightFactor = (item.weight || 0) / 100;

      // Prefer detailed allocation if available
      const alloc = product.allocation || {};
      const growthAlloc =
        (alloc.equities || 0) + (alloc.property || 0) + (alloc.other || 0);
      const defensiveAlloc = (alloc.bonds || 0);
      const liquidityAlloc = (alloc.cash || 0);

      if (growthAlloc + defensiveAlloc + liquidityAlloc > 0) {
        acc.growth += growthAlloc * weightFactor;
        acc.defensive += defensiveAlloc * weightFactor;
        acc.liquidity += liquidityAlloc * weightFactor;
      } else {
        // Fallback by strategy/category
        const strategy = (product.riskLevel || product.strategy || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        if (category.includes('term') || category.includes('cash') || category.includes('savings')) {
          acc.liquidity += 100 * weightFactor;
        } else if (strategy.includes('defensive') || strategy.includes('conservative')) {
          acc.defensive += 100 * weightFactor;
        } else if (strategy.includes('balanced')) {
          acc.growth += 60 * weightFactor;
          acc.defensive += 40 * weightFactor;
        } else {
          acc.growth += 100 * weightFactor;
        }
      }
      return acc;
    },
    { growth: 0, defensive: 0, liquidity: 0 }
  );
};

// --- Helper: build default portfolios (approximate AI Stage 3 intent) ---
const pickTop = (arr, n) => arr.slice(0, n).map(p => p.id);
const buildDefaultPortfolios = (products = []) => {
  if (!products.length) return [];
  // Buckets
  const growth = products
    .filter(p => (p.strategy || p.riskLevel || '').match(/Growth|Aggressive/i))
    .sort((a, b) => (b.returns?.['5y'] || 0) - (a.returns?.['5y'] || 0) || (a.fees || 0) - (b.fees || 0));
  const balanced = products
    .filter(p => (p.strategy || p.riskLevel || '').match(/Balanced/i))
    .sort((a, b) => (a.fees || 0) - (b.fees || 0));
  const defensive = products
    .filter(p => (p.strategy || p.riskLevel || '').match(/Defensive|Conservative/i))
    .sort((a, b) => (a.fees || 0) - (b.fees || 0));
  const liquidity = products
    .filter(p => (p.category || '').match(/TermDeposit|Savings/i))
    .sort((a, b) => (a.fees || 0) - (b.fees || 0));

  const pickOrFallback = (bucket, fallbackBucket) => {
    const chosen = bucket.length ? bucket : fallbackBucket;
    return chosen.length ? chosen[0] : null;
  };

  const g1 = pickOrFallback(growth, balanced);
  const g2 = pickOrFallback(growth.slice(1), balanced);
  const d1 = pickOrFallback(defensive, balanced);
  const d2 = pickOrFallback(defensive.slice(1), balanced);
  const l1 = pickOrFallback(liquidity, defensive.length ? defensive : balanced);

  const mkProduct = (p, weight) => (p ? { productId: p.id, weight } : null);

  return [
    {
      id: 'p1',
      name: 'Smart Saver (Low Cost)',
      products: [mkProduct(g1, 50), mkProduct(d1, 30), mkProduct(l1, 20)].filter(Boolean),
    },
    {
      id: 'p2',
      name: 'Global Diversifier',
      products: [mkProduct(g1, 60), mkProduct(d1, 25), mkProduct(l1, 15)].filter(Boolean),
    },
    {
      id: 'p3',
      name: 'Alpha Growth',
      products: [mkProduct(g1, 70), mkProduct(g2 || d1, 20), mkProduct(l1, 10)].filter(Boolean),
    },
  ].filter(p => p.products.length > 0);
};

const FALLBACK_GOALS = [
  { id: 'goal_1', name: 'Dream Home in Auckland', category: 'home', target_amount: 1200000, current_amount: 150000, due_date: '2030-12-31', icon: 'home' },
  { id: 'goal_2', name: 'Comfortable Retirement', category: 'retirement', target_amount: 2500000, current_amount: 250000, due_date: '2055-01-01', icon: 'retirement' },
  { id: 'goal_3', name: 'Child Education Fund', category: 'education', target_amount: 150000, current_amount: 20000, due_date: '2040-06-30', icon: 'education' },
  { id: 'goal_4', name: 'Tesla Model S', category: 'vehicle', target_amount: 140000, current_amount: 5000, due_date: '2026-10-15', icon: 'vehicle' }
];

// --- Simulation Logic ---

const runMonteCarlo = (params, exposure, years, targetAmount, isInflationAdjusted) => {
  const iterations = 100; 
  const allProjections = [];
  
  // Baseline rates
  const growthRate = 0.10;
  const defensiveRate = 0.04;
  const liquidityRate = 0.02;
  const inflationRate = isInflationAdjusted ? 0.025 : 0; // 2.5% annual inflation adjustment
  
  const nominalExpectedReturn = (exposure.growth * growthRate) + (exposure.defensive * defensiveRate) + (exposure.liquidity * liquidityRate);
  const realExpectedReturn = nominalExpectedReturn - (inflationRate * 100);
  const volatility = (exposure.growth * 0.18) + (exposure.defensive * 0.05); 
  
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    let balance = params.initialCapital + params.lumpSum;
    const annualContribution = params.monthlyContribution * 12;
    const yearlyData = [Math.round(balance)]; // Year 0 is starting point
    
    for (let y = 1; y <= years; y++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      const periodicReturn = realExpectedReturn + z0 * volatility;
      
      balance = (balance + annualContribution) * (1 + periodicReturn / 100);
      yearlyData.push(Math.max(0, Math.round(balance))); // Ensure balance doesn't go negative
    }
    
    if (balance >= targetAmount) {
      successCount++;
    }
    allProjections.push(yearlyData);
  }

  const successProbability = (successCount / iterations) * 100;

  const summaryData = [];
  for (let y = 0; y <= years; y++) {
    const yearValues = allProjections.map(proj => proj[y]).sort((a, b) => a - b);
    summaryData.push({
      year: y,
      median: yearValues[Math.floor(iterations * 0.5)],
      low: yearValues[Math.floor(iterations * 0.1)],
      high: yearValues[Math.floor(iterations * 0.9)],
    });
  }
  return { summaryData, expectedReturn: nominalExpectedReturn, volatility, successProbability };
};

// --- Sub-Components ---

const ConfigCard = ({ title, icon: Icon, children, isActive, badge }) => (
  <div className={`bg-white p-6 rounded-[2.5rem] border transition-all duration-500 ${isActive ? 'border-indigo-200 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}>
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400'}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      {badge && (
        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider">
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

const ScenarioWorkspace = ({ scenarioId, scenario, onBack, onSave, profiles, goals = [], goalsLoading }) => {
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [activeGoalId, setActiveGoalId] = useState(null);

  // --- Stage 2 State: Strategy ---
  const [exposure, setExposure] = useState({ growth: 50, defensive: 30, liquidity: 20 });
  const [monthlyContribution, setMonthlyContribution] = useState(2000);
  const [lumpSum, setLumpSum] = useState(10000);
  const [isInflationAdjusted, setIsInflationAdjusted] = useState(true);

  // --- Stage 3 State: Portfolio ---
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [customPortfolios, setCustomPortfolios] = useState([]);
  const [isSwapping, setIsSwapping] = useState(null); 

  const productsMap = useMemo(
    () => Object.fromEntries((products || []).map(p => [p.id, p])),
    [products]
  );

  // Load real products (approx AI Stage 3)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setProductsLoading(true);
      try {
        const resp = await productService.getProducts({ limit: 150, sortBy: 'fees', sortOrder: 'asc' });
        const list = resp?.products || [];
        if (!mounted) return;
        setProducts(list);
        const defaults = buildDefaultPortfolios(list);
        setCustomPortfolios(defaults);
        if (defaults[0]) {
          setSelectedPortfolioId(defaults[0].id);
        }
      } catch (err) {
        console.error('[ScenarioWorkspace] Failed to load products', err);
      } finally {
        if (mounted) setProductsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activePortfolio = useMemo(() => 
    customPortfolios.find(p => p.id === selectedPortfolioId), 
    [customPortfolios, selectedPortfolioId]
  );

  const goalOptions = useMemo(
    () => (goals?.length ? goals : FALLBACK_GOALS),
    [goals]
  );

  const portfolioExposure = useMemo(
    () => computeExposureFromProducts(activePortfolio, productsMap),
    [activePortfolio, productsMap]
  );

  useEffect(() => {
    setExposure({
      growth: Math.round(portfolioExposure.growth),
      defensive: Math.round(portfolioExposure.defensive),
      liquidity: Math.round(portfolioExposure.liquidity)
    });
  }, [portfolioExposure]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));

      const profile =
        profiles.find(p => p.id === scenario?.profileId) ||
        scenario?.profile ||
        profiles[0];
      const goal = goalOptions.find(g => g.id === scenario?.goalId) || goalOptions[0];
      
      setActiveProfile(profile);
      setActiveProfileId(profile?.id || scenario?.profileId || null);
      setActiveGoal(goal);
      setActiveGoalId(goal?.id || null);
      setMonthlyContribution(
        scenario?.monthlyContribution ??
        (profile?.income?.annualGross ? Math.round(profile.income.annualGross / 60) : 0)
      );
      setLumpSum(scenario?.lumpSum ?? 10000);
      setIsInflationAdjusted(scenario?.isInflationAdjusted ?? true);
      setLoading(false);
    };
    init();
  }, [profiles, scenario, goalOptions]);

  const handleGoalChange = (goalId) => {
    const nextGoal = goalOptions.find((g) => g.id === goalId);
    setActiveGoal(nextGoal || null);
    setActiveGoalId(nextGoal?.id || null);
  };

  const handleProfileChange = (profileId) => {
    const nextProfile = profiles.find((p) => p.id === profileId);
    setActiveProfile(nextProfile || null);
    setActiveProfileId(nextProfile?.id || null);
    if (nextProfile) {
      setMonthlyContribution(scenario?.monthlyContribution || Math.round(nextProfile.income.annualGross / 60));
    }
  };

  const horizonYears = useMemo(() => {
    if (!activeGoal) return 25;
    const goalDate = activeGoal.due_date ? new Date(activeGoal.due_date) : null;
    const goalYear = goalDate && !isNaN(goalDate.getFullYear()) ? goalDate.getFullYear() : null;
    const currentYear = new Date().getFullYear();
    const fallbackHorizon = 25;
    if (!goalYear) return fallbackHorizon;
    return Math.max(goalYear - currentYear, 1);
  }, [activeGoal]);

  const targetAmount = activeGoal?.target_amount ?? 0;
  const currentGoalProgress = activeGoal?.current_amount ?? 0;
  const gap = Math.max(0, targetAmount - currentGoalProgress);
  const progressPercent = targetAmount > 0 ? (currentGoalProgress / targetAmount) * 100 : 0;

  const { summaryData: mcData, expectedReturn, volatility, successProbability } = useMemo(() => {
    if (!activeProfile) return { summaryData: [], expectedReturn: 0, volatility: 0, successProbability: 0 };
    const initialCapital = (activeProfile.financials.cash || 0) + (activeProfile.financials.investments || 0);
    return runMonteCarlo({ initialCapital, monthlyContribution, lumpSum }, exposure, horizonYears, targetAmount, isInflationAdjusted);
  }, [activeProfile, exposure, monthlyContribution, lumpSum, horizonYears, targetAmount, isInflationAdjusted]);

  const handleSwapProduct = (productId) => {
    if (!isSwapping) return;
    const { portfolioId, productIndex } = isSwapping;
    
    setCustomPortfolios(prev => prev.map(p => {
      if (p.id !== portfolioId) return p;
      const newProducts = [...p.products];
      newProducts[productIndex] = { ...newProducts[productIndex], productId };
      return { ...p, products: newProducts };
    }));
    setIsSwapping(null);
  };

  const updateExposure = (type, val) => {
    const newExposure = { ...exposure, [type]: val };
    const total = newExposure.growth + newExposure.defensive + newExposure.liquidity;
    if (total > 0) {
      setExposure({
        growth: (newExposure.growth / total) * 100,
        defensive: (newExposure.defensive / total) * 100,
        liquidity: (newExposure.liquidity / total) * 100
      });
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* 1. Decision Header */}
      <div className="bg-white px-8 py-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-8">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulation Context</p>
                <InfoTooltip 
                    content="Define the 'What-If' scenario by pairing a Goal with a Background Profile."
                    anchor={HELP_ANCHORS.PLAYGROUND.SCENARIOS} 
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Goal</span>
                  <select
                    value={activeGoalId || ''}
                    onChange={(e) => handleGoalChange(e.target.value)}
                    disabled={goalsLoading || !goalOptions.length}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-200 outline-none min-w-[180px]"
                  >
                    {goalOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                    {!goalOptions.length && <option value="">No goals available</option>}
                  </select>
                </div>
                <span className="text-slate-200 font-light hidden sm:block">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Background</span>
                  <select
                    value={activeProfileId || ''}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-200 outline-none min-w-[180px]"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button 
            onClick={() => {
                onSave(scenarioId, {
                    goalId: activeGoalId,
                    backgroundId: activeProfileId,
                    profile: activeProfile,
                    monthlyContribution,
                    lumpSum, // Ensure this is handled by backend if needed, or mapped to something existing
                    // Assuming inflationAdjusted is also a parameter
                    // Add result metrics to save if desired
                    successProbability,
                    isInflationAdjusted,
                    status: successProbability >= 70 ? 'safe' : 'risky'
                    // exposure?
                });
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
            }} 
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${isSaved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200 active:scale-95'}`}
        >
          {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaved ? 'Life Path Saved' : 'Commit Decision'}
        </button>
      </div>

      {/* 2. Goal Gap & Progress Bar */}
      <div className="bg-white p-10 rounded-[3.2rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-end mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Target size={16} className="text-indigo-500" /> Goal Completion Progress
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Currently at <span className="text-indigo-600 font-bold">${currentGoalProgress.toLocaleString()}</span> of <span className="text-slate-900 font-bold">${targetAmount.toLocaleString()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gap Remaining</p>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">${gap.toLocaleString()}</p>
          </div>
        </div>
        <div className="relative h-5 bg-slate-50 rounded-full border border-slate-100 p-1 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-lg shadow-indigo-200 relative flex items-center justify-end px-4"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          >
            <span className="text-[10px] font-bold text-white">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Configuration Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Stage 2: Strategic Guardrails */}
          <ConfigCard 
            title={
                <div className="flex items-center gap-2">
                    <span>Stage 2: Strategy</span>
                    <InfoTooltip 
                        content="Set your financial guardrails (contributions & exposure). The AI engine works within these limits."
                        anchor={HELP_ANCHORS.PLAYGROUND.STRATEGY} 
                    />
                </div>
            } 
            icon={Shield} 
            isActive={true} 
            badge="Guardrails"
          >
            <div className="space-y-8 mt-4">
              
              {/* Contributions */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Landmark size={12} className="text-indigo-400" /> One-time Lump Sum ($)
                    </label>
                    <span className="text-lg font-bold text-indigo-600">${lumpSum.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" min={0} max={200000} step={5000}
                    value={lumpSum} onChange={(e) => setLumpSum(Number(e.target.value) || 0)}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Wallet size={12} className="text-indigo-400" /> Monthly Surplus ($)
                    </label>
                    <span className="text-lg font-bold text-indigo-600">${monthlyContribution.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" min={500} max={15000} step={100}
                    value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              {/* Economic Exposure Sliders */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Economic Exposure Mix</h4>
                
                <div className="space-y-4">
                  <ExposureSlider label="Growth" value={exposure.growth} color="bg-indigo-500" onChange={(v) => updateExposure('growth', v)} />
                  <ExposureSlider label="Defensive" value={exposure.defensive} color="bg-sky-400" onChange={(v) => updateExposure('defensive', v)} />
                  <ExposureSlider label="Liquidity" value={exposure.liquidity} color="bg-fuchsia-400" onChange={(v) => updateExposure('liquidity', v)} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inflation Adjust</span>
                </div>
                <button 
                  onClick={() => setIsInflationAdjusted(!isInflationAdjusted)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${isInflationAdjusted ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isInflationAdjusted ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </ConfigCard>

          {/* Stage 3: Product Selection */}
          <ConfigCard title="Stage 3: Portfolio" icon={ShoppingBag} isActive={true} badge="Vehicle">
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                {customPortfolios.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedPortfolioId(p.id)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${selectedPortfolioId === p.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {!activePortfolio || !activePortfolio.products?.length ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-500">
                  Portfolio is not ready yet. Please retry or adjust filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {activePortfolio.products.map((item, idx) => {
                    const product = productsMap[item.productId] || {};
                    return (
                      <div key={`${activePortfolio.id}_${idx}`} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asset {idx + 1}</p>
                            <h4 className="text-sm font-bold text-slate-900 truncate pr-4">{product.name || 'Product'}</h4>
                          </div>
                          <button 
                            onClick={() => setIsSwapping({ portfolioId: activePortfolio.id, productIndex: idx })}
                            className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-indigo-600 hover:shadow-sm transition-all shrink-0"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">Fee: {product.fees ?? product.metrics?.fees?.total ?? 0}%</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              (product.riskLevel || '').toLowerCase().includes('aggressive') || (product.riskLevel || '').toLowerCase().includes('growth')
                                ? 'text-rose-600 bg-rose-50 border-rose-100'
                                : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                            }`}>{product.riskLevel || product.strategy || 'Risk'}</span>
                          </div>
                          <span className="text-sm font-bold text-indigo-600">{item.weight}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ConfigCard>
        </div>

        {/* Right: Simulation & Results */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Main Simulation Area */}
          <div className="bg-white p-10 rounded-[3.2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">Stage 4: Simulation View</h3>
                    <InfoTooltip 
                        content="Projections based on 100 iterations of Monte Carlo simulation. Volatility applied via Box-Muller transform."
                        anchor={HELP_ANCHORS.PLAYGROUND.MONTE_CARLO} 
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Monte Carlo Range (10th - 90th Percentile)</p>
                </div>
              </div>
              <div className="flex gap-4">
                <MetricBox label="Horizon" value={`${horizonYears}Y`} />
                <MetricBox label="Exp. Return" value={`${expectedReturn.toFixed(1)}%`} color="text-indigo-600" />
                <MetricBox label="Volatility" value={`${volatility.toFixed(1)}%`} color="text-rose-500" />
              </div>
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mcData}>
                  <defs>
                    <linearGradient id="colorMC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                  />
                  <YAxis 
                    axisLine={false} tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }}
                    labelFormatter={(y) => `Year ${y} (Age ${(activeProfile?.identity?.age || 30) + y})`}
                  />
                  
                  <Area type="monotone" dataKey="high" stroke="none" fill="#6366f1" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="low" stroke="none" fill="#6366f1" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="median" stroke="#6366f1" strokeWidth={4} fill="url(#colorMC)" animationDuration={1500} />
                  
                  {targetAmount > 0 && (
                    <ReferenceLine 
                      y={targetAmount} 
                      stroke="#cbd5e1" 
                      strokeDasharray="8 8" 
                      strokeWidth={2} 
                      label={{ value: 'Target', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Allocation & Insights */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[3.2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <PieChartIcon size={18} className="text-indigo-600" strokeWidth={2.5} />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Economic Exposure</h4>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Growth', value: exposure.growth },
                          { name: 'Defensive', value: exposure.defensive },
                          { name: 'Liquidity', value: exposure.liquidity },
                        ]}
                        innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value"
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#38bdf8" />
                        <Cell fill="#f472b6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  <LegendItem label="Growth" value={`${exposure.growth.toFixed(0)}%`} color="bg-indigo-500" />
                  <LegendItem label="Defensive" value={`${exposure.defensive.toFixed(0)}%`} color="bg-sky-400" />
                  <LegendItem label="Liquidity" value={`${exposure.liquidity.toFixed(0)}%`} color="bg-fuchsia-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[3.2rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <Zap size={100} />
              </div>
              <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <AlertCircle size={14} /> AI Engine Logic
              </h4>
              <p className="text-sm font-medium leading-relaxed mb-8">
                The current exposure mix prioritizes <span className="text-indigo-400 font-bold">Growth</span>, aiming for target reach within your {horizonYears}-year window with a controlled volatility buffer.
              </p>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Success Probability</p>
                    <InfoTooltip 
                        content="The % of simulated futures where you achieve your goal amount. >85% is considered safe."
                        anchor={HELP_ANCHORS.PLAYGROUND.SUCCESS_PROB} 
                        className="text-indigo-300"
                    />
                </div>
                <p className="text-xl font-bold">{Math.round(successProbability)}% <span className="text-[10px] font-medium text-emerald-400">Confidence</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Swap Modal */}
      {isSwapping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsSwapping(null)} />
          <div className="bg-white w-full max-w-2xl rounded-[3.2rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Swap Product</h2>
              <p className="text-slate-500 text-sm mb-8 font-medium">Select a different asset to replace in your portfolio.</p>
              
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {products.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleSwapProduct(p.id)}
                    className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-left hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                  >
                    <h4 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-900 transition-colors">{p.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-semibold bg-white px-2 py-1 rounded border border-slate-100 uppercase text-slate-400">Fee: {p.fees ?? p.metrics?.fees?.total ?? 0}%</span>
                      <span className="text-[10px] font-semibold bg-white px-2 py-1 rounded border border-slate-100 uppercase text-slate-400">{p.riskLevel || p.strategy}</span>
                      <span className="text-[10px] font-semibold bg-white px-2 py-1 rounded border border-slate-100 uppercase text-slate-400">{p.category}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsSwapping(null)}
                className="w-full mt-8 py-4 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-slate-200 transition-all"
              >
                Abort Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExposureSlider = ({ label, value, color, onChange }) => (
  <div className="space-y-2.5">
    <div className="flex justify-between items-center px-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <span className="text-xs font-bold text-indigo-600">{value.toFixed(0)}%</span>
    </div>
    <div className="flex items-center gap-4">
      <button onClick={() => onChange(Math.max(0, value - 5))} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center border border-slate-100 transition-colors"><Minus size={12} strokeWidth={3} /></button>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <button onClick={() => onChange(Math.min(100, value + 5))} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center border border-slate-100 transition-colors"><Plus size={12} strokeWidth={3} /></button>
    </div>
  </div>
);

const MetricBox = ({ label, value, color }) => (
  <div className="px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[110px]">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-lg font-bold ${color || 'text-slate-900'} tracking-tight`}>{value}</p>
  </div>
);

const LegendItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
    <span className="text-xs font-bold text-slate-900">{value}</span>
  </div>
);

export default ScenarioWorkspace;
