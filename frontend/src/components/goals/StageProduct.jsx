import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  AlertCircle,
  ExternalLink,
  Zap,
  Info,
  TrendingUp,
  PieChart as PieChartIcon,
  Shield,
  Clock,
  ChevronRight,
  Target,
  FileText,
} from 'lucide-react';

import StageLoading from './common/StageLoading';
import productService from '../../services/productService';
import InfoTooltip from '../common/InfoTooltip';
import { HELP_ANCHORS } from '../../constants/helpAnchors';

const StageProduct = ({ goalContext, onSelect, isLoadingAI }) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolioOptions, setPortfolioOptions] = useState([]);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [detailsLoading, setDetailsLoading] = useState(false);

  const normalizeAllocation = (allocation = {}) => {
    if (!allocation) return { growth: 0, defensive: 0, cash: 0 };
    const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
    const hasPillars =
      allocation.growth !== undefined ||
      allocation.defensive !== undefined ||
      allocation.cash !== undefined ||
      allocation.liquidity !== undefined;

    let growth = 0;
    let defensive = 0;
    let cash = 0;

    if (hasPillars) {
      growth = toNumber(allocation.growth);
      defensive = toNumber(allocation.defensive);
      cash = toNumber(allocation.cash ?? allocation.liquidity);
    } else {
      const equities = toNumber(allocation.equities);
      const property = toNumber(allocation.property);
      const other = toNumber(allocation.other);
      const bonds = toNumber(allocation.bonds);
      const cashVal = toNumber(allocation.cash);
      growth = equities + property + other;
      defensive = bonds;
      cash = cashVal;
    }

    const total = growth + defensive + cash;
    if (total <= 0) {
      return { growth: 0, defensive: 0, cash: 0 };
    }

    let scale = 1;
    if (total <= 1.2) {
      scale = 100 / total;
    } else if (total > 100) {
      scale = 100 / total;
    }

    const clamp = (val) => Math.max(0, Number((val * scale).toFixed(2)));
    return {
      growth: clamp(growth),
      defensive: clamp(defensive),
      cash: clamp(cash),
    };
  };

  const formatPct = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  const formatExposure = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.0';
    return num.toFixed(1);
  };

  const computeExposureFromProducts = (products = []) => {
    let growth = 0;
    let defensive = 0;
    let liquidity = 0;
    let totalWeight = 0;

    products.forEach((product) => {
      const weight = Number(product.weight_pct) || 0;
      if (weight <= 0) return;
      totalWeight += weight;
      const alloc = normalizeAllocation(product.allocation || product.metrics?.allocation);
      growth += (weight / 100) * (alloc.growth || 0);
      defensive += (weight / 100) * (alloc.defensive || 0);
      liquidity += (weight / 100) * (alloc.cash || 0);
    });

    return { growth, defensive, liquidity, totalWeight };
  };

  const aiOptions =
    goalContext.ai_decision?.portfolio_options ||
    goalContext.ai_decision?.strategy_recommendation?.portfolio_options ||
    [];

  const legacySelection =
    goalContext.ai_decision?.product_selection ||
    goalContext.ai_decision?.strategy_recommendation?.product_selection ||
    [];

  const isValidObjectId = (id) => /^[a-f0-9]{24}$/i.test(id);

  const allProductIds = useMemo(
    () =>
      (aiOptions.length > 0
        ? [...new Set(aiOptions.flatMap((opt) => opt.products?.map((p) => p.product_id) || []))]
        : legacySelection.map((p) => p.product_id)
      )
        .filter((id) => id && isValidObjectId(id)),
    [aiOptions, legacySelection],
  );

  const allRawIds =
    aiOptions.length > 0
      ? [...new Set(aiOptions.flatMap((opt) => opt.products?.map((p) => p.product_id) || []))]
      : legacySelection.map((p) => p.product_id);
  const invalidIds = allRawIds.filter((id) => id && !isValidObjectId(id));

  const productIdsKey = allProductIds.filter(Boolean).join(',');

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
        const query = ids.length ? { ids: ids.join(',') } : { limit: 50 };
        const res = await productService.getProducts(query);

        const backendMap = new Map((res.products || []).map((p) => [p.id, p]));

        if (aiOptions.length > 0) {
          const enrichedOptions = aiOptions.map((opt) => ({
            ...opt,
            products: (opt.products || [])
              .map((sel) => {
                const bp = backendMap.get(sel.product_id);
                if (!bp) {
                  console.warn('[StageProduct] Product not found:', sel.product_id);
                  return null;
                }
                return {
                  ...bp,
                  id: sel.product_id,
                  weight_pct: sel.weight_pct,
                  rationale: sel.rationale,
                };
              })
              .filter(Boolean),
          }));
          if (active) setPortfolioOptions(enrichedOptions);
        } else {
          const products = legacySelection
            .map((sel) => {
              const bp = backendMap.get(sel.product_id);
              if (!bp) return null;
              return {
                ...bp,
                id: sel.product_id,
                weight_pct: sel.weight_pct,
                rationale: sel.rationale,
              };
            })
            .filter(Boolean);

          if (products.length > 0 && active) {
            setPortfolioOptions([
              {
                option_id: 'recommended',
                option_name: 'AI Recommended Portfolio',
                description: 'Optimized for your strategy',
                products,
              },
            ]);
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
    return () => {
      active = false;
    };
  }, [productIdsKey]); // Only depend on productIdsKey to prevent infinite loops

  const handleSelectOption = (option) => {
    setSelectedOption(option.option_id);
    onSelect(option);
  };

  const handleViewProductDetails = async (product) => {
    if (!product?.id) return;
    setDetailProduct(product);
    setDetailsLoading(true);
    try {
      const full = await productService.getProductById(product.id);
      if (full) {
        setDetailProduct({
          ...product, // Preserve weight/rationale from the AI recommended portfolio
          ...full
        });
      }
    } catch (err) {
      console.error('[StageProduct] Failed to fetch product details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (isLoadingAI && portfolioOptions.length === 0 && !legacySelection.length) {
    return <StageLoading text="AI is selecting investment products..." subtext="Curating portfolios that match your strategy and risk profile" />;
  }

  return (
    <div className="space-y-6">
      {loading && <div className="text-sm text-slate-500">Loading portfolio options…</div>}

      {!loading && invalidIds.length > 0 && allProductIds.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-amber-800">AI generated invalid product IDs. Please try again.</p>
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
              <div
                className={`px-5 py-4 ${
                  selectedOption === option.option_id ? 'bg-brand-50' : 'bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {option.option_name || `Option ${idx + 1}`}
                      </h3>
                      {selectedOption === option.option_id && (
                        <span className="px-2 py-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{option.description}</p>

                  {option.calculated_exposure && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Exposure:</span>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const computed = computeExposureFromProducts(option.products || []);
                            const exposure =
                              computed.totalWeight > 0
                                ? computed
                                : option.calculated_exposure;
                            return (
                              <>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded">
                            {formatExposure(exposure.growth || 0)}% Growth
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                            {formatExposure(exposure.defensive || 0)}% Defensive
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                            {formatExposure(exposure.liquidity || 0)}% Liquidity
                          </span>
                              </>
                            );
                          })()}
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

              <div className="divide-y divide-slate-100">
                {option.products?.map((p) => (
                  <div
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProductDetails(p);
                    }}
                    className="px-5 py-3 bg-white cursor-pointer transition-all duration-200 hover:bg-slate-50 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {p.category || 'Product'}
                          </span>
                          <span className="text-[10px] text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <ExternalLink size={10} /> View Details
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">
                          {p.name || 'Product'}
                        </h4>
                        <p className="text-[11px] text-slate-500">{p.provider || ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">Fees %</span>
                          <div className="text-sm font-medium text-slate-700">{p.fees ?? '—'}%</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">5Y Return</span>
                          <div className="text-sm font-medium text-emerald-600">
                            {p.returns?.['5y'] != null ? `${Number(p.returns['5y']).toFixed(1)}%` : p.returns?.['1y'] != null ? `${Number(p.returns['1y']).toFixed(1)}%` : '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">Risk</span>
                          <div className="text-sm font-medium text-slate-700">{p.riskLevel || p.strategy || '—'}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">Weight %</span>
                          <div className="px-2 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-lg flex items-center gap-1 justify-center">
                          <Zap size={10} /> {p.weight_pct}%
                          </div>
                        </div>
                      </div>
                    </div>
                    {p.rationale && <p className="text-[11px] text-slate-500 mt-1">{p.rationale}</p>}
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

      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-fade-in overflow-hidden">
          {(() => {
            const allocation = normalizeAllocation(
              detailProduct.allocation || detailProduct.metrics?.allocation,
            );
            const holdings = Array.isArray(detailProduct.topHoldings) ? detailProduct.topHoldings : [];
            const riskScore = typeof detailProduct.riskScore === 'number' ? detailProduct.riskScore : null;

            return (
              <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
                {/* Header - More compact */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-200 shrink-0 overflow-hidden">
                      {detailProduct.providerLogo ? (
                        <img src={detailProduct.providerLogo} alt={detailProduct.provider} className="w-full h-full object-cover" />
                      ) : (
                        (detailProduct.provider ?? 'PF').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 truncate leading-tight">
                        {detailProduct.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-tight">{detailProduct.provider}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{detailProduct.category || 'Fund'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDetailProduct(null);
                      setDetailTab('overview');
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>

                {/* Tabs - Compressed height */}
                <div className="px-5 border-b border-slate-100 bg-white">
                  <div className="flex gap-6">
                    {[
                      { id: 'overview', label: 'OVERVIEW', icon: FileText },
                      { id: 'performance', label: 'METRICS', icon: TrendingUp },
                      { id: 'composition', label: 'ALLOCATION', icon: PieChartIcon },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailTab(tab.id)}
                        className={`flex items-center gap-1.5 py-3 text-[10px] font-bold tracking-wider transition-all relative ${
                          detailTab === tab.id ? 'text-brand-600' : 'text-slate-400 hover:text-slate-500'
                        }`}
                      >
                        <tab.icon size={12} />
                        {tab.label}
                        {detailTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area - Higher Density */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-soft bg-slate-50/20 min-h-[320px]">
                  {detailsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="w-8 h-8 border-3 border-slate-100 border-t-brand-600 rounded-full animate-spin mb-3"></div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Updating data...</p>
                    </div>
                  ) : (
                    <>
                      {detailTab === 'overview' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                          {/* Key Indicators Grid */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Annual Fee</div>
                              <div className="text-sm font-bold text-slate-900">{detailProduct.fees ?? '0.00'}%</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">5Y Return</div>
                              <div className="text-sm font-bold text-emerald-600">
                                {detailProduct.returns?.['5y'] !== null 
                                  ? `${detailProduct.returns['5y'].toFixed(1)}%` 
                                  : detailProduct.returns?.['1y'] !== null 
                                    ? `${detailProduct.returns['1y'].toFixed(1)}%` 
                                    : '—'}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Risk RI</div>
                              <div className="text-sm font-bold text-slate-900">{riskScore || 'N/A'}</div>
                            </div>
                          </div>

                          {/* Rationale - Professional Box */}
                          <div className="bg-brand-50/40 rounded-xl p-4 border border-brand-100/50">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Zap size={12} className="text-brand-600" />
                              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">AI Recommendation</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                              {detailProduct.rationale || 'Selected for its optimized fee-to-performance ratio and alignment with your target risk profile.'}
                            </p>
                          </div>

                          {/* Strategy */}
                          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                              <Target size={12} className="text-brand-500" />
                              Objective & Strategy
                            </h3>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {detailProduct.strategy || detailProduct.description || 'Data unavailable.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {detailTab === 'performance' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                              <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Risk Assessment</h3>
                              <div className="space-y-3">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                                    <div key={val} className={`flex-1 h-1.5 rounded-full ${riskScore && riskScore >= val ? 'bg-brand-500' : 'bg-slate-100'}`} />
                                  ))}
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                  <span>CONSERVATIVE</span>
                                  <span className="text-brand-600">{riskScore || 'N/A'}</span>
                                  <span>AGGRESSIVE</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                              <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Historical Return</h3>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-emerald-600">
                                  {detailProduct.returns?.['5y'] !== null 
                                    ? `+${detailProduct.returns['5y'].toFixed(1)}%` 
                                    : detailProduct.returns?.['1y'] !== null 
                                      ? `+${detailProduct.returns['1y'].toFixed(1)}%` 
                                      : '—'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">
                                  {detailProduct.returns?.['5y'] !== null ? '5Y AVG' : '1Y AVG'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Projection Chart - Compact */}
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Growth Projection</h3>
                              <span className="text-[9px] font-medium text-slate-400">Compounded 5Y Rate</span>
                            </div>
                            <div className="h-32 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                  { m: 0, v: 100 },
                                  { m: 12, v: 100 * Math.pow(1 + (detailProduct.returns?.['5y'] ?? detailProduct.returns?.['1y'] ?? 6) / 100, 1) },
                                  { m: 36, v: 100 * Math.pow(1 + (detailProduct.returns?.['5y'] ?? detailProduct.returns?.['1y'] ?? 6) / 100, 3) },
                                  { m: 60, v: 100 * Math.pow(1 + (detailProduct.returns?.['5y'] ?? detailProduct.returns?.['1y'] ?? 6) / 100, 5) },
                                ]}>
                                  <defs>
                                    <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} fill="url(#brandGradient)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      )}

                      {detailTab === 'composition' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-900 mb-4 uppercase tracking-wider">Asset Allocation</h3>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
                              <div style={{ width: `${allocation.growth}%` }} className="h-full bg-brand-500" />
                              <div style={{ width: `${allocation.defensive}%` }} className="h-full bg-sky-400" />
                              <div style={{ width: `${allocation.cash}%` }} className="h-full bg-slate-300" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {['Growth', 'Defensive', 'Cash'].map((label, i) => (
                                <div key={label} className="text-center">
                                  <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">{label}</div>
                                  <div className="text-[11px] font-bold text-slate-700">
                                    {i === 0 ? formatPct(allocation.growth) : i === 1 ? formatPct(allocation.defensive) : formatPct(allocation.cash)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Key Holdings</h3>
                            <div className="space-y-3">
                              {holdings.length > 0 ? (
                                holdings.slice(0, 5).map((h, i) => {
                                  const name = h?.name || h || "Unknown";
                                  const pct = typeof h?.percent === "number" ? h.percent : 0;
                                  return (
                                    <div key={i}>
                                      <div className="flex justify-between items-center mb-1 text-[10px]">
                                        <span className="font-bold text-slate-600 truncate mr-4">{name}</span>
                                        <span className="font-black text-slate-900 shrink-0">{pct.toFixed(1)}%</span>
                                      </div>
                                      <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-400 opacity-60 rounded-full" style={{ width: `${Math.max(pct, 1)}%` }} />
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[10px] text-slate-400 py-4 text-center">Holding data not available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer - Compact */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Verified 2026</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailProduct(null)}
                      className="px-4 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50"
                    >
                      CLOSE
                    </button>
                    <button
                      onClick={() => {
                        setDetailProduct(null);
                        navigate(`/marketplace?search=${encodeURIComponent(detailProduct.name)}`);
                      }}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                    >
                      MARKETPLACE <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default StageProduct;

