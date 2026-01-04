import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import StageStrategy from '../components/goals/StageStrategy';
import goalEngineService from '../services/goalEngineService';
import productService from '../services/productService';
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
    Percent,
    RefreshCw,
    Copy, 
    Check,
    PieChart,
    BarChart3,
    Brain,
    ExternalLink
} from 'lucide-react';

// --- STAGE COMPONENTS ---


// Stage 3: Product Selection (Vehicle) - Multiple Portfolio Options
const StageProduct = ({ goalContext, onSelect }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [loading, setLoading] = useState(false);
    const [portfolioOptions, setPortfolioOptions] = useState([]);
    const [detailProduct, setDetailProduct] = useState(null); // 产品详情模态框

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

            {/* 产品详情悬浮卡片 */}
            {detailProduct && (
                <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {(detailProduct.provider ?? "PF").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{detailProduct.category}</span>
                                <h2 className="text-sm font-bold text-slate-900 truncate">{detailProduct.name}</h2>
                                <p className="text-[11px] text-slate-500 truncate">{detailProduct.provider}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDetailProduct(null)}
                            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <span className="text-lg leading-none">×</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
                        {/* 关键指标 */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Fees</span>
                                <div className="text-base font-bold text-slate-900">{detailProduct.fees ?? '—'}%</div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Risk</span>
                                <div className="text-xs font-bold text-slate-900">{detailProduct.riskLevel || detailProduct.strategy || '—'}</div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">1Y</span>
                                <div className="text-base font-bold text-slate-900">
                                    {detailProduct.returns?.['1y'] != null ? `${detailProduct.returns['1y'].toFixed(1)}%` : '—'}
                                </div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-lg text-center">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">5Y</span>
                                <div className="text-base font-bold text-slate-900">
                                    {detailProduct.returns?.['5y'] != null ? `${detailProduct.returns['5y'].toFixed(1)}%` : '—'}
                                </div>
                            </div>
                        </div>

                        {/* 资产配置 */}
                        {detailProduct.allocation && (
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400">Asset Allocation</span>
                                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mt-2">
                                    {detailProduct.allocation.growth > 0 && (
                                        <div style={{ width: `${detailProduct.allocation.growth}%` }} className="bg-indigo-500" />
                                    )}
                                    {detailProduct.allocation.defensive > 0 && (
                                        <div style={{ width: `${detailProduct.allocation.defensive}%` }} className="bg-purple-400" />
                                    )}
                                    {detailProduct.allocation.cash > 0 && (
                                        <div style={{ width: `${detailProduct.allocation.cash}%` }} className="bg-teal-400" />
                                    )}
                                </div>
                                <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{detailProduct.allocation.growth || 0}%</span>
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>{detailProduct.allocation.defensive || 0}%</span>
                                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>{detailProduct.allocation.cash || 0}%</span>
                                </div>
                            </div>
                        )}

                        {/* AI 推荐理由 */}
                        {detailProduct.rationale && (
                            <div className="p-3 bg-brand-50/50 border border-brand-100 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Brain size={12} className="text-brand-600" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-600">Why Selected</span>
                                </div>
                                <p className="text-[12px] text-slate-700 leading-relaxed">{detailProduct.rationale}</p>
                            </div>
                        )}

                        {/* 组合中的权重 */}
                        {detailProduct.weight_pct !== undefined && (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                                <span className="text-[12px] font-medium text-slate-600">Portfolio Weight</span>
                                <span className="text-xl font-bold text-green-600">{detailProduct.weight_pct}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Stage 4: Simulation & Commitment (Twin)
const StageSimulation = ({ goalContext }) => {
    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-1 bg-slate-50 rounded-3xl p-6 relative overflow-hidden border border-slate-100 flex flex-col justify-center items-center">
                {/* Mock Twin Projection Chart */}
                <div className="w-full max-w-md aspect-video relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-0 divide-x divide-y divide-slate-200 opacity-30 border-l border-t border-slate-200">
                        {[...Array(16)].map((_, i) => <div key={i}></div>)}
                    </div>
                    
                    {/* Grey Line (Without Goal) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <path d="M0,100 C50,90 150,80 300,40" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                        <text x="280" y="35" className="text-[10px] fill-slate-400 font-bold">Without Goal</text>
                    </svg>

                    {/* Green Line (With Goal) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                         <path d="M0,100 C50,95 150,85 300,20" stroke="#10b981" strokeWidth="3" fill="none" />
                         <circle cx="300" cy="20" r="4" fill="#10b981" />
                         <text x="250" y="15" className="text-[10px] fill-green-600 font-bold">Target Reached (2030)</text>
                    </svg>
                </div>
                
                <p className="text-center text-sm text-slate-500 mt-6 font-medium">
                    Projection: You are on track to reach your goal by <span className="text-slate-900 font-bold">Oct 2030</span>.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-xs font-bold text-red-700 uppercase">Impact</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-tight">
                        Adding this goal delays "New Car" by 4 months.
                    </p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                     <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-xs font-bold text-green-700 uppercase">Safety</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-tight">
                        Your Emergency Fund remains untouched.
                    </p>
                </div>
            </div>
        </div>
    );
};

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
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Activity size={16} />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">FinTwin Copilot</span>
                </div>
                
                <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        showReasoning 
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-100' 
                        : 'bg-slate-100 text-slate-400'
                    }`}
                >
                    <Brain size={12} />
                    {showReasoning ? 'Reasoning ON' : 'Reasoning OFF'}
                </button>
            </div>
            
            <div 
                ref={scrollRef}
                className="flex-1 bg-slate-50 rounded-2xl p-4 mb-4 overflow-y-auto border border-slate-100 flex flex-col gap-3 min-h-0"
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
  const [goalContext, setGoalContext] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // Resizable Sidebar State (Pixels instead of percentage for better precision)
  const [leftWidth, setLeftWidth] = useState(450); 
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
          // Call API to create goal and plan
          // await createGoal(goalContext); // Needs real implementation import
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
      <div className="max-w-[2400px] mx-auto p-4 md:p-6 h-[calc(100vh-64px)] flex flex-col animate-fade-in">
        
        {/* Top Bar: Progress Stepper */}
        <div className="flex items-center justify-between mb-4 px-2 shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/goals')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ChevronLeft className="text-slate-400" />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Goal Engine</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
                {STAGES.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isActive = idx === currentStage;
                    const isCompleted = idx < currentStage;
                    
                    return (
                        <div key={stage.id} className="flex items-center">
                            <div className={`
                                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
                                ${isActive ? 'bg-slate-900 text-white shadow-lg' : 
                                  isCompleted ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}
                            `}>
                                <Icon size={16} />
                                <span className={!isActive ? "hidden md:inline" : ""}>{stage.label}</span>
                            </div>
                            {idx < STAGES.length - 1 && (
                                <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-slate-200' : 'bg-slate-100'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="w-12 md:w-24"></div> {/* Spacer */}
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
                    h-[400px] lg:h-full 
                    bg-white/50 border border-slate-100 rounded-[2rem] p-4 backdrop-blur-sm 
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
                    bg-white border border-slate-100 rounded-[2rem] shadow-sm p-6 md:p-8 
                    flex flex-col overflow-hidden min-w-0
                "
            >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {currentStage === 0 && (
                        <div className="max-w-2xl mx-auto py-2">
                             <h2 className="text-2xl font-bold text-slate-900 mb-2">Define your Goal</h2>
                             <p className="text-slate-500 mb-6">Start by setting the basic parameters. Copilot will help check feasibility.</p>
                             <GoalDefinitionForm 
                                onSubmit={handleCreate}
                                onChange={handleContextUpdate}
                                submitLabel="Continue to Strategy"
                                initialValues={goalContext}
                             />
                        </div>
                    )}
                    {currentStage === 1 && (
                         <div className="max-w-3xl mx-auto py-4">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Choose your Strategy</h2>
                            <StageStrategy 
                                goalContext={goalContext} 
                                onChange={setGoalContext} 
                                isLoadingAI={isLoadingAI}
                            />
                        </div>
                    )}
                    {currentStage === 2 && (
                         <div className="max-w-3xl mx-auto py-4">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Select Investment Vehicle</h2>
                            <StageProduct goalContext={goalContext} onSelect={(p) => setGoalContext({...goalContext, product: p})} />
                        </div>
                    )}
                    {currentStage === 3 && (
                         <div className="max-w-4xl mx-auto h-full py-4">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Simulation & Impact</h2>
                            <StageSimulation goalContext={goalContext} />
                        </div>
                    )}
                </div>

                {/* Navigation Footer (For Stages 1, 2, 3) */}
                {currentStage > 0 && (
                    <div className="pt-6 mt-4 border-t border-slate-50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleBack}
                            className="px-6 py-3 rounded-full text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                        >
                            Back
                        </button>
                        {currentStage < 3 ? (
                            <button 
                                onClick={handleNext}
                                className="btn-primary-rounded flex items-center gap-2 px-8"
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        ) : (
                             <button 
                                onClick={handleFinalCommit}
                                disabled={submitting}
                                className="btn-primary-rounded bg-green-600 hover:bg-green-700 flex items-center gap-2 px-8 shadow-green-200"
                            >
                                {submitting ? 'Launching...' : 'Launch Goal Plan'} <CheckCircle2 size={18} />
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
