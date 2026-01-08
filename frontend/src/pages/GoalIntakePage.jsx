import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import HomeGoalForm from '../components/goals/forms/HomeGoalForm';
import RetirementGoalForm from '../components/goals/forms/RetirementGoalForm';
import StageStrategy from '../components/goals/StageStrategy';
import StageProduct from '../components/goals/StageProduct';
import StageSimulation from '../components/goals/StageSimulation';
import goalEngineService from '../services/goalEngineService';
import { createGoalWithPlan, getGoals } from '../services/goalService';
import { getCashFlows } from '../services/cashFlowService';
import {
    Send,
    ChevronRight,
    ChevronLeft,
    Target,
    Shield,
    ShoppingBag,
    Activity,
    CheckCircle2,
    Brain,
    Copy,
    Check,
    ExternalLink,
    Search,
    Edit2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

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

// Substage config (Stage 1)
const GENERIC_SUBSTAGES = [
    { id: 'goal_discovery', label: 'Goal Discovery', required: true, description: 'Details, timeline, constraints' },
    { id: 'assumptions', label: 'Key Assumptions', required: false, description: 'Return, inflation, risk, cashflow flexibility' },
    { id: 'gap_analysis', label: 'GAP Analysis', required: true, description: 'Income/assets/debts/policy for gap sizing' }
    // Note: 'summary' substage removed - retirement uses its own summary page, others use the stage summary button
];

// All categories use the same generic substage flow
const getSubstagesForCategory = (category) => {
    return GENERIC_SUBSTAGES;
};

const buildInitialSubstageState = () => ({
    definition: {
        order: GENERIC_SUBSTAGES.map(s => s.id),
        currentIndex: 0,
        statusById: GENERIC_SUBSTAGES.reduce((acc, s) => ({ ...acc, [s.id]: 'collecting' }), {})
    }
});

const SubstageStepIndicator = ({ config, state }) => {
    const current = state?.currentIndex ?? 0;
    return (
        <div className="flex items-center gap-3 mb-4">
            {config.map((item, idx) => {
                const status = state?.statusById?.[item.id] || 'collecting';
                const isActive = idx === current;
                const isDone = status === 'confirmed';
                const nextExists = idx < config.length - 1;
                return (
                    <div key={item.id} className="flex items-center gap-3">
                        <div className="relative group">
                            <div
                                className={`
                                    w-4 h-4 rounded-full border-2 transition-all
                                    ${isDone ? 'border-green-500 bg-green-500/20' : isActive ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'}
                                `}
                            />
                            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                                {item.label}
                            </div>
                        </div>
                        {nextExists && (
                            <div className={`h-0.5 w-12 sm:w-20 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const ConfirmedCard = ({ title, dataLines = [], onEdit, isExpanded, onToggle }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <div className="font-bold text-slate-900">{title}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Confirmed · Click edit to modify</div>
            </div>
            <div className="flex items-center gap-2">
                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                )}
            </div>
        </div>
        {isExpanded && dataLines.length > 0 && (
            <div className="mt-3 space-y-1 text-sm text-slate-600 border-t border-slate-100 pt-3">
                {dataLines.map((line, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                        <span className="text-slate-500">{line.label}</span>
                        <span className="font-semibold text-slate-800">{line.value}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const GapAnalysisForm = ({ initialValues = {}, onSubmit, onCancel }) => {
    const [form, setForm] = useState(() => ({
        monthly_income: '',
        liquid_assets: '',
        investments: '',
        debts: '',
        region_policy: '',
        ...initialValues
    }));

    const updateField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Income</label>
                    <input
                        type="number"
                        value={form.monthly_income}
                        onChange={(e) => updateField('monthly_income', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="e.g., 12000"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Liquid Assets</label>
                    <input
                        type="number"
                        value={form.liquid_assets}
                        onChange={(e) => updateField('liquid_assets', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Cash / short-term holdings"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Investments</label>
                    <input
                        type="number"
                        value={form.investments}
                        onChange={(e) => updateField('investments', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Funds / stocks / pension"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Debt / Loans</label>
                    <input
                        type="number"
                        value={form.debts}
                        onChange={(e) => updateField('debts', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Mortgage / auto / credit"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Policy / Tax Constraints</label>
                <textarea
                    value={form.region_policy}
                    onChange={(e) => updateField('region_policy', e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    rows={3}
                    placeholder="Region, tax benefits, regulatory constraints"
                />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm font-bold text-slate-500 hover:text-slate-700"
                    >
                        Back to edit
                    </button>
                )}
                <button
                    type="submit"
                    className="btn-primary-rounded px-5 py-2 text-sm"
                >
                    Save & review
                </button>
            </div>
        </form>
    );
};

const AssumptionForm = ({ initialValues = {}, onSubmit, onCancel }) => {
    const [form, setForm] = useState(() => ({
        expected_return_pct: initialValues.expected_return_pct || 6,
        inflation_pct: initialValues.inflation_pct || 2.5,
        risk_attitude: initialValues.risk_attitude || 'balanced',
        cashflow_flexibility: initialValues.cashflow_flexibility || 'medium',
        ...initialValues
    }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Return (%)</label>
                    <input
                        type="number"
                        value={form.expected_return_pct}
                        onChange={(e) => setForm(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inflation (%)</label>
                    <input
                        type="number"
                        value={form.inflation_pct}
                        onChange={(e) => setForm(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Attitude</label>
                    <select
                        value={form.risk_attitude}
                        onChange={(e) => setForm(prev => ({ ...prev, risk_attitude: e.target.value }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="growth">Growth</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cashflow Flexibility</label>
                    <select
                        value={form.cashflow_flexibility}
                        onChange={(e) => setForm(prev => ({ ...prev, cashflow_flexibility: e.target.value }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm font-bold text-slate-500 hover:text-slate-700"
                    >
                        Back to edit
                    </button>
                )}
                <button
                    type="submit"
                    className="btn-primary-rounded px-5 py-2 text-sm"
                >
                    Save & review
                </button>
            </div>
        </form>
    );
};

// Copilot Component - NOW ACTIVE AND CONNECTED
const Copilot = ({ 
    stage, 
    currentStageLabel, 
    goalContext, 
    onUpdateContext, 
    messages, 
    setMessages,
    useRag,
    setUseRag
}) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null); 
    const [showReasoning, setShowReasoning] = useState(true);
    const [expandedRef, setExpandedRef] = useState(null);
    
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

    // Helper to format text with clickable citations
    const formatMessage = (text, references = []) => {
        if (!text) return '';
        if (!references || references.length === 0) return text;

        let formattedText = text;
        // Search for patterns like [1], [2], etc.
        const citationRegex = /\[(\d+)\]/g;
        
        // This is a simple replacement, ReactMarkdown handles the rendering
        // We'll turn [1] into a markdown link to the source if available
        formattedText = formattedText.replace(citationRegex, (match, num) => {
            const index = parseInt(num) - 1;
            const ref = references[index];
            if (ref && ref.url) {
                return `[${match}](${ref.url})`;
            }
            return match;
        });

        return formattedText;
    };

    const handleSend = async (overrideText) => {
        const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
        if (!textToSend.trim()) return;
        
        const userMsg = { role: 'user', text: textToSend };
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
                previousDecisions: [],
                useRag
            }, (chunk) => {
                accumulatedRaw += chunk;
                
                const streamingThought = extractField('thought_process', accumulatedRaw);
                const streamingRationale = extractField('rationale', accumulatedRaw);

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        // Priority: Rationale > Thought Process > Loading State
                        let displayText = streamingRationale || streamingThought || "Thinking...";

                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: displayText,
                            thought_process: streamingThought,
                            isStreaming: true
                        };
                    }
                    return newMessages;
                });
            });
            
            if (finalData) {
                // finalData is the json field from SSE (ai_decision + form_schema)
                const aiDecision = finalData.ai_decision;
                
                // --- FAULT TOLERANCE: Try to extract fields manually if aiDecision is missing ---
                let fallbackDecision = {};
                if (!aiDecision) {
                    console.warn('[Goal Engine] AI Decision object missing, attempting manual extraction from raw text');
                    fallbackDecision = {
                        goal_name: extractField('goal_name', accumulatedRaw),
                        category: extractField('category', accumulatedRaw),
                        priority: extractField('priority', accumulatedRaw),
                        target_amount: Number(extractField('target_amount', accumulatedRaw)) || undefined,
                        due_date: extractField('due_date', accumulatedRaw)
                    };
                    
                    // Filter out undefined
                    Object.keys(fallbackDecision).forEach(key => 
                        fallbackDecision[key] === undefined && delete fallbackDecision[key]
                    );
                }

                const aiText = aiDecision?.rationale || extractField('rationale', accumulatedRaw) || "I've updated the plan based on your request.";

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: aiText,
                            isTyping: false,
                            isStreaming: false,
                            thought_process: aiDecision?.thought_process || extractField('thought_process', accumulatedRaw),
                            references: aiDecision?.references
                        };
                    }
                    return newMessages;
                });

                const effectiveDecision = aiDecision || (Object.keys(fallbackDecision).length > 0 ? fallbackDecision : null);
                
                if (effectiveDecision && onUpdateContext) {
                    onUpdateContext(effectiveDecision);
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'system', text: "Sorry, I'm having trouble connecting to the brain." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const hasUserMessages = messages.some(m => m.role === 'user');

    return (
        <div className="h-full flex flex-col">
            {/* Header with reasoning & RAG Toggle */}
            <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Activity size={12} className="lg:w-[14px] lg:h-[14px]" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs lg:text-sm">FinTwin Copilot</span>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* RAG Switch */}
                    <button 
                        onClick={() => setUseRag(!useRag)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[9px] lg:text-[10px] font-bold transition-all ${
                            useRag 
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-100' 
                            : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                        <Search size={10} />
                        {useRag ? 'Search ON' : 'Search OFF'}
                    </button>

                    {/* Reasoning Switch */}
                    <button 
                        onClick={() => setShowReasoning(!showReasoning)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[9px] lg:text-[10px] font-bold transition-all ${
                            showReasoning 
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-100' 
                            : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                        <Brain size={10} />
                        {showReasoning ? 'Reasoning ON' : 'Reasoning OFF'}
                    </button>
                </div>
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
                                            text={formatMessage(msg.text, msg.references)} 
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
                                                ),
                                                a: ({node, ...props}) => (
                                                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-bold hover:underline" />
                                                )
                                            }}
                                        >
                                            {formatMessage(msg.text, msg.references)}
                                        </ReactMarkdown>
                                    )}
                                </div>

                                {/* References */}
                                {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-2">
                                        {msg.references.map((ref, idx) => {
                                            const marker = ref.marker || `[${idx + 1}]`;
                                            const title = ref.title || 'Source';
                                            const hasUrl = !!ref.url;
                                            const refKey = `${idx}-${title}-${marker}`;
                                            const isOpen = expandedRef === refKey;
                                            const source = ref.source || 'KnowledgeBase';

                                            const header = (
                                                <>
                                                    <span className="text-slate-500 font-semibold">{marker}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                                                            {hasUrl ? <ExternalLink size={10} /> : null} {title}
                                                        </div>
                                                        {!hasUrl && ref.snippet && (
                                                            <div className="text-[10px] text-slate-500 line-clamp-2">{ref.snippet}</div>
                                                        )}
                                                        <div className="text-[10px] text-slate-400">{source}</div>
                                                    </div>
                                                </>
                                            );

                                            if (hasUrl) {
                                                return (
                                                    <a
                                                        key={idx}
                                                        href={ref.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-start gap-2 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-600 transition-colors"
                                                    >
                                                        {header}
                                                    </a>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-100"
                                                    onClick={() => setExpandedRef(isOpen ? null : refKey)}
                                                >
                                                    <div className="flex items-start gap-2">{header}</div>
                                                    {ref.snippet && isOpen && (
                                                        <div className="mt-1 p-2 bg-white border border-slate-200 rounded text-[11px] text-slate-600 shadow-sm whitespace-pre-wrap">
                                                            {ref.snippet}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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

            {/* Quick Options */}
            {currentStageLabel === 'definition' && !hasUserMessages && (
                <div className="flex flex-wrap justify-end gap-2 mb-3">
                    {[
                        "I want a retirement plan that lets me travel overseas once a year.",
                        "I want to save for my child's university education.",
                        "What's a realistic goal for a first-home deposit?"
                    ].map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSend(opt)}
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] text-indigo-700 font-bold hover:bg-indigo-100 transition-all active:scale-95 shadow-sm text-left"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}

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
  const [useRag, setUseRag] = useState(true); // Default to RAG enabled
  
  // Resizable Sidebar State (Pixels instead of percentage for better precision)
  const [leftWidth, setLeftWidth] = useState(window.innerWidth > 1440 ? 450 : 340); 
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef(null);

  // NEW: Track loading state for stage transitions
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  // NEW: Substage state machine with reversible data
  const [substageState, setSubstageState] = useState(buildInitialSubstageState);
  const [substageData, setSubstageData] = useState({});
  const [stageSummary, setStageSummary] = useState({});
  const [recalcFlags, setRecalcFlags] = useState({});
  const [cardExpanded, setCardExpanded] = useState({});

  const activeSubstages = {
      definition: getSubstagesForCategory(goalContext.category)
  };

  // Rebuild substages if category changes
  useEffect(() => {
    const newConfig = activeSubstages.definition;
    const newIds = newConfig.map(s => s.id);
    const currentOrder = substageState.definition?.order || [];
    if (JSON.stringify(currentOrder) === JSON.stringify(newIds)) return;
    setSubstageState(prev => ({
        ...prev,
        definition: {
            order: newIds,
            currentIndex: 0,
            statusById: newIds.reduce((acc, id) => ({
                ...acc,
                [id]: prev.definition?.statusById?.[id] || 'collecting'
            }), {})
        }
    }));
  }, [goalContext.category]);

  const STAGES = [
      { id: 'definition', label: 'Definition', icon: Target },
      { id: 'strategy', label: 'Strategy', icon: Shield },
      { id: 'product', label: 'Product', icon: ShoppingBag },
      { id: 'simulation', label: 'Simulation', icon: Activity },
  ];

  // Allow Copilot or substages to update context while preserving AI payload
  const handleContextUpdate = (updates) => {
      if (!updates) return;

      const normalized = { ...updates };
      const isAiDecisionPayload = Boolean(
          normalized.strategy_recommendation ||
          normalized.thought_process ||
          normalized.rationale ||
          normalized.allocation ||
          normalized.funding_structure ||
          normalized.portfolio_options ||
          normalized.product_selection ||
          normalized.strategy_recommendation?.portfolio_options ||
          normalized.strategy_recommendation?.product_selection
      );
      
      if (normalized.category) {
          normalized.category = normalized.category.toLowerCase();
      }

      if (normalized.retirement_age || normalized.living_expense_pa) {
           if (!normalized.category) normalized.category = 'retirement';
      }
      
      const detailFields = [
          // Goal discovery fields
          'retirement_age', 'life_expectancy', 'living_expense_pa', 'include_superannuation',
          'location', 'property_price_estimate', 'deposit_percentage', 'is_first_home',
          'vehicle_type', 'trade_in_value', 
          'destination', 'travelers_count', 'duration_days',
          // Assumptions fields
          'expected_return_pct', 'inflation_pct', 'risk_attitude', 'cashflow_flexibility',
          'mortgage_rate_pct', 'loan_term_years',
          // Gap analysis fields
          'liquid_assets', 'investments', 'debts', 'monthly_income',
          'current_super_balance', 'annual_contribution', 'current_amount', 'region_policy'
      ];

      let detailsFound = false;
      const newDetails = {};

      detailFields.forEach(field => {
          if (normalized[field] !== undefined) {
              newDetails[field] = normalized[field];
              delete normalized[field];
              detailsFound = true;
          }
      });

      setGoalContext(prev => {
          const nextState = { ...prev };

          if (isAiDecisionPayload) {
              nextState.ai_decision = {
                  ...prev.ai_decision,
                  ...normalized
              };
          }

          Object.assign(nextState, normalized);
          
          // if (nextState.category === 'retirement' || nextState.category === 'home') {
          //     if (prev.target_amount && !updates.target_amount_manual_override) {
          //         nextState.target_amount = prev.target_amount; 
          //     }
          // }

          if (detailsFound) {
              nextState.goal_details = {
                  ...prev.goal_details,
                  ...newDetails
              };
          }
          if (normalized.ai_decision?.strategy_recommendation) {
             nextState.ai_decision = {
                 ...prev.ai_decision,
                 ...normalized.ai_decision
             }
          }

          return nextState;
      });
  };

  const currentStageId = STAGES[currentStage].id;
  const currentSubstageConfig = activeSubstages[currentStageId];
  const computeCurrentSubstageId = () => {
      // If current stage has no substages, return null
      if (!currentSubstageConfig || currentSubstageConfig.length === 0) return null;
      
      const state = substageState?.[currentStageId];
      const order = state?.order || currentSubstageConfig.map(s => s.id);
      const firstPending = order.findIndex(id => state?.statusById?.[id] !== 'confirmed');
      if (firstPending === -1) return order.length > 0 ? order[order.length - 1] : 'goal_discovery';
      return order[firstPending];
  };
  const currentSubstageId = computeCurrentSubstageId();
  const currentSubstageIndex = currentSubstageConfig ? Math.max(0, currentSubstageConfig.findIndex(s => s.id === currentSubstageId)) : -1;

  const getSubstageGuidance = (subId) => {
      if (subId === 'goal_discovery') return "Let's capture the basics: goal name, target date, target amount, and any key details.";
      if (subId === 'assumptions') return "Now set your key assumptions (return, inflation, risk attitude, cashflow flexibility).";
    if (subId === 'gap_analysis') return "Let's quantify your gap: income, assets, debts, and policy notes.";
    return "Provide details to continue.";
  };

  const updateSubstageStatus = (stageId, subId, status) => {
      if (!activeSubstages[stageId]) return;
      setSubstageState(prev => {
          const stage = prev[stageId] || { order: activeSubstages[stageId].map(s => s.id), statusById: {} };
          return {
              ...prev,
              [stageId]: {
                  ...stage,
                  statusById: {
                      ...stage.statusById,
                      [subId]: status
                  }
              }
          };
      });
  };

  const handleSubstageSubmit = async (stageId, subId, payload) => {
      // 1. Persist context
      handleContextUpdate(payload);
      
      // 2. Save substage data
      const updatedSubstageData = {
          ...substageData,
          [stageId]: {
              ...(substageData[stageId] || {}),
              [subId]: { data: payload, dirty: false }
          }
      };
      setSubstageData(updatedSubstageData);
      setStageSummary(prev => ({ ...prev, [stageId]: { confirmed: false } }));
      
      // 3. Clear recalc flag
      setRecalcFlags(prev => ({
          ...prev,
          [stageId]: { ...(prev[stageId] || {}), [subId]: false }
      }));

      // 4. Calculate next substage BEFORE setState (to avoid closure issues)
      const config = activeSubstages[stageId];
      const currentState = substageState[stageId] || { 
          order: activeSubstages[stageId].map(s => s.id), 
          statusById: {} 
      };
      
      // Simulate the new status after confirming current substage
      const newStatusById = {
          ...currentState.statusById,
          [subId]: 'confirmed'
      };
      
      // Find next substage ID
      let nextSubId = null;
      if (config) {
         const firstIncomplete = config.findIndex((item) => {
             return newStatusById[item.id] !== 'confirmed';
         });
         
         if (firstIncomplete !== -1) {
             nextSubId = config[firstIncomplete].id;
         }
      }
      
      // Now update state
      setSubstageState(prev => {
          const stage = prev[stageId] || currentState;
          
          return {
              ...prev,
              [stageId]: {
                  ...stage,
                  statusById: newStatusById
                  // currentIndex stays the same for now
              }
          };
      });

    // 5. Auto-trigger AI guidance for next substage (definition stage only)
    if (stageId === 'definition') {
        if (!nextSubId) {
            // All substages completed! Show summary card
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: "✓ All substages completed! Click 'Confirm & continue' below to proceed to Strategy stage." 
            }]);
            return;
        }
        
        // SPECIAL CASE: For 'summary' substage, don't call AI, just advance immediately
        if (nextSubId === 'summary') {
            const nextIdx = config.findIndex(s => s.id === nextSubId);
            setSubstageState(prev => ({
                ...prev,
                [stageId]: {
                    ...prev[stageId],
                    currentIndex: nextIdx
                }
            }));
            
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: "Your plan is ready for review. Please check the summary and confirm to proceed." 
            }]);
            return;
        }

        setIsLoadingAI(true); // Show loading state
        
        // Add user confirmation message
        const confirmedLabel = config.find(s => s.id === subId)?.label || subId;
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: `✓ ${confirmedLabel} confirmed` 
        }]);

        // Add AI "thinking" message
        const nextLabel = config.find(s => s.id === nextSubId)?.label || nextSubId;
        const aiMsgIndex = messages.length + 1;
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            text: `Preparing ${nextLabel}...`,
            isTyping: true,
            isStreaming: true
        }]);

        try {
            let accumulatedRaw = '';
            
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

            const data = await goalEngineService.generateDecisionStream({
                stage: 'definition',
                goalContext: {
                    ...goalContext,
                    substage: nextSubId
                },
                userInput: { text: '' },
                substageData: updatedSubstageData.definition || {},
                previousDecisions: [],
                useRag
            }, (chunk) => {
                accumulatedRaw += chunk;
                const streamingThought = extractField('thought_process', accumulatedRaw);
                const streamingRationale = extractField('rationale', accumulatedRaw);

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        // Always show something, never empty
                        const displayText = streamingRationale || streamingThought || `Analyzing ${nextLabel}...`;
                        
                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: displayText,
                            thought_process: streamingThought,
                            isStreaming: true
                        };
                    }
                    return newMessages;
                });
            });

            if (data?.ai_decision) {
                handleContextUpdate(data.ai_decision);
                
                const aiText = data.text || data.ai_decision.rationale || `Ready for ${nextLabel}. ${getSubstageGuidance(nextSubId)}`;
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMsgIndex]) {
                        newMessages[aiMsgIndex] = {
                            ...newMessages[aiMsgIndex],
                            text: aiText,
                            isTyping: false,
                            isStreaming: false,
                            thought_process: data.ai_decision.thought_process,
                            references: data.ai_decision.references
                        };
                    }
                    return newMessages;
                });
            }

            // NOW advance to next substage
            const nextIdx = config.findIndex(s => s.id === nextSubId);
            setSubstageState(prev => ({
                ...prev,
                [stageId]: {
                    ...prev[stageId],
                    currentIndex: nextIdx
                }
            }));
            
        } catch (err) {
            console.error('Auto-advance AI call failed:', err?.message || err);
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: `Could not prepare ${nextLabel}. You can still fill it out manually.` 
            }]);
            
            // Still advance even if AI fails
            const nextIdx = config.findIndex(s => s.id === nextSubId);
            setSubstageState(prev => ({
                ...prev,
                [stageId]: {
                    ...prev[stageId],
                    currentIndex: nextIdx
                }
            }));
        } finally {
            setIsLoadingAI(false);
        }
    }
  };

  // Simplified: No longer need separate confirm handler since submit now auto-confirms
  // Keep this for backward compatibility with edit flow

  const handleSubstageEdit = (stageId, subId) => {
      // Mark as collecting and set as current
      updateSubstageStatus(stageId, subId, 'collecting');
      
      // Flag for recompute
      setRecalcFlags(prev => ({
          ...prev,
          [stageId]: { ...(prev[stageId] || {}), [subId]: true }
      }));
      
      // Invalidate stage summary
      setStageSummary(prev => ({ ...prev, [stageId]: { confirmed: false } }));
      
      // Jump to this substage
      const config = activeSubstages[stageId];
      if (config) {
          const targetIdx = config.findIndex(s => s.id === subId);
          if (targetIdx !== -1) {
              setSubstageState(prev => ({
                  ...prev,
                  [stageId]: {
                      ...prev[stageId],
                      currentIndex: targetIdx
                  }
              }));
          }
      }
      
      // Add guidance message
      const guidance = getSubstageGuidance(subId);
      setMessages(prev => [...prev, { 
          role: 'system', 
          text: `Editing ${subId.replace(/_/g, ' ')}. ${guidance}` 
      }]);
  };

  const isStageSubstagesConfirmed = (stageId) => {
      const cfg = activeSubstages[stageId];
      if (!cfg) return true;
      const statusById = substageState?.[stageId]?.statusById || {};
      return cfg.filter(s => s.required !== false).every(s => statusById[s.id] === 'confirmed');
  };

  const handleStageSummaryConfirm = (stageId) => {
      setStageSummary(prev => ({
          ...prev,
          [stageId]: { confirmed: true, timestamp: Date.now() }
      }));
  };

    const getGreeting = (stageIdx) => {
      const greetings = {
          0: "Let's define your target. I can help you calculate how much you need or check if your plan is feasible. Try one of the options below to get started:",
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

  // Fetch real goals for enrichment
  const [realGoals, setRealGoals] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);

  useEffect(() => {
    const fetchRealData = async () => {
        try {
            const [goalsData, cfData] = await Promise.all([
                getGoals(),
                getCashFlows()
            ]);
            setRealGoals(goalsData || []);
            setCashFlows(cfData || []);
        } catch (err) {
            console.error('Failed to fetch real data for enrichment:', err);
        }
    };
    fetchRealData();
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

          // Process real goals data to match simulation_data.other_goals format
          const currentGoalId = context?._id || context?.goal_id;
          
          // Helper: convert amount to annual based on frequency
          const TO_ANNUAL = { 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Yearly': 1, 'One-Off': 0 };
          const toMonthly = (amount, freq) => (amount * (TO_ANNUAL[freq] || 0)) / 12;

          const processedOtherGoals = realGoals
            .filter(g => g._id !== currentGoalId)
            .map(g => {
                // Find matching cashflow to get real monthly allocation
                const cf = cashFlows.find(f => f.type === 'Investment' && f.name.includes(`(${g.goal_name})`));
                return {
                    name: g.goal_name,
                    monthly_allocation: cf ? Math.round(toMonthly(cf.amount, cf.frequency)) : 0,
                    priority: g.priority || 'want'
                };
            })
            .filter(g => g.monthly_allocation > 0);

          const contextWithOthers = {
            ...context,
            simulation_data: {
              ...(context?.simulation_data || {}),
              other_goals: processedOtherGoals.length > 0 ? processedOtherGoals : context?.simulation_data?.other_goals
            }
          };

          // Ensure UI state also sees the other goals list for display
          setGoalContext(prev => ({
            ...prev,
            simulation_data: {
              ...(prev.simulation_data || {}),
              other_goals: processedOtherGoals.length > 0 ? processedOtherGoals : prev.simulation_data?.other_goals
            }
          }));

          const data = await goalEngineService.generateDecisionStream({
              stage: stageId,
              goalContext: contextWithOthers,
              useRag
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
          } else {
              // --- FAULT TOLERANCE: Manual extraction for stage transitions too ---
              console.warn('[Goal Engine] AI Decision missing during stage transition, attempting manual extraction');
              const fallbackDecision = {
                  goal_name: extractField('goal_name', accumulatedRaw),
                  category: extractField('category', accumulatedRaw),
                  priority: extractField('priority', accumulatedRaw),
                  target_amount: Number(extractField('target_amount', accumulatedRaw)) || undefined,
                  due_date: extractField('due_date', accumulatedRaw)
              };

              Object.keys(fallbackDecision).forEach(key => fallbackDecision[key] === undefined && delete fallbackDecision[key]);

              if (Object.keys(fallbackDecision).length > 0) {
                  handleContextUpdate(fallbackDecision);
              }

              setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[aiMsgIndex]) {
                      newMessages[aiMsgIndex] = {
                          ...newMessages[aiMsgIndex],
                          text: extractField('rationale', accumulatedRaw) || "Analysis complete.",
                          isTyping: false,
                          isStreaming: false,
                          thought_process: extractField('thought_process', accumulatedRaw)
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
              goalContext: context,
              useRag
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
      if (currentStageId === 'definition') {
          const allConfirmed = isStageSubstagesConfirmed('definition');
          
          if (!allConfirmed) {
              const cfg = activeSubstages.definition;
              const statusById = substageState?.definition?.statusById || {};
              const missing = cfg?.filter(s => s.required !== false && statusById[s.id] !== 'confirmed')
                                 .map(s => s.label || s.id);
              alert(`Please complete and confirm all substages before continuing.\n\nMissing: ${missing.join(', ')}`);
              return;
          }
          if (!stageSummary.definition?.confirmed) {
              alert('Please confirm the stage summary before continuing.');
              return;
          }
      }

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
              // Include selected portfolio if user made a selection (prefer full selection data)
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

  const getSubstageStatus = (stageId, subId) => substageState?.[stageId]?.statusById?.[subId] || 'collecting';

  const buildDataLines = (stageId, subId) => {
      const payload = substageData?.[stageId]?.[subId]?.data || {};
      const fmt = (val) => val ? (typeof val === 'number' && val > 999 ? `$${val.toLocaleString()}` : val) : '—';
      
      if (subId === 'goal_discovery') {
          const lines = [
            { label: 'Goal', value: payload.goal_name || goalContext.goal_name || '—' },
            { label: 'Category', value: (payload.category || goalContext.category || '—').replace(/_/g, ' ') }
          ];
          
          // Add category-specific discovery fields
          if (goalContext.category === 'retirement') {
              lines.push(
                  { label: 'Annual Expense', value: fmt(payload.living_expense_pa || goalContext.goal_details?.living_expense_pa) },
                  { label: 'Location', value: payload.location || goalContext.goal_details?.location || '—' }
              );
          } else if (goalContext.category === 'home') {
              lines.push(
                  { label: 'Property Price', value: fmt(payload.property_price_estimate || goalContext.goal_details?.property_price_estimate) },
                  { label: 'Deposit %', value: payload.deposit_percentage || goalContext.goal_details?.deposit_percentage || '—' }
              );
          } else {
              lines.push(
                  { label: 'Target Amount', value: fmt(payload.target_amount || goalContext.target_amount) },
                  { label: 'Due Date', value: payload.due_date || goalContext.due_date || '—' }
              );
          }
          
          return lines;
      }
      
      if (subId === 'assumptions') {
          const lines = [
            { label: 'Expected Return', value: `${payload.expected_return_pct ?? goalContext.goal_details?.expected_return_pct ?? '—'}%` },
            { label: 'Inflation', value: `${payload.inflation_pct ?? goalContext.goal_details?.inflation_pct ?? '—'}%` },
            { label: 'Risk Attitude', value: (payload.risk_attitude || goalContext.goal_details?.risk_attitude || '—').replace(/_/g, ' ') }
          ];
          
          if (goalContext.category === 'retirement') {
              lines.push(
                  { label: 'Retirement Age', value: payload.retirement_age ?? goalContext.goal_details?.retirement_age ?? '—' },
                  { label: 'Planning Until', value: payload.life_expectancy ?? goalContext.goal_details?.life_expectancy ?? '—' }
              );
          }
          
          return lines;
      }
      
      if (subId === 'gap_analysis') {
          const lines = [
            { label: 'Liquid Savings', value: fmt(payload.liquid_assets) },
            { label: 'Investments', value: fmt(payload.investments) }
          ];
          
          if (goalContext.category === 'retirement') {
              lines.unshift({ label: 'KiwiSaver Balance', value: fmt(payload.current_super_balance || goalContext.goal_details?.current_super_balance) });
          }
          
          return lines;
      }
      
      return [];
  };

  // Removed: No longer need awaiting_confirm state - forms auto-confirm on submit

  const renderDefinitionSubstageBody = (subId, needsRecompute = false) => {
      if (currentStageId !== 'definition' || !subId) return null;
      const status = getSubstageStatus('definition', subId);
      const subData = substageData?.definition?.[subId]?.data || {};

      // If confirmed, don't render form (card is rendered in the main render loop)
      if (status === 'confirmed') return null;

      // Common submit handler that merges data appropriately
      const createSubmitHandler = (mergeLogic) => (payload) => {
          const finalPayload = mergeLogic ? mergeLogic(payload) : payload;
          handleSubstageSubmit('definition', subId, finalPayload);
      };

      // === GOAL DISCOVERY ===
      if (subId === 'goal_discovery') {
          // Retirement: Use custom form
          if (goalContext.category === 'retirement') {
              return (
                  <RetirementGoalForm
                      activeSubstage="goal_discovery"
                      initialValues={goalContext}
                      onChange={handleContextUpdate}
                      onSubstageSubmit={createSubmitHandler()}
                      needsRecompute={needsRecompute}
                  />
              );
          }
          
          // Home: Use custom form
          if (goalContext.category === 'home') {
              return (
                  <HomeGoalForm
                      activeSubstage="goal_discovery"
                      initialValues={goalContext}
                      onChange={handleContextUpdate}
                      onSubstageSubmit={createSubmitHandler()}
                  />
              );
          }
          
          // Generic: Use standard form
          return (
              <GoalDefinitionForm
                  onSubmit={createSubmitHandler()}
                  onChange={handleContextUpdate}
                  initialValues={goalContext}
                  submitLabel="Save & Continue"
              />
          );
      }

      // === ASSUMPTIONS ===
      if (subId === 'assumptions') {
          if (goalContext.category === 'retirement') {
              return (
                  <RetirementGoalForm
                      activeSubstage="assumptions"
                      substageData={subData}
                      initialValues={goalContext}
                      onChange={handleContextUpdate}
                      onSubstageSubmit={createSubmitHandler()}
                      needsRecompute={needsRecompute}
                  />
              );
          }
          
          if (goalContext.category === 'home') {
              return (
                  <HomeGoalForm
                      activeSubstage="assumptions"
                      substageData={subData}
                      initialValues={goalContext}
                      onSubstageSubmit={createSubmitHandler()}
                  />
              );
          }
          
          return (
              <AssumptionForm
                  initialValues={subData}
                  onSubmit={createSubmitHandler()}
              />
          );
      }

      // === GAP ANALYSIS ===
      if (subId === 'gap_analysis') {
          const gapMergeLogic = (payload) => {
              // Also update simulation_data.financials.gap_inputs for consistency
              handleContextUpdate({ 
                  simulation_data: { 
                      financials: { 
                          ...goalContext.simulation_data?.financials, 
                          gap_inputs: payload 
                      } 
                  } 
              });
              return payload;
          };
          
          if (goalContext.category === 'retirement') {
              return (
                  <RetirementGoalForm
                      activeSubstage="gap_analysis"
                      substageData={subData}
                      initialValues={goalContext}
                      onChange={handleContextUpdate}
                      onSubstageSubmit={createSubmitHandler(gapMergeLogic)}
                      needsRecompute={needsRecompute}
                  />
              );
          }
          
          if (goalContext.category === 'home') {
              return (
                  <HomeGoalForm
                      activeSubstage="gap_analysis"
                      substageData={subData}
                      initialValues={goalContext}
                      onSubstageSubmit={createSubmitHandler(gapMergeLogic)}
                  />
              );
          }
          
        return (
            <GapAnalysisForm
                initialValues={subData}
                onSubmit={createSubmitHandler(gapMergeLogic)}
            />
        );
    }

    return null;
};

  const allDefinitionConfirmed = isStageSubstagesConfirmed('definition');

  // Auto-collapse cards when all are confirmed
  useEffect(() => {
      if (allDefinitionConfirmed) {
          setCardExpanded({});
      }
  }, [allDefinitionConfirmed]);

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

  // When entering a new collecting substage in Definition, append guidance to chat
  useEffect(() => {
      if (currentStageId !== 'definition' || !currentSubstageId) return;
      const status = getSubstageStatus('definition', currentSubstageId);
      if (status !== 'collecting') return;

      const guidance = getSubstageGuidance(currentSubstageId);
      setMessages(prev => {
          // Avoid spamming identical guidance
          const last = prev[prev.length - 1];
          if (last && last.role === 'system' && last.text === guidance) return prev;
          return [...prev, { role: 'system', text: guidance }];
      });
  }, [currentStageId, currentSubstageId, substageState]);

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
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 lg:w-14 h-0.5 ${isCompleted ? 'bg-slate-200' : 'bg-slate-100'}`}></div>
                                    <div className={`w-2 h-2 rounded-full -mt-1 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                </div>
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
                    useRag={useRag}
                    setUseRag={setUseRag}
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
        <div className={`max-w-3xl mx-auto py-1 ${currentSubstageId === 'summary' ? '' : 'space-y-4'}`}>
             {currentSubstageId !== 'summary' && (
                <>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl lg:text-2xl font-bold text-slate-900">
                            <span className="text-slate-900 mr-2">{goalContext.goal_name || (goalContext.category ? goalContext.category : 'Goal')} Plan:</span>
                            <span className="text-indigo-600">{currentSubstageConfig?.[currentSubstageIndex]?.label}</span>
                        </h2>
                        {recalcFlags.definition?.[currentSubstageId] && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                                Update Required
                            </span>
                        )}
                    </div>
                    <p className="text-xs lg:text-sm text-slate-500">Complete each substage, confirm to lock as background, and edit anytime to recompute.</p>

                    <div className="mt-1">
                        <SubstageStepIndicator
                        config={activeSubstages.definition}
                        state={substageState.definition}
                        />
                    </div>
                </>
             )}

             {/* Sequential substage rendering: confirmed cards + current form/loading */}
             <div className={currentSubstageId === 'summary' ? '' : 'space-y-3'}>
                                {(() => {
                                    const order = activeSubstages.definition.map(s => s.id);
                                    const state = substageState.definition;
                                    // Use explicit currentIndex from state, NOT calculated from statusById
                                    const currentIdx = state?.currentIndex ?? 0;

    return order.map((subId, idx) => {
        const status = getSubstageStatus('definition', subId);
        const config = activeSubstages.definition.find(s => s.id === subId);
        
        // Only render up to current substage (use state.currentIndex!)
        if (idx > currentIdx) return null;

        // SPECIAL CASE: If we are at the 'summary' substage, 
        // hide previous confirmed cards to show a clean full-page summary
        const isAtSummary = order[currentIdx] === 'summary';
        if (isAtSummary && subId !== 'summary') return null;

        // Confirmed substages: show compact card
        if (status === 'confirmed') {
                                            const isExpanded = cardExpanded[subId];
                                            return (
                                                <ConfirmedCard
                                                    key={subId}
                                                    title={config?.label || subId}
                                                    dataLines={buildDataLines('definition', subId)}
                                                    onEdit={() => handleSubstageEdit('definition', subId)}
                                                    isExpanded={isExpanded}
                                                    onToggle={() => setCardExpanded(prev => ({ ...prev, [subId]: !prev[subId] }))}
                                                />
                                            );
                                        }

                                        // Collecting: show full form OR loading state
                                        if (status === 'collecting') {
                                            // If AI is loading for this substage, show loading skeleton
                                            if (isLoadingAI && idx === currentIdx) {
                                                return (
                                                    <div key={subId} className="animate-fade-in">
                                                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                                                            <div className="flex flex-col items-center justify-center gap-4 py-12">
                                                                <div className="relative">
                                                                    <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                                    <Brain className="absolute inset-0 m-auto text-indigo-600" size={24} />
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold text-slate-900 mb-1">AI is preparing {config?.label}...</div>
                                                                    <div className="text-sm text-slate-500">Analyzing your information and generating guidance</div>
                                                                </div>
                                                                <div className="flex gap-2 mt-2">
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div key={subId} className="animate-fade-in">
                                                    {renderDefinitionSubstageBody(subId, recalcFlags.definition?.[subId])}
                                                </div>
                                            );
                                        }

                                        return null;
                                    });
                                })()}
                             </div>

                             {/* Stage summary appears after required substages are confirmed */}
                             {allDefinitionConfirmed && currentSubstageId !== 'summary' && (
                                <div className="animate-fade-in">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stage Summary</div>
                                                <div className="text-sm text-slate-600">All substages completed. Confirm to proceed to Strategy.</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Mark stage summary as confirmed
                                                    handleStageSummaryConfirm('definition');
                                                    
                                                    // Directly advance to next stage (skip handleNext validation)
                                                    // We know all substages are confirmed because this button only shows when allDefinitionConfirmed is true
                                                    if (currentStage < STAGES.length - 1) {
                                                        const nextStageIndex = currentStage + 1;
                                                        const nextStageId = STAGES[nextStageIndex].id;
                                                        
                                                        setCurrentStage(nextStageIndex);
                                                        
                                                        // Auto-trigger analysis for Strategy stage
                                                        if (nextStageId === 'strategy') {
                                                            runStageAnalysis(nextStageId, goalContext, nextStageIndex);
                                                        }
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-full text-sm font-bold ${stageSummary.definition?.confirmed ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}
                                            >
                                                {stageSummary.definition?.confirmed ? 'Confirmed' : 'Confirm & continue'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             )}
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
                                    selectedPortfolio: portfolio,  // mirror to selectedPortfolio
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
