import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';

import StageLoading from './common/StageLoading';
import productService from '../../services/productService';

const StageProduct = ({ goalContext, onSelect, isLoadingAI }) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolioOptions, setPortfolioOptions] = useState([]);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

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
  }, [productIdsKey, aiOptions, legacySelection, allProductIds]);

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

              <div className="divide-y divide-slate-100">
                {option.products?.map((p) => (
                  <div
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailProduct(p);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-fade-in overflow-hidden backdrop-blur-[2px]">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100/50 shrink-0">
                  {(detailProduct.provider ?? 'PF').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5 block">
                    {detailProduct.category || 'Product'}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[200px]">
                    {detailProduct.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailProduct(null);
                  setDetailTab('analysis');
                }}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-95 shrink-0"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="px-6 py-2 bg-slate-50/50 flex gap-6 border-b border-slate-50 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'analysis', label: 'ANALYSIS' },
                { id: 'composition', label: 'MIX' },
                { id: 'holdings', label: 'HOLDINGS' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className={`flex items-center gap-2 py-2 text-[10px] font-bold tracking-widest transition-all relative whitespace-nowrap ${
                    detailTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {detailTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
              {detailTab === 'analysis' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fees</span>
                      <div className="text-2xl font-black text-slate-900">{detailProduct.fees ?? '0.00'}%</div>
                    </div>
                    <div className="bg-emerald-50/50 rounded-2xl p-4 text-center border border-emerald-100/30">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60 block mb-1">5Y Return</span>
                      <div className="text-2xl font-black text-emerald-600">
                        {detailProduct.returns?.['5y']?.toFixed(1) || '0.0'}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Why this product?</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {detailProduct.rationale ||
                        'Selected based on risk-adjusted returns and alignment with your goal strategy.'}
                    </p>
                  </div>

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
                      <div className="text-2xl font-black relative z-10">{detailProduct.weight_pct || '0.0'}%</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">Projection</span>
                    <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100 p-2 relative overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={[
                            { x: 0, y: 100 },
                            { x: 1, y: 105 },
                            { x: 2, y: 112 },
                            { x: 3, y: 125 },
                            { x: 4, y: 135 },
                            { x: 5, y: 150 },
                          ]}
                        >
                          <defs>
                            <linearGradient id="compactChartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="y"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#compactChartGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'composition' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-900 px-1">Asset Allocation</span>
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 shadow-inner mb-6">
                        <div
                          style={{ width: `${detailProduct.allocation?.growth || 60}%` }}
                          className="bg-indigo-500"
                        />
                        <div
                          style={{ width: `${detailProduct.allocation?.defensive || 30}%` }}
                          className="bg-sky-400"
                        />
                        <div
                          style={{ width: `${detailProduct.allocation?.cash || 10}%` }}
                          className="bg-fuchsia-400"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-medium text-slate-600">Growth Assets</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {`${detailProduct.allocation?.growth || 60}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                            <span className="text-xs font-medium text-slate-600">Defensive Assets</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {`${detailProduct.allocation?.defensive || 30}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-400" />
                            <span className="text-xs font-medium text-slate-600">Cash & Liquidity</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">
                            {`${detailProduct.allocation?.cash || 10}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'holdings' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {detailProduct.topHoldings?.slice(0, 5).map((holding, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between"
                    >
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

export default StageProduct;

