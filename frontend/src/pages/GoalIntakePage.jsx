import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import StageStrategy from '../components/goals/StageStrategy';
import goalEngineService from '../services/goalEngineService';
import productService from '../services/productService';
import { createGoalWithPlan } from '../services/goalService';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, PieChart as RechartsPieChart, Pie, ReferenceLine, Cell 
} from 'recharts';
import { 
    MessageSquare, 
    Send, 
    ChevronRight, 
    ChevronLeft, 
    Target, 
    Shield, 
    ShoppingBag, 
    Activity,
    CheckCircle2,
    AlertCircle,
    Zap,
    ArrowUpRight,
    Leaf,
    Lock,
    Unlock,
    TrendingUp,
    TrendingDown,
    Percent,
    RefreshCw,
    Copy, 
    Check,
    PieChart,
    BarChart3,
    Brain,
    ExternalLink,
    Wallet
} from 'lucide-react';

// --- STAGE COMPONENTS ---

const StageLoading = ({ text = 'AI is structuring your plan...' }) => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
        <div className="h-4 w-48 bg-slate-200 rounded"></div>
        <p className="text-slate-400 text-sm">{text}</p>
    </div>
);


// Stage 3: Product Selection (Vehicle) - Multiple Portfolio Options
const StageProduct = ({ goalContext, onSelect, isLoadingAI }) => {
    const navigate = useNavigate();
    const [selectedOption, setSelectedOption] = useState(null);
    const [loading, setLoading] = useState(false);
    const [portfolioOptions, setPortfolioOptions] = useState([]);
    const [detailProduct, setDetailProduct] = useState(null); // 产品详情模态框
    const [detailTab, setDetailTab] = useState('overview'); // 'overview', 'performance', 'allocation'

    // 获取 AI 返回的投资组合选项
    const aiOptions = goalContext.ai_decision?.portfolio_options 
        || goalContext.ai_decision?.strategy_recommendation?.portfolio_options
        || [];
    
    // 兼容旧的单一 product_selection 格式
    const legacySelection = goalContext.ai_decision?.product_selection 
        || goalContext.ai_decision?.strategy_recommendation?.product_selection
        || [];

    // 验证 MongoDB ObjectId 格式 (24位十六进制字符串)
    const isValidObjectId = (id) => /^[a-f0-9]{24}$/i.test(id);

    // 收集所有产品ID (只保留有效的 MongoDB ObjectId)
    const allProductIds = (aiOptions.length > 0
        ? [...new Set(aiOptions.flatMap(opt => opt.products?.map(p => p.product_id) || []))]
        : legacySelection.map(p => p.product_id)
    ).filter(id => id && isValidObjectId(id));
    
    // 检查是否有无效的 product_id (AI 可能编造了假 ID)
    const allRawIds = aiOptions.length > 0
        ? [...new Set(aiOptions.flatMap(opt => opt.products?.map(p => p.product_id) || []))]
        : legacySelection.map(p => p.product_id);
    const invalidIds = allRawIds.filter(id => id && !isValidObjectId(id));
    if (invalidIds.length > 0) {
        console.warn('[StageProduct] ⚠️ Invalid product IDs (AI may have fabricated them):', invalidIds);
    }
    
    const productIdsKey = allProductIds.filter(Boolean).join(',');

    console.log('[StageProduct] Portfolio options:', aiOptions.length);
    console.log('[StageProduct] Legacy selection:', legacySelection.length);
    console.log('[StageProduct] Valid product IDs:', allProductIds);

    useEffect(() => {
        let active = true;
        
        const fetchProducts = async () => {
            if (allProductIds.length === 0) {
                if (active) setPortfolioOptions([]);
                return;
            }
            setLoading(true);
            try {
                const ids = allProductIds.filter(Boolean);
                console.log('[StageProduct] Fetching products by IDs:', ids);
                
                const query = ids.length ? { ids: ids.join(',') } : { limit: 50 };
                const res = await productService.getProducts(query);
                console.log('[StageProduct] Backend returned:', res.products?.length || 0, 'products');
                
                const backendMap = new Map((res.products || []).map(p => [p.id, p]));
                
                // 如果有多个组合选项
                if (aiOptions.length > 0) {
                    const enrichedOptions = aiOptions.map(opt => ({
                        ...opt,
                        products: (opt.products || []).map(sel => {
                            const bp = backendMap.get(sel.product_id);
                            if (!bp) {
                                console.warn('[StageProduct] Product not found:', sel.product_id);
                                return null;
                            }
                            return {
                                ...bp,
                                id: sel.product_id,
                                weight_pct: sel.weight_pct,
                                rationale: sel.rationale
                            };
                        }).filter(Boolean)
                    }));
                    if (active) setPortfolioOptions(enrichedOptions);
                } else {
                    // 兼容旧格式：转换为单个组合
                    const products = legacySelection.map(sel => {
                        const bp = backendMap.get(sel.product_id);
                        if (!bp) return null;
                        return {
                            ...bp,
                            id: sel.product_id,
                            weight_pct: sel.weight_pct,
                            rationale: sel.rationale
                        };
                    }).filter(Boolean);
                    
                    if (products.length > 0) {
                        if (active) setPortfolioOptions([{
                            option_id: 'recommended',
                            option_name: 'AI Recommended Portfolio',
                            description: 'Optimized for your strategy',
                            products
                        }]);
                    }
                }
            } catch (e) {
                console.error(e);
                if (active) setPortfolioOptions([]);
            } finally {
                if (active) setLoading(false);
            }
        };
        
        fetchProducts();
        return () => { active = false; };
    }, [productIdsKey]);

    const handleSelectOption = (option) => {
        setSelectedOption(option.option_id);
        onSelect(option);
    };

    if (isLoadingAI && portfolioOptions.length === 0 && !legacySelection.length) {
        return <StageLoading text="AI is structuring your investment products..." />;
    }

    return (
        <div className="space-y-6">
            {loading && <div className="text-sm text-slate-500">Loading portfolio options…</div>}
            
            {/* 警告：检测到无效的产品 ID */}
            {!loading && invalidIds.length > 0 && allProductIds.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-medium text-amber-800">
                                AI generated invalid product IDs. Please try again.
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                                The AI may have fabricated product codes. Click "Retry" to search for real products.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {!loading && portfolioOptions.length > 0 && (
                <div className="space-y-6">
                    {portfolioOptions.map((option, idx) => (
                        <div 
                            key={option.option_id || idx}
                            onClick={() => handleSelectOption(option)}
                            className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${
                                selectedOption === option.option_id 
                                ? 'border-brand-500 shadow-lg ring-2 ring-brand-100' 
                                : 'border-slate-200 hover:border-brand-200 hover:shadow-md'
                            }`}
                        >
                            {/* 组合头部 */}
                            <div className={`px-5 py-4 ${
                                selectedOption === option.option_id 
                                ? 'bg-brand-50' 
                                : 'bg-slate-50'
                            }`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900">{option.option_name || `Option ${idx + 1}`}</h3>
                                            {selectedOption === option.option_id && (
                                                <span className="px-2 py-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full">
                                                    SELECTED
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                                        
                                        {/* 显示计算后的资产配置 */}
                                        {option.calculated_exposure && (
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Exposure:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded">
                                                        {option.calculated_exposure.growth || 0}% Growth
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                                                        {option.calculated_exposure.defensive || 0}% Defensive
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                                                        {option.calculated_exposure.liquidity || 0}% Liquidity
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {option.total_fees_estimate !== undefined && (
                                        <div className="text-right shrink-0 ml-4">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Est. Fees</span>
                                            <div className="text-lg font-bold text-slate-900">{option.total_fees_estimate}%</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 产品列表 */}
                            <div className="divide-y divide-slate-100">
                                {option.products?.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                                        className="px-5 py-3 bg-white cursor-pointer transition-all duration-200 hover:bg-slate-50 group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.category || 'Product'}</span>
                                                    <span className="text-[10px] text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                        <ExternalLink size={10} /> View Details
                                                    </span>
                                                </div>
                                                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">{p.name || 'Product'}</h4>
                                                <p className="text-[11px] text-slate-500">{p.provider || ''}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400">Fees</span>
                                                    <div className="text-sm font-medium text-slate-700">{p.fees ?? '—'}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400">Risk</span>
                                                    <div className="text-sm font-medium text-slate-700">{p.riskLevel || p.strategy || '—'}</div>
                                                </div>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                                    <Zap size={10} /> {p.weight_pct}%
                                                </span>
                                            </div>
                                        </div>
                                        {p.rationale && (
                                            <p className="text-[11px] text-slate-500 mt-1">{p.rationale}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!loading && portfolioOptions.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">
                    No portfolio options yet. AI is searching for suitable products...
                </div>
            )}

            {/* Product Detail Modal - Compact & Responsive */}
            {detailProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-fade-in overflow-hidden backdrop-blur-[2px]">
                    <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header - Compact */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0 bg-white z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100/50 shrink-0">
                                    {(detailProduct.provider ?? "PF").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5 block">
                                        {detailProduct.category || 'Product'}
                                    </span>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[200px]">{detailProduct.name}</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => { setDetailProduct(null); setDetailTab('analysis'); }}
                                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-95 shrink-0"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        {/* Tabs - Compact */}
                        <div className="px-6 py-2 bg-slate-50/50 flex gap-6 border-b border-slate-50 shrink-0 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'analysis', label: 'ANALYSIS', icon: Activity },
                                { id: 'composition', label: 'MIX', icon: PieChart },
                                { id: 'holdings', label: 'HOLDINGS', icon: Target }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDetailTab(tab.id)}
                                    className={`flex items-center gap-2 py-2 text-[10px] font-bold tracking-widest transition-all relative whitespace-nowrap ${
                                        detailTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <tab.icon size={12} strokeWidth={2.5} />
                                    {tab.label}
                                    {detailTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area - Single Column Flow */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                            {detailTab === 'analysis' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fees</span>
                                            <div className="text-2xl font-black text-slate-900">
                                                {detailProduct.fees ?? '0.00'}%
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50/50 rounded-2xl p-4 text-center border border-emerald-100/30">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60 block mb-1">5Y Return</span>
                                            <div className="text-2xl font-black text-emerald-600">
                                                {detailProduct.returns?.['5y']?.toFixed(1) || '0.0'}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Rationale */}
                                    <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Brain size={12} className="text-indigo-600" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Why this product?</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                            {detailProduct.rationale || "Selected based on risk-adjusted returns and alignment with your goal strategy."}
                                        </p>
                                    </div>

                                    {/* Secondary Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Strategy</span>
                                            <div className="text-sm font-bold text-slate-700">
                                                {detailProduct.riskLevel || detailProduct.strategy || 'Balanced'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white relative overflow-hidden">
                                            <Zap size={40} className="absolute -right-2 -top-2 text-indigo-500/20" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Weight</span>
                                            <div className="text-2xl font-black relative z-10">
                                                {detailProduct.weight_pct || '0.0'}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">Projection</span>
                                        <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100 p-2 relative overflow-hidden">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[
                                                    { x: 0, y: 100 }, { x: 1, y: 105 }, { x: 2, y: 112 }, 
                                                    { x: 3, y: 125 }, { x: 4, y: 135 }, { x: 5, y: 150 }
                                                ]}>
                                                    <defs>
                                                        <linearGradient id="compactChartGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <Area type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={2} fill="url(#compactChartGradient)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {detailTab === 'composition' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Asset Mix Section */}
                                    <div className="space-y-4">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-900 px-1">Asset Allocation</span>
                                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                            <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 shadow-inner mb-6">
                                                <div style={{ width: `${detailProduct.allocation?.growth || 60}%` }} className="bg-indigo-500" />
                                                <div style={{ width: `${detailProduct.allocation?.defensive || 30}%` }} className="bg-sky-400" />
                                                <div style={{ width: `${detailProduct.allocation?.cash || 10}%` }} className="bg-fuchsia-400" />
                                            </div>
                                            <div className="space-y-3">
                                                <LegendRow label="Growth Assets" value={`${detailProduct.allocation?.growth || 60}%`} color="bg-indigo-500" />
                                                <LegendRow label="Defensive Assets" value={`${detailProduct.allocation?.defensive || 30}%`} color="bg-sky-400" />
                                                <LegendRow label="Cash & Liquidity" value={`${detailProduct.allocation?.cash || 10}%`} color="bg-fuchsia-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'holdings' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                     {detailProduct.topHoldings?.slice(0, 5).map((holding, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{holding.name}</h4>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{holding.type || 'ASSET'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-indigo-600">{holding.percent?.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                     ))}
                                     {!detailProduct.topHoldings?.length && (
                                         <div className="text-center py-10 text-slate-400 text-xs">No holdings data available</div>
                                     )}
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-white border-t border-slate-50 shrink-0">
                            <button 
                                onClick={() => {
                                    setDetailProduct(null);
                                    navigate(`/marketplace?search=${encodeURIComponent(detailProduct.name)}`);
                                }}
                                className="w-full h-12 bg-[#101827] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                            >
                                View in Marketplace <ExternalLink size={14} className="opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Monte Carlo Simulation Logic
const runMonteCarlo = (params, exposure, years, glidePathConfig = null) => {
    const iterations = 100;
    const allProjections = [];
    
    // Base expected returns by asset class (annualized)
    const RETURNS = { growth: 0.08, defensive: 0.04, liquidity: 0.02 };
    const VOLATILITY = { growth: 0.18, defensive: 0.06, liquidity: 0.01 };
    
    for (let i = 0; i < iterations; i++) {
        let balance = (params.initialCapital || 0) + (params.lumpSum || 0);
        const yearlyData = [];
        
        for (let y = 0; y <= years; y++) {
            // Apply glide path if enabled
            let currentExposure = { ...exposure };
            if (glidePathConfig?.enabled && y > (years - glidePathConfig.start_years_before_goal)) {
                const progress = (y - (years - glidePathConfig.start_years_before_goal)) / glidePathConfig.start_years_before_goal;
                currentExposure = {
                    growth: exposure.growth + (glidePathConfig.end_state.growth - exposure.growth) * progress,
                    defensive: exposure.defensive + (glidePathConfig.end_state.defensive - exposure.defensive) * progress,
                    liquidity: exposure.liquidity + (glidePathConfig.end_state.liquidity - exposure.liquidity) * progress
                };
            }
            
            // Calculate weighted return and volatility
            const expReturn = (currentExposure.growth / 100 * RETURNS.growth) +
                              (currentExposure.defensive / 100 * RETURNS.defensive) +
                              (currentExposure.liquidity / 100 * RETURNS.liquidity);
            const volatility = (currentExposure.growth / 100 * VOLATILITY.growth) +
                               (currentExposure.defensive / 100 * VOLATILITY.defensive) +
                               (currentExposure.liquidity / 100 * VOLATILITY.liquidity);
            
            // Random return with normal distribution approximation
            const randomFactor = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
            const yearReturn = expReturn + randomFactor * volatility;
            
            // Add monthly contributions first, then apply return
            const annualContribution = (params.monthlyContribution || 0) * 12;
            balance = (balance + annualContribution) * (1 + yearReturn);
            
            yearlyData.push({
                year: y,
                balance: Math.round(balance),
                contributions: (params.initialCapital || 0) + (params.lumpSum || 0) + annualContribution * y
            });
        }
        allProjections.push(yearlyData);
    }
    
    // Calculate percentiles
    const summaryData = [];
    for (let y = 0; y <= years; y++) {
        const yearValues = allProjections.map(proj => proj[y].balance).sort((a, b) => a - b);
        const contributions = allProjections[0][y].contributions;
        summaryData.push({
            year: y,
            median: yearValues[Math.floor(iterations * 0.5)],
            low: yearValues[Math.floor(iterations * 0.1)],
            high: yearValues[Math.floor(iterations * 0.9)],
            contributions
        });
    }
    
    // Calculate expected return and volatility for display
    const expectedReturn = (exposure.growth / 100 * RETURNS.growth * 100) +
                           (exposure.defensive / 100 * RETURNS.defensive * 100) +
                           (exposure.liquidity / 100 * RETURNS.liquidity * 100);
    const volatility = (exposure.growth / 100 * VOLATILITY.growth * 100) +
                       (exposure.defensive / 100 * VOLATILITY.defensive * 100) +
                       (exposure.liquidity / 100 * VOLATILITY.liquidity * 100);
    
    return { summaryData, expectedReturn, volatility, allProjections };
};

// Stage 4: Simulation & Commitment (Twin)
const StageSimulation = ({ goalContext, isLoadingAI }) => {
    const [activeTab, setActiveTab] = useState('projection');
    
    // Extract data from goalContext
    const strategy = goalContext.ai_decision?.strategy_recommendation || {};
    const exposure = strategy.economic_exposure || { growth: 60, defensive: 30, liquidity: 10 };
    const glidePath = strategy.glide_path;
    const contributionStrategy = strategy.contribution_strategy || {};
    
    // 优先使用用户选择的完整投资组合（包含产品名称）
    // 1. goalContext.selectedPortfolio - 用户在第三阶段选择的完整组合
    // 2. goalContext.product - 兼容旧的存储方式
    // 3. 从 AI 决策中查找
    const selectedPortfolio = goalContext.selectedPortfolio || 
        goalContext.product ||
        goalContext.ai_decision?.portfolio_options?.find(p => p.option_id === goalContext.selectedPortfolioId) ||
        goalContext.ai_decision?.portfolio_options?.[0];
    
    // Calculate horizon
    const targetDate = goalContext.due_date ? new Date(goalContext.due_date) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    const horizonYears = Math.max(1, Math.round((targetDate - new Date()) / (365.25 * 24 * 60 * 60 * 1000)));
    
    // Simulation parameters
    const simParams = useMemo(() => ({
        initialCapital: goalContext.current_amount || 0,
        lumpSum: contributionStrategy.lump_sum_amount || 0,
        monthlyContribution: contributionStrategy.monthly_amount || goalContext.contribution?.amount || 0
    }), [goalContext, contributionStrategy]);
    
    const hasStrategy = Boolean(goalContext.ai_decision?.strategy_recommendation);

    if (isLoadingAI && !hasStrategy) {
        return <StageLoading text="AI is structuring your simulation..." />;
    }

    // Run simulation
    const { summaryData, expectedReturn, volatility } = useMemo(() => {
        return runMonteCarlo(simParams, exposure, horizonYears, glidePath);
    }, [simParams, exposure, horizonYears, glidePath]);
    
    // Success probability calculation
    const targetAmount = goalContext.target_amount || 100000;
    const successProbability = useMemo(() => {
        if (!summaryData.length) return 0;
        const finalYear = summaryData[summaryData.length - 1];
        // Simple heuristic based on median vs target
        if (finalYear.median >= targetAmount) return 85 + Math.random() * 10;
        const ratio = finalYear.median / targetAmount;
        return Math.min(95, Math.max(15, ratio * 100));
    }, [summaryData, targetAmount]);
    
    // Portfolio exposure from selected portfolio
    const portfolioExposure = selectedPortfolio?.calculated_exposure || exposure;
    
    return (
        <div className="space-y-4 lg:space-y-6 flex flex-col min-h-0">
            {/* Tab Navigation - Aligned with Playground */}
            <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl lg:rounded-2xl w-fit">
                {[
                    { id: 'projection', label: 'Projection', icon: TrendingUp },
                    { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
                    { id: 'portfolio', label: 'Portfolio', icon: PieChart }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-1.5 px-3 lg:px-5 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        <tab.icon size={12} strokeWidth={2.5} />
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* Main Chart Area - Aligned with Playground */}
            <div className="bg-white rounded-xl lg:rounded-[2.5rem] p-3 lg:p-8 border border-slate-100 shadow-sm min-h-[280px] lg:min-h-[400px] flex flex-col">
                {activeTab === 'projection' && (
                    <div className="flex flex-col gap-2 lg:gap-6">
                        <div className="flex flex-col gap-2 mb-2 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3 lg:gap-4">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-50 text-indigo-600 rounded-xl lg:rounded-2xl flex items-center justify-center">
                                    <BarChart3 size={20} lg:size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">Twin Projection</h3>
                                    <p className="text-[10px] lg:text-xs text-slate-500 font-medium italic">Monte Carlo Outcomes</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:gap-3 lg:justify-end">
                                <MetricBadge label="Horizon" value={`${horizonYears}Y`} />
                                <MetricBadge label="Exp. Return" value={`${expectedReturn.toFixed(1)}%`} color="text-indigo-600" />
                                <MetricBadge label="Volatility" value={`${volatility.toFixed(1)}%`} color="text-rose-500" />
                            </div>
                        </div>
                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={summaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMC" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis 
                                        dataKey="year" 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        tickFormatter={(y) => `Y${y}`}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                        tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`}
                                        width={60}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                                        labelFormatter={(y) => `Year ${y}`}
                                    />
                                    
                                    {/* Confidence Bands */}
                                    <Area type="monotone" dataKey="high" stroke="none" fill="#6366f1" fillOpacity={0.05} />
                                    <Area type="monotone" dataKey="low" stroke="none" fill="#6366f1" fillOpacity={0.1} />
                                    
                                    {/* Median Path */}
                                    <Area type="monotone" dataKey="median" stroke="#6366f1" strokeWidth={4} fill="url(#colorMC)" animationDuration={1500} />
                                    
                                    {/* Target Line */}
                                    <ReferenceLine y={targetAmount} stroke="#cbd5e1" strokeDasharray="8 8" strokeWidth={2} label={{ value: 'Target', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                
                {activeTab === 'breakdown' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                    <BarChart3 size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Contributions vs Growth</h3>
                                    <p className="text-xs text-slate-500 font-medium italic">Your investment journey over time</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={summaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                                        </linearGradient>
                                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(y) => `Y${y}`} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`} width={60} />
                                    <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }} formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                                    <Area type="monotone" dataKey="contributions" stackId="1" stroke="#6366f1" strokeWidth={2} fill="url(#colorContrib)" name="Your Contributions" />
                                    <Area type="monotone" dataKey="median" stroke="#10b981" strokeWidth={2} fill="url(#colorGrowth)" name="Total Value (Median)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                
                {activeTab === 'portfolio' && (
                    <div className="h-full flex flex-col">
                        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                    <PieChart size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {selectedPortfolio?.option_name || 'Portfolio Summary'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium italic">{selectedPortfolio?.description || 'Your investment allocation'}</p>
                                </div>
                            </div>
                            {selectedPortfolio?.total_fees_estimate !== undefined && (
                                <MetricBadge label="Est. Fees" value={`${selectedPortfolio.total_fees_estimate.toFixed(2)}%`} color="text-indigo-600" />
                            )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-8 items-start min-h-0">
                            {/* Left: Pie Chart */}
                            <div className="flex flex-col items-center justify-center relative bg-slate-50/30 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-slate-100/50">
                                <div className="w-full h-[160px] lg:h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <RechartsPieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Growth', value: portfolioExposure.growth || 0 },
                                                    { name: 'Defensive', value: portfolioExposure.defensive || 0 },
                                                    { name: 'Liquidity', value: portfolioExposure.liquidity || 0 }
                                                ]}
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={5}
                                                dataKey="value"
                                                strokeWidth={0}
                                            >
                                                <Cell fill="#6366f1" />
                                                <Cell fill="#38bdf8" />
                                                <Cell fill="#f472b6" />
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)' }}
                                                formatter={(value) => [`${value.toFixed(1)}%`, '']} 
                                            />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total</span>
                                    <span className="text-xl font-bold text-slate-900">100%</span>
                                </div>
                                
                                <div className="w-full mt-6 space-y-2.5">
                                    <LegendRow label="Growth" value={`${(portfolioExposure.growth || 0).toFixed(1)}%`} color="bg-indigo-500" />
                                    <LegendRow label="Defensive" value={`${(portfolioExposure.defensive || 0).toFixed(1)}%`} color="bg-sky-400" />
                                    <LegendRow label="Liquidity" value={`${(portfolioExposure.liquidity || 0).toFixed(1)}%`} color="bg-fuchsia-400" />
                                </div>
                            </div>

                            {/* Right: Products List */}
                            <div className="flex flex-col h-full min-h-0">
                                {selectedPortfolio?.products?.length > 0 && (
                                    <div className="space-y-3 flex-1 flex flex-col min-h-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Underlying Assets</p>
                                            <span className="text-[10px] font-bold text-slate-300">{selectedPortfolio.products.length} Products</span>
                                        </div>
                                        <div className="grid gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1" style={{ maxHeight: '320px' }}>
                                            {selectedPortfolio.products.map((p, i) => (
                                                <div key={p.id || p.product_id || i} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[10px] text-slate-400 font-medium block mb-0.5">Asset {i+1}</span>
                                                        <h4 className="text-xs font-bold text-slate-700 truncate group-hover:text-slate-900" title={p.name}>
                                                            {p.name || p.product_name || `Product ${i+1}`}
                                                        </h4>
                                                    </div>
                                                    <div className="ml-4 flex items-center">
                                                        <div className="h-8 w-[1px] bg-slate-100 mr-4" />
                                                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-xl border border-indigo-100/50 shrink-0">
                                                            {p.weight_pct}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Bottom Stats Cards - Better Proportions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-6">
                <div className="p-3 lg:p-6 bg-emerald-50/40 rounded-xl lg:rounded-[2rem] border border-emerald-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
                    <div className="flex items-center gap-2 mb-1 lg:mb-4">
                        <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Target size={14} lg:size={16} className="text-emerald-600" />
                        </div>
                        <span className="text-[9px] lg:text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Success Prob.</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl lg:text-3xl font-bold text-emerald-700 tracking-tight">{successProbability.toFixed(0)}</p>
                        <span className="text-base lg:text-lg font-bold text-emerald-600/60">%</span>
                    </div>
                </div>
                
                <div className="p-3 lg:p-6 bg-indigo-50/40 rounded-xl lg:rounded-[2rem] border border-indigo-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
                    <div className="flex items-center gap-2 mb-1 lg:mb-4">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Wallet size={12} lg:size={16} className="text-indigo-600" />
                        </div>
                        <span className="text-[9px] lg:text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Monthly Sav.</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base lg:text-xl font-bold text-indigo-600/60">$</span>
                        <p className="text-2xl lg:text-3xl font-bold text-indigo-700 tracking-tight">{(simParams.monthlyContribution || 0).toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="p-3 lg:p-6 bg-amber-50/40 rounded-xl lg:rounded-[2rem] border border-amber-100/50 shadow-sm flex flex-col justify-between min-h-[80px] lg:min-h-[140px]">
                    <div className="flex items-center gap-2 mb-1 lg:mb-4">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-amber-100 flex items-center justify-center">
                            <TrendingDown size={12} lg:size={16} className="text-amber-600" />
                        </div>
                        <span className="text-[9px] lg:text-[10px] font-bold text-amber-700 uppercase tracking-wider">Glide Path</span>
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-amber-700 tracking-tight">{glidePath?.enabled ? 'Active' : 'Disabled'}</p>
                </div>
            </div>
            
            {/* Impact Analysis - More Compact */}
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-indigo-500/10">
                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                    <Zap size={80} />
                </div>
                <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle size={12} /> Simulation Insight
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-indigo-200/60 uppercase tracking-wider">Expected Outcome</p>
                        <p className="text-xl font-bold text-white tracking-tight">
                            ${(summaryData[summaryData.length - 1]?.median || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="space-y-1 border-l border-white/10 pl-8">
                        <p className="text-[9px] font-bold text-rose-300/60 uppercase tracking-wider">Downside (10th)</p>
                        <p className="text-xl font-bold text-white tracking-tight">
                            ${(summaryData[summaryData.length - 1]?.low || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components for Simulation
const MetricBadge = ({ label, value, color = "text-slate-700" }) => (
    <div className="px-3 lg:px-5 py-1.5 lg:py-2.5 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-100 text-center min-w-[90px] lg:min-w-[110px]">
        <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 lg:mb-1">{label}</p>
        <p className={`text-sm lg:text-lg font-bold ${color} tracking-tight`}>{value}</p>
    </div>
);

const LegendRow = ({ label, value, color }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs font-medium text-slate-600">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-900">{value}</span>
    </div>
);

// Typewriter Effect Component - NOW SUPPORTS MARKDOWN
const TypewriterMessage = ({ text, onComplete, role }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, index + 1));
            index++;
            if (index >= text.length) {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, 10);
        return () => clearInterval(timer);
    }, [text]);

    return (
        <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
                table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4 w-full border border-slate-100 rounded-lg no-scrollbar">
                        <table className="min-w-full divide-y divide-slate-100" {...props} />
                    </div>
                )
            }}
        >
            {displayedText}
        </ReactMarkdown>
    );
};

// Copilot Component - NOW ACTIVE AND CONNECTED
const Copilot = ({ 
    stage, 
    currentStageLabel, 
    goalContext, 
    onUpdateContext, 
    messages, 
    setMessages 
}) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null); 
    const [showReasoning, setShowReasoning] = useState(true);
    
    const scrollRef = useRef(null);
    const textareaRef = useRef(null); 

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]); 

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        
        const userMsg = { role: 'user', text: inputText };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        
        setIsLoading(true);

        // Add a placeholder assistant message that we will update with the stream
        const aiMsgIndex = messages.length + 1;
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            text: '', 
            isTyping: true,
            isStreaming: true 
        }]);

        try {
            let accumulatedRaw = '';
            
            // Helper to extract field content from incomplete JSON stream
            const extractField = (field, jsonStr) => {
                const marker = `"${field}": "`;
                const startIdx = jsonStr.indexOf(marker);
                if (startIdx === -1) return '';
                
                const contentStart = startIdx + marker.length;
                let contentEnd = jsonStr.length;
                
                // Track if we are inside an escaped sequence
                let escaped = false;
                for (let i = contentStart; i < jsonStr.length; i++) {
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (jsonStr[i] === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (jsonStr[i] === '"') {
                        contentEnd = i;
                        break;
                    }
                }
                
                return jsonStr.slice(contentStart, contentEnd)
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\r/g, '')
                    .replace(/\\t/g, '\t');
            };

            const finalData = await goalEngineService.generateDecisionStream({
                stage: currentStageLabel,
                goalContext,
                userInput: { text: userMsg.text },
                previousDecisions: [] 
            }, (chunk) => {
                accumulatedRaw += chunk;
                
                const streamingThought = extractField('thought_process', accumulatedRaw);
                const streamingRationale = extractField('rationale', accumulatedRaw);

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        // Priority: Rationale > Thought Process > Loading State
                        let displayBtn = "";
                        if (streamingRationale) {
                            displayBtn = streamingRationale;
                        } else if (streamingThought) {
                            displayBtn = "Analyzing context..."; 
                        }

                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: displayBtn,
                            thought_process: streamingThought,
                        };
                    }
                    return newMessages;
                });
            });
            
            if (finalData) {
                const aiDecision = finalData.ai_decision;
                const aiText = finalData.text || aiDecision?.rationale || "I've updated the plan based on your request.";

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: aiText,
                            isTyping: false,
                            isStreaming: false,
                            thought_process: aiDecision?.thought_process,
                            references: aiDecision?.references
                        };
                    }
                    return newMessages;
                });

                if (aiDecision && onUpdateContext) {
                    onUpdateContext(aiDecision);
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'system', text: "Sorry, I'm having trouble connecting to the brain." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header with Reasoning Toggle */}
            <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Activity size={12} className="lg:w-[14px] lg:h-[14px]" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs lg:text-sm">FinTwin Copilot</span>
                </div>
                
                <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className={`flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[9px] lg:text-[10px] font-bold transition-all ${
                        showReasoning 
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-100' 
                        : 'bg-slate-100 text-slate-400'
                    }`}
                >
                    <Brain size={10} />
                    {showReasoning ? 'Reasoning ON' : 'Reasoning OFF'}
                </button>
            </div>
            
            <div 
                ref={scrollRef}
                className="flex-1 bg-slate-50/50 rounded-lg lg:rounded-2xl p-2 lg:p-3 mb-2 lg:mb-4 overflow-y-auto border border-slate-100/50 flex flex-col gap-2 min-h-0"
            >
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group w-full`}>
                        {/* Thought Process (CoT) */}
                        {msg.role === 'assistant' && msg.thought_process && showReasoning && (
                            <div className="max-w-[85%] mb-1 animate-fade-in">
                                <div className="bg-slate-100/50 border border-slate-200/60 rounded-2xl rounded-bl-none p-3 text-[11px] text-slate-500 leading-relaxed italic">
                                    <div className="flex items-center gap-1 mb-1 font-bold uppercase tracking-wider text-[9px] text-brand-600">
                                        <Brain size={10} /> Thought Process
                                    </div>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.thought_process}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {msg.text && (
                            <div className={`
                                relative max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed pr-8 break-words
                                ${msg.role === 'user' 
                                    ? 'bg-slate-900 text-white rounded-br-none' 
                                    : 'bg-white border border-slate-200 text-slate-600 rounded-tl-none shadow-sm'}
                            `}>
                                {/* Main Message Content with Markdown */}
                                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-600'}`}>
                                    {msg.role === 'assistant' && msg.isTyping && !msg.isStreaming && i === messages.length - 1 ? (
                                        <TypewriterMessage 
                                            text={msg.text} 
                                            onComplete={() => {
                                                const newMessages = [...messages];
                                                if (newMessages[i]) {
                                                    newMessages[i].isTyping = false;
                                                    setMessages(newMessages);
                                                }
                                            }} 
                                        />
                                    ) : (
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({node, ...props}) => (
                                                    <div className="overflow-x-auto my-4 w-full border border-slate-100 rounded-lg no-scrollbar">
                                                        <table className="min-w-full divide-y divide-slate-100" {...props} />
                                                    </div>
                                                )
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}
                                </div>

                                {/* References */}
                                {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                                        {msg.references.map((ref, idx) => (
                                            <a 
                                                key={idx}
                                                href={ref.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 transition-colors"
                                            >
                                                <ExternalLink size={10} /> {ref.source || 'Source'}: {ref.title}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Copy Button */}
                                <button 
                                    onClick={() => handleCopy(msg.text, i)}
                                    className={`
                                        absolute top-2 right-2 p-1 rounded-md transition-all duration-200
                                        ${msg.role === 'user' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}
                                        ${copiedId === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                    `}
                                    title="Copy text"
                                >
                                    {copiedId === i ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="self-start bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-400 italic">
                        Thinking...
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="relative shrink-0">
                <textarea 
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask Copilot..." 
                    rows={1}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none overflow-hidden min-h-[46px] max-h-[150px]"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !inputText.trim()}
                    className="absolute right-2 bottom-2 p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
};


const GoalEnginePage = () => {
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [goalContext, setGoalContext] = useState({
    session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // Resizable Sidebar State (Pixels instead of percentage for better precision)
  const [leftWidth, setLeftWidth] = useState(window.innerWidth > 1440 ? 450 : 340); 
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef(null);

  // NEW: Track loading state for stage transitions
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const STAGES = [
      { id: 'definition', label: 'Definition', icon: Target },
      { id: 'strategy', label: 'Strategy', icon: Shield },
      { id: 'product', label: 'Product', icon: ShoppingBag },
      { id: 'simulation', label: 'Simulation', icon: Activity },
  ];

  const getGreeting = (stageIdx) => {
    const greetings = {
        0: "Let's define your target. I can help you calculate how much you need or check if your plan is feasible.",
        1: "Now for the strategy. I'll analyze your goal timeline and suggest an asset allocation mix.",
        2: "I'm searching for investment products that match your strategy. This may take a moment...",
        3: "Final check. Ready to launch?"
    };
    return { role: 'system', text: greetings[stageIdx] || "How can I help?" };
  };

  // Initialize greeting on mount
  useEffect(() => {
      if (messages.length === 0) {
          setMessages([getGreeting(0)]);
      }
  }, []);

  const runStageAnalysis = async (stageId, context, stageIdx) => {
      setIsLoadingAI(true);
      
      // Atomic update: Set greeting AND analyzing message together to avoid race conditions
      const greeting = getGreeting(stageIdx);
      const analyzingMsg = { 
          role: 'assistant', 
          text: 'Analyzing your goal...', 
          isTyping: true,
          isStreaming: true 
      };

      setMessages([greeting, analyzingMsg]);
      const aiMsgIndex = 1; // It's always the second message in a fresh stage analysis

      try {
          let accumulatedRaw = "";
          
          const extractField = (field, jsonStr) => {
                const marker = `"${field}": "`;
                const startIdx = jsonStr.indexOf(marker);
                if (startIdx === -1) return '';
                
                const contentStart = startIdx + marker.length;
                let contentEnd = jsonStr.length;
                
                let escaped = false;
                for (let i = contentStart; i < jsonStr.length; i++) {
                    if (escaped) { escaped = false; continue; }
                    if (jsonStr[i] === '\\') { escaped = true; continue; }
                    if (jsonStr[i] === '"') { contentEnd = i; break; }
                }
                
                return jsonStr.slice(contentStart, contentEnd)
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"');
          };

          // Inject lightweight mock of other goals for transparency (used by AI and UI)
          const mockOtherGoals = context?.simulation_data?.other_goals && context.simulation_data.other_goals.length > 0
            ? context.simulation_data.other_goals
            : [
                { name: 'Emergency Fund', monthly_allocation: 800, priority: 'need' },
                { name: 'New Car', monthly_allocation: 300, priority: 'want' }
              ];

          const contextWithOthers = {
            ...context,
            simulation_data: {
              ...(context?.simulation_data || {}),
              other_goals: mockOtherGoals
            }
          };

          // Ensure UI state also sees the other goals list for display
          setGoalContext(prev => ({
            ...prev,
            simulation_data: {
              ...(prev.simulation_data || {}),
              other_goals: mockOtherGoals
            }
          }));

          const data = await goalEngineService.generateDecisionStream({
              stage: stageId,
              goalContext: contextWithOthers
          }, (chunk) => {
              accumulatedRaw += chunk;
              const streamingThought = extractField('thought_process', accumulatedRaw);
              const streamingRationale = extractField('rationale', accumulatedRaw);

              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: streamingRationale || (streamingThought ? "Structuring strategy..." : "Analyzing..."),
                          thought_process: streamingThought,
                      };
                  }
                  return newMessages;
              });
          });
          
          if (data?.ai_decision) {
              handleContextUpdate(data.ai_decision);
              
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: data.text || data.ai_decision.rationale,
                          isTyping: false,
                          isStreaming: false,
                          thought_process: data.ai_decision.thought_process,
                          references: data.ai_decision.references
                      };
                  }
                  return newMessages;
              });
          }
      } catch (err) {
          console.error("Auto-Analysis Failed:", err);
          setMessages(prev => [...prev, { role: 'system', text: "Strategy analysis failed. You can continue manually." }]);
      } finally {
          setIsLoadingAI(false);
      }
  };

  // Product Stage Analysis - Uses Function Calling with SSE Progress
  const runProductAnalysis = async (context, stageIdx) => {
      setIsLoadingAI(true);
      
      const greeting = getGreeting(stageIdx);
      const analyzingMsg = { 
          role: 'assistant', 
          text: 'Initializing product search...', 
          isTyping: true,
          isStreaming: true,
          thought_process: 'Preparing to search for investments matching your strategy...'
      };

      setMessages([greeting, analyzingMsg]);
      const aiMsgIndex = 1;

      try {
          let accumulatedThought = '';
          
          // Helper to extract thought_process from streaming JSON chunks
          const extractField = (field, jsonStr) => {
              const marker = `"${field}": "`;
              const startIdx = jsonStr.indexOf(marker);
              if (startIdx === -1) return '';
              
              const contentStart = startIdx + marker.length;
              let contentEnd = jsonStr.length;
              
              let escaped = false;
              for (let i = contentStart; i < jsonStr.length; i++) {
                  if (escaped) { escaped = false; continue; }
                  if (jsonStr[i] === '\\') { escaped = true; continue; }
                  if (jsonStr[i] === '"') { contentEnd = i; break; }
              }
              
              return jsonStr.slice(contentStart, contentEnd)
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"');
          };

          // Use streaming API to show Function Calling progress
          const data = await goalEngineService.generateDecisionStream({
              stage: 'product',
              goalContext: context
          }, (chunk) => {
              // Extract thought_process from chunks for CoT display
              const thought = extractField('thought_process', chunk);
              const rationale = extractField('rationale', chunk);
              
              if (thought && thought !== accumulatedThought) {
                  accumulatedThought = thought;
                  setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages[aiMsgIndex]) {
                          newMessages[aiMsgIndex] = {
                              ...newMessages[aiMsgIndex],
                              text: rationale || 'Searching for products...',
                              thought_process: thought,
                          };
                      }
                      return newMessages;
                  });
              }
              
              if (rationale) {
                  setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages[aiMsgIndex]) {
                          newMessages[aiMsgIndex] = {
                              ...newMessages[aiMsgIndex],
                              text: rationale,
                          };
                      }
                      return newMessages;
                  });
              }
          });
          
          console.log('[Product Analysis] Stream complete:', data);
          
          // Handle final response
          const aiDecision = data?.ai_decision;
          const displayText = data?.text || aiDecision?.rationale || "I've found some suitable products for your goal.";
          
          console.log('[Product Analysis] AI Decision:', aiDecision);
          console.log('[Product Analysis] Product Selection:', 
              aiDecision?.product_selection || aiDecision?.strategy_recommendation?.product_selection);
          
          if (aiDecision) {
              handleContextUpdate(aiDecision);
              
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: displayText,
                          isTyping: false,
                          isStreaming: false,
                          thought_process: aiDecision.thought_process,
                          references: aiDecision.references
                      };
                  }
                  return newMessages;
              });
          } else {
              console.warn('[Product Analysis] No ai_decision in response');
              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: displayText || "Product search complete. Please review the options below.",
                          isTyping: false,
                          isStreaming: false
                      };
                  }
                  return newMessages;
              });
          }
      } catch (err) {
          console.error("Product Analysis Failed:", err);
          setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages[aiMsgIndex]) {
                  newMessages[aiMsgIndex] = {
                      ...newMessages[aiMsgIndex],
                      text: "Product search encountered an issue. Please try again or select products manually.",
                      isTyping: false,
                      isStreaming: false
                  };
              }
              return newMessages;
          });
      } finally {
          setIsLoadingAI(false);
      }
  };

  const handleNext = async () => {
      if (currentStage < STAGES.length - 1) {
          const nextStageIndex = currentStage + 1;
          const nextStageId = STAGES[nextStageIndex].id;
          
          setCurrentStage(nextStageIndex);
          
          // Auto-trigger analysis for Strategy and Product stages
          if (nextStageId === 'strategy') {
              runStageAnalysis(nextStageId, goalContext, nextStageIndex);
          } else if (nextStageId === 'product') {
              runProductAnalysis(goalContext, nextStageIndex);
          } else {
              setMessages([getGreeting(nextStageIndex)]);
          }
      }
  };

  const handleBack = () => {
      if (currentStage > 0) {
          const prevStageIdx = currentStage - 1;
          setCurrentStage(prevStageIdx);
          setMessages([getGreeting(prevStageIdx)]);
      }
  };

  const handleCreate = async (payload) => {
    // Stage 1 manual submit
    console.log('Stage 1 Submitted:', payload);
    const updatedContext = { ...goalContext, ...payload };
    setGoalContext(updatedContext);
    
    // Move to next stage MANUALLY here so we can use the fresh context
    const nextStageIndex = currentStage + 1;
    setCurrentStage(nextStageIndex);
    
    // Trigger Analysis with FRESH context
    if (STAGES[nextStageIndex]?.id === 'strategy') {
        runStageAnalysis('strategy', updatedContext, nextStageIndex);
    } else {
        setMessages([getGreeting(nextStageIndex)]);
    }
  };

  // Helper to allow Copilot to update context (e.g. AI fills form)
  // Also normalizes flat AI response fields back into goal_details structure
  const handleContextUpdate = (updates) => {
      if (!updates) return;

      const normalized = { ...updates };
      const isAiDecisionPayload = Boolean(
          normalized.strategy_recommendation ||
          normalized.thought_process ||
          normalized.rationale ||
          normalized.allocation ||
          normalized.funding_structure ||
          normalized.portfolio_options ||  // Stage 3: Multiple portfolio options
          normalized.product_selection ||  // Stage 3: Legacy single selection
          normalized.strategy_recommendation?.portfolio_options ||
          normalized.strategy_recommendation?.product_selection
      );
      
      // Safety: ensure category is lowercase if present
      if (normalized.category) {
          normalized.category = normalized.category.toLowerCase();
      }

      // 1. Detect if we need to infer category based on fields (backup safety)
      if (normalized.retirement_age || normalized.living_expense_pa) {
           if (!normalized.category) normalized.category = 'retirement';
      }
      
      const detailFields = [
          'retirement_age', 'life_expectancy', 'living_expense_pa', 'include_superannuation',
          'location', 'property_price_estimate', 'deposit_percentage', 'is_first_home',
          'vehicle_type', 'trade_in_value', 
          'destination', 'travelers_count', 'duration_days'
      ];

      // If we detect specific detail fields at the root level, move them to goal_details
      let detailsFound = false;
      const newDetails = {};

      detailFields.forEach(field => {
          if (normalized[field] !== undefined) {
              newDetails[field] = normalized[field];
              delete normalized[field]; // Remove from root to keep it clean
              detailsFound = true;
          }
      });

      setGoalContext(prev => {
          const nextState = { ...prev };

          // Preserve full AI decision payload for downstream stages (strategy/product/simulation)
          if (isAiDecisionPayload) {
              nextState.ai_decision = {
                  ...prev.ai_decision,
                  ...normalized
              };
          }

          // Also surface flattened fields to root to keep definition stage prefill behavior
          Object.assign(nextState, normalized);
          
          // CRITICAL FIX: If we are in a goal type with complex frontend logic (like retirement),
          // IGNORE the AI's simplified target_amount. Let the frontend component's formula be the source of truth.
          if (nextState.category === 'retirement' || nextState.category === 'home') {
              if (prev.target_amount && !updates.target_amount_manual_override) {
                  nextState.target_amount = prev.target_amount; 
              }
          }

          if (detailsFound) {
              nextState.goal_details = {
                  ...prev.goal_details,
                  ...newDetails
              };
          }
          // Merge deep objects like ai_decision.strategy_recommendation if present
          if (normalized.ai_decision?.strategy_recommendation) {
             nextState.ai_decision = {
                 ...prev.ai_decision,
                 ...normalized.ai_decision
             }
          }

          return nextState;
      });
  };
  
  const handleFinalCommit = async () => {
      setSubmitting(true);
      try {
          console.log('Final Goal Context:', goalContext);
          
          // Generate a session ID if not present
          const sessionId = goalContext.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Call API to create goal and plan
          const result = await createGoalWithPlan({
              ...goalContext,
              session_id: sessionId,
              // Include selected portfolio if user made a selection (优先使用完整的选择数据)
              selectedPortfolio: goalContext.selectedPortfolio || 
                  goalContext.product ||
                  goalContext.ai_decision?.portfolio_options?.find(p => p.option_id === goalContext.selectedPortfolioId) ||
                  goalContext.ai_decision?.portfolio_options?.[0]
          });
          
          console.log('Goal created successfully:', result);
          navigate('/goals');
      } catch (error) {
          console.error('Failed to create goal:', error);
          alert('Failed to create goal. Please try again.');
      } finally {
          setSubmitting(false);
      }
  };

  // Dragging Logic
  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      // Get container position to calculate relative X
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = e.clientX - containerRect.left;
      
      // Add constraints (e.g., 320px to 800px)
      if (newWidth < 320) newWidth = 320;
      if (newWidth > containerRect.width * 0.6) newWidth = containerRect.width * 0.6;
      
      setLeftWidth(newWidth);
    };

    const stopResizing = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  return (
    <MainLayout>
      <div className="max-w-[2400px] mx-auto p-1.5 md:p-3 lg:p-4 h-[calc(100vh-64px)] flex flex-col animate-fade-in overflow-hidden">
        
        {/* Top Bar: Progress Stepper */}
        <div className="flex items-center justify-between mb-1.5 lg:mb-4 px-1 lg:px-2 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/goals')} className="p-1 hover:bg-slate-100 rounded-lg lg:rounded-xl transition-colors">
                    <ChevronLeft className="text-slate-400" size={18} />
                </button>
                <h1 className="text-base lg:text-xl font-bold text-slate-900">Goal Engine</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
                {STAGES.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isActive = idx === currentStage;
                    const isCompleted = idx < currentStage;
                    
                    return (
                        <div key={stage.id} className="flex items-center">
                            <div className={`
                                flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-bold transition-all
                                ${isActive ? 'bg-slate-900 text-white shadow-lg' : 
                                  isCompleted ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}
                            `}>
                                <Icon size={14} />
                                <span className={!isActive ? "hidden xl:inline" : ""}>{stage.label}</span>
                            </div>
                            {idx < STAGES.length - 1 && (
                                <div className={`w-4 lg:w-8 h-0.5 mx-0.5 lg:mx-1 ${isCompleted ? 'bg-slate-200' : 'bg-slate-100'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="w-8 md:w-12 lg:w-24"></div> {/* Spacer */}
        </div>

        {/* Main Split View - RESIZABLE LAYOUT */}
        <div 
            ref={containerRef}
            className={`flex-1 flex flex-col lg:flex-row gap-0 min-h-0 overflow-hidden relative ${isResizing ? 'select-none' : ''}`}
        >
            
            {/* LEFT COPILOT */}
            <div 
                className="
                    order-2 lg:order-1
                    h-[280px] lg:h-full 
                    bg-white/50 border border-slate-100 rounded-xl lg:rounded-[2rem] p-2 lg:p-4 backdrop-blur-sm 
                    flex flex-col overflow-hidden
                "
                style={{ width: window.innerWidth >= 1024 ? `${leftWidth}px` : '100%' }}
            >
                <Copilot 
                    stage={currentStage} 
                    currentStageLabel={STAGES[currentStage].id}
                    goalContext={goalContext}
                    onUpdateContext={handleContextUpdate}
                    messages={messages}
                    setMessages={setMessages}
                />
            </div>

            {/* RESIZER HANDLE (Overlay to remove gap) */}
            <div 
                onMouseDown={startResizing}
                className="
                    hidden lg:flex 
                    absolute top-0 bottom-0 z-20
                    w-2 cursor-col-resize items-center justify-center
                    transition-all hover:bg-brand-500/10
                "
                style={{ left: `${leftWidth - 4}px` }}
            >
                <div className={`w-1 rounded-full transition-all ${isResizing ? 'bg-brand-500 h-24 w-1.5' : 'bg-slate-200 h-12 group-hover:bg-brand-300'}`}></div>
            </div>

            {/* RIGHT CANVAS */}
            <div 
                className="
                    order-1 lg:order-2
                    flex-1 lg:h-full 
                    bg-white border border-slate-100 rounded-xl lg:rounded-[2rem] shadow-sm p-3 md:p-4 lg:p-8 
                    flex flex-col overflow-hidden min-w-0
                "
            >
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                    {currentStage === 0 && (
                        <div className="max-w-2xl mx-auto py-1">
                             <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Define your Goal</h2>
                             <p className="text-xs lg:text-sm text-slate-500 mb-4 lg:mb-6">Start by setting the basic parameters. Copilot will help check feasibility.</p>
                             <GoalDefinitionForm 
                                onSubmit={handleCreate}
                                onChange={handleContextUpdate}
                                submitLabel="Continue to Strategy"
                                initialValues={goalContext}
                             />
                        </div>
                    )}
                    {currentStage === 1 && (
                         <div className="max-w-3xl mx-auto py-2">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Choose your Strategy</h2>
                            <StageStrategy 
                                goalContext={goalContext} 
                                onChange={setGoalContext} 
                                isLoadingAI={isLoadingAI}
                            />
                        </div>
                    )}
                    {currentStage === 2 && (
                         <div className="max-w-3xl mx-auto py-2">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Select Investment Vehicle</h2>
                            <StageProduct 
                                goalContext={goalContext} 
                                isLoadingAI={isLoadingAI}
                                onSelect={(portfolio) => setGoalContext({
                                    ...goalContext, 
                                    product: portfolio,
                                    selectedPortfolio: portfolio,  // 同时保存到 selectedPortfolio
                                    selectedPortfolioId: portfolio.option_id
                                })} 
                            />
                        </div>
                    )}
                    {currentStage === 3 && (
                         <div className="max-w-5xl mx-auto h-full py-2">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-6">Simulation & Impact</h2>
                            <StageSimulation goalContext={goalContext} isLoadingAI={isLoadingAI} />
                        </div>
                    )}
                </div>

                {/* Navigation Footer (For Stages 1, 2, 3) */}
                {currentStage > 0 && (
                    <div className="pt-4 lg:pt-6 mt-2 lg:mt-4 border-t border-slate-50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleBack}
                            className="px-4 lg:px-6 py-2 lg:py-3 rounded-full text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors"
                        >
                            Back
                        </button>
                        {currentStage < 3 ? (
                            <button 
                                onClick={handleNext}
                                className="btn-primary-rounded flex items-center gap-2 px-6 lg:px-8 py-2 lg:py-3 text-sm"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                             <button 
                                onClick={handleFinalCommit}
                                disabled={submitting}
                                className="btn-primary-rounded bg-green-600 hover:bg-green-700 flex items-center gap-2 px-6 lg:px-8 py-2 lg:py-3 text-sm shadow-green-200"
                            >
                                {submitting ? 'Launching...' : 'Launch Goal Plan'} <CheckCircle2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

        </div>

      </div>
    </MainLayout>
  );
};

export default GoalEnginePage;
