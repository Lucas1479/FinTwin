/**
 * Copilot - AI Assistant Component
 * 
 * Extracted from GoalIntakePage.jsx, handles conversational interaction with users,
 * providing personalized financial advice and supporting multiple modes (auto-fill, Q&A, smart agent).
 * 
 * @component
 * @example
 * ```jsx
 * <Copilot
 *   stage={stage}
 *   currentStageLabel="definition"
 *   goalContext={goalContext}
 *   onUpdateContext={handleUpdateContext}
 *   messages={messages}
 *   setMessages={setMessages}
 *   useRag={true}
 *   setUseRag={setUseRag}
 *   mode="agent"
 *   setMode={setMode}
 *   allowAIDataSharing={true}
 *   setAllowAIDataSharing={setAllowAIDataSharing}
 * />
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Activity, 
    Search, 
    Brain, 
    Shield, 
    ShieldCheck, 
    ShieldOff,
    Copy, 
    Check, 
    Send,
    ExternalLink 
} from 'lucide-react';
import goalEngineService from '../../../services/goalEngineService';

// Helper functions for data type management
const getRequiredDataTypes = (stage, substage, category) => {
    if (stage === 'definition') return [];
    if (stage === 'gap_analysis') {
        if (substage === 'current_financial_state') {
            return ['income', 'expenses', 'assets', 'liabilities'];
        }
        if (substage === 'current_kiwisaver_balance' && category === 'retirement') {
            return ['kiwisaver'];
        }
        if (substage === 'asset_growth' || substage === 'milestone_projection') {
            return ['assets', 'income'];
        }
    }
    if (stage === 'assumptions') {
        return ['income', 'expenses', 'growth_rates'];
    }
    return [];
};

const shouldShowPermissionCard = (stage, substage, category, allowAIDataSharing) => {
    if (allowAIDataSharing) return false;
    const requiredTypes = getRequiredDataTypes(stage, substage, category);
    return requiredTypes.length > 0;
};

const getDataTypeLabels = (types) => {
    const labels = {
        income: { value: 'income', icon: '💰', label: 'Income', description: 'Salary, investments, etc.' },
        expenses: { value: 'expenses', icon: '📊', label: 'Expenses', description: 'Monthly spending' },
        assets: { value: 'assets', icon: '🏠', label: 'Assets', description: 'Property, savings, investments' },
        liabilities: { value: 'liabilities', icon: '💳', label: 'Liabilities', description: 'Debts, loans, mortgages' },
        kiwisaver: { value: 'kiwisaver', icon: '🇳🇿', label: 'KiwiSaver', description: 'Current balance & contributions' },
        growth_rates: { value: 'growth_rates', icon: '📈', label: 'Growth Rates', description: 'Investment return assumptions' }
    };
    return types.map(t => labels[t] || { value: t, icon: '📌', label: t, description: '' });
};

/**
 * Extract field content from incomplete JSON stream
 * Safely extracts a field value even from incomplete/streaming JSON
 * This enables the "character-by-character" streaming effect
 * 
 * @param {string} field - Field name to extract (e.g. 'rationale', 'thought_process')
 * @param {string} jsonStr - Incomplete or complete JSON string
 * @returns {string} Extracted field value with escaped characters resolved
 */
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

/**
 * Copilot Component
 * 
 * @param {Object} props
 * @param {number} props.stage - Current stage index
 * @param {string} props.currentStageLabel - Current stage label ('definition', 'gap_analysis', 'assumptions')
 * @param {Object} props.goalContext - Goal context data
 * @param {Function} props.onUpdateContext - Callback function to update context
 * @param {Array} props.messages - Array of chat messages
 * @param {Function} props.setMessages - Function to set messages
 * @param {boolean} props.useRag - Whether to use RAG retrieval augmentation
 * @param {Function} props.setUseRag - Function to set RAG
 * @param {string} props.mode - Current mode ('auto', 'ask', 'agent')
 * @param {Function} props.setMode - Function to set mode
 * @param {boolean} props.allowAIDataSharing - Whether to allow AI to access data
 * @param {Function} props.setAllowAIDataSharing - Function to set data sharing
 * @param {string} props.pendingQuery - Pending query string
 * @param {Function} props.setPendingQuery - Function to set pending query
 * @param {boolean} props.showPermissionCard - Whether to show permission card
 * @param {Function} props.setShowPermissionCard - Function to set permission card visibility
 * @param {Array} props.requestedDataTypes - Array of requested data types
 * @param {Function} props.setRequestedDataTypes - Function to set requested data types
 * @param {Array} props.selectedAllowlist - Selected allowed data types
 * @param {Function} props.setSelectedAllowlist - Function to set allowlist
 * @param {Function} props.onExecuteSubstageWithPermission - Callback to execute substage with permission
 * @param {string} props.quickStartPrompt - Quick start prompt string
 * @param {boolean} props.isLoadingAI - Whether AI is loading
 * @param {Function} props.setIsLoadingAI - Function to set AI loading state
 */
const Copilot = ({ 
    stage, 
    currentStageLabel, 
    goalContext, 
    onUpdateContext, 
    messages, 
    setMessages,
    useRag,
    setUseRag,
    mode,
    setMode,
    allowAIDataSharing,
    setAllowAIDataSharing,
    pendingQuery,
    setPendingQuery,
    showPermissionCard,
    setShowPermissionCard,
    requestedDataTypes,
    setRequestedDataTypes,
    selectedAllowlist,
    setSelectedAllowlist,
    onExecuteSubstageWithPermission,
    quickStartPrompt,
    isLoadingAI,
    setIsLoadingAI
}) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null); 
    const [showReasoning, setShowReasoning] = useState(true);
    const [expandedRef, setExpandedRef] = useState(null);
    const [showSources, setShowSources] = useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);
    
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const nearBottom = distanceFromBottom < 120;
        if (nearBottom) {
            el.scrollTop = el.scrollHeight;
            setShowJumpToLatest(false);
        } else {
            setShowJumpToLatest(true);
        }
    }, [messages]);

    // Auto-trigger AI response when quick start prompt is set
    useEffect(() => {
        if (quickStartPrompt && !isLoading) {
            handleSend(quickStartPrompt);
        }
    }, [quickStartPrompt]); 

    const handleChatScroll = () => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const nearBottom = distanceFromBottom < 120;
        setShowJumpToLatest(!nearBottom);
    };

    const jumpToLatest = () => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setShowJumpToLatest(false);
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Handle permission response (Accept/Deny) - NOTE: Callback to parent needed for executeSubstageWithPermission
    const handlePermissionResponse = async (granted) => {
        setShowPermissionCard(false);
        
        if (!granted) {
            // User denied permission - show feedback message
            setMessages(prev => [...prev, { 
                role: 'system', 
                text: '🔒 Access denied. AI will provide generic advice without your financial data.' 
            }]);
            setPendingQuery(null);
            return;
        }
        
        if (!pendingQuery) {
            setPendingQuery(null);
            return;
        }

        // Check if this is an auto-substage request
        if (pendingQuery.startsWith('auto_substage:')) {
            const nextSubId = pendingQuery.replace('auto_substage:', '');
            setPendingQuery(null);
            
            // User authorized - execute substage with permissions
            if (onExecuteSubstageWithPermission) {
                onExecuteSubstageWithPermission(nextSubId, selectedAllowlist);
            }
            return;
        }

        // Handle normal chat message with permission
        const queryText = pendingQuery;
        const oneTimePermission = granted;
        setPendingQuery(null);
        
        setIsLoading(true);

        // Calculate AI message index using functional update to get latest state
        let aiMsgIndex = 0;
        setMessages(prev => {
            aiMsgIndex = prev.length;
            return [...prev, { 
                role: 'assistant', 
                text: '', 
                isTyping: true,
                isStreaming: true,
                mode
            }];
        });

        try {
            let accumulatedRaw = '';
            
            const askHistory = messages
                .filter(m => m.mode === 'ask' && (m.role === 'user' || m.role === 'assistant') && m.text)
                .slice(-8)
                .map(m => ({ role: m.role, text: m.text }));

            const finalData = await goalEngineService.generateDecisionStream({
                stage: currentStageLabel,
                goalContext,
                userInput: { text: queryText },
                previousDecisions: [],
                useRag,
                allowAIDataSharing: oneTimePermission,
                dataAllowlist: selectedAllowlist,
                mode,
                askHistory
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
                    } else {
                        console.warn('[Permission] Stream update: aiMsgIndex', aiMsgIndex, 'not found in', newMessages.length, 'messages');
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
                            references: aiDecision?.references,
                            rag_summary: aiDecision?.rag_summary
                        };
                    } else {
                        console.error('[Permission] ERROR: No message at index', aiMsgIndex, '! Array length:', newMessages.length);
                    }
                    return newMessages;
                });

                const effectiveDecision = aiDecision || (Object.keys(fallbackDecision).length > 0 ? fallbackDecision : null);
                
                if (mode !== 'ask' && effectiveDecision && onUpdateContext) {
                    onUpdateContext(effectiveDecision);
                }
            }
        } catch (err) {
            console.error('[Permission] Error:', err);
            setMessages(prev => [...prev, { role: 'system', text: "Sorry, I'm having trouble connecting to the brain." }]);
        } finally {
            setIsLoading(false);
        }
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

    const formatSnippet = (snippet) => {
        if (!snippet) return '';
        return snippet.replace(/\s+/g, ' ').trim();
    };

    const handleSend = async (overrideText) => {
        const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
        if (!textToSend.trim()) return;
        
        // Set parent loading state if in definition stage
        if (currentStageLabel === 'definition' && setIsLoadingAI) {
            setIsLoadingAI(true);
        }
        
        // Check if current request needs privacy data
        const requiredTypes = getRequiredDataTypes(
            currentStageLabel, 
            goalContext?.substage, 
            goalContext?.category
        );
        
        const needsPermission = shouldShowPermissionCard(
            currentStageLabel,
            goalContext?.substage,
            goalContext?.category,
            allowAIDataSharing
        );
        
        // Only show permission card when sensitive data is needed
        if (needsPermission && mode !== 'ask') {
            // Show user message first
            const userMsg = { role: 'user', text: textToSend, mode };
            setMessages(prev => [...prev, userMsg]);
            
            setPendingQuery(textToSend);
            setRequestedDataTypes(requiredTypes);
            setSelectedAllowlist(requiredTypes);
            setShowPermissionCard(true);
            setInputText(''); // Clear input
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            return; // Wait for user response
        }
        
        const userMsg = { role: 'user', text: textToSend, mode };
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
            isStreaming: true,
            mode
        }]);

        try {
            let accumulatedRaw = '';
            
            const askHistory = messages
                .filter(m => m.mode === 'ask' && (m.role === 'user' || m.role === 'assistant') && m.text)
                .slice(-8)
                .map(m => ({ role: m.role, text: m.text }));

            const finalData = await goalEngineService.generateDecisionStream({
                stage: currentStageLabel,
                goalContext,
                userInput: { text: userMsg.text },
                previousDecisions: [],
                useRag,
                allowAIDataSharing,
                mode,
                askHistory
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
                            references: aiDecision?.references,
                            rag_summary: aiDecision?.rag_summary
                        };
                    }
                    return newMessages;
                });

                const effectiveDecision = aiDecision || (Object.keys(fallbackDecision).length > 0 ? fallbackDecision : null);
                
                if (mode !== 'ask' && effectiveDecision && onUpdateContext) {
                    onUpdateContext(effectiveDecision);
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'system', text: "Sorry, I'm having trouble connecting to the brain." }]);
        } finally {
            setIsLoading(false);
            
            // Reset parent loading state after a delay to ensure form is ready
            if (currentStageLabel === 'definition' && setIsLoadingAI) {
                setTimeout(() => {
                    setIsLoadingAI(false);
                }, 500);
            }
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
            
            <div className="relative flex-1 min-h-0">
                {/* Permission Request - Smart & Context-Aware */}
                {showPermissionCard && (() => {
                    const dataTypeLabels = getDataTypeLabels(requestedDataTypes);
                    const allSelected = selectedAllowlist.length === requestedDataTypes.length;
                    
                    return (
                        <div className="absolute bottom-3 left-3 right-3 z-50 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white/95 backdrop-blur border border-indigo-100/80 rounded-xl shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-50/50 p-3">
                                
                                {/* Header */}
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                                        <Shield size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            AI needs access to your data
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            For personalized financial advice
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Data Types List (MVP: Simple display) */}
                                <div className="bg-slate-50 rounded-lg p-2.5 mb-3 space-y-1.5">
                                    {dataTypeLabels.map((dt, idx) => {
                                        const isSelected = selectedAllowlist.includes(dt.value);
                                        return (
                                            <label 
                                                key={dt.value}
                                                className="flex items-center gap-2 p-1.5 hover:bg-white rounded-md cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        setSelectedAllowlist(prev => 
                                                            isSelected 
                                                                ? prev.filter(v => v !== dt.value)
                                                                : [...prev, dt.value]
                                                        );
                                                    }}
                                                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                                                />
                                                <span className="text-xs mr-1">{dt.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-700 truncate">
                                                        {dt.label}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        {dt.description}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <button
                                        onClick={() => {
                                            if (allSelected) {
                                                setSelectedAllowlist([]);
                                            } else {
                                                setSelectedAllowlist(requestedDataTypes);
                                            }
                                        }}
                                        className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        {allSelected ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <p className="text-[10px] text-slate-400">
                                        {selectedAllowlist.length} of {requestedDataTypes.length} selected
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePermissionResponse(false)}
                                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    >
                                        Deny All
                                    </button>
                                    <button
                                        onClick={() => handlePermissionResponse(true)}
                                        disabled={selectedAllowlist.length === 0}
                                        className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Allow ({selectedAllowlist.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                
                <div 
                    ref={scrollRef}
                    onScroll={handleChatScroll}
                    className="h-full bg-slate-50/50 rounded-lg lg:rounded-2xl p-2 lg:p-3 mb-2 lg:mb-4 overflow-y-auto border border-slate-100/50 flex flex-col gap-2 scrollbar-soft"
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
                                </div>

                                {/* References */}
                                {msg.role === 'assistant' && ((msg.references && msg.references.length > 0) || msg.rag_summary) && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-2">
                                        {/* Preview (collapsed) */}
                                        {!showSources && (
                                            <>
                                                {msg.rag_summary && (
                                                    <div className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">KB Summary</div>
                                                        <div className="text-left whitespace-normal line-clamp-2">{formatSnippet(msg.rag_summary)}</div>
                                                    </div>
                                                )}
                                                {(msg.references || []).slice(0, 2).map((ref, idx) => {
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
                                                                    <div className="text-[10px] text-slate-500 line-clamp-1 text-left">
                                                                        {formatSnippet(ref.snippet)}
                                                                    </div>
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
                                                                <div className="mt-1 p-2 bg-white border border-slate-200 rounded text-[11px] text-slate-600 shadow-sm whitespace-normal text-left">
                                                                    {formatSnippet(ref.snippet)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setShowSources(prev => !prev)}
                                            className="self-start px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                                            title={showSources ? 'Hide sources' : 'Show sources'}
                                        >
                                            {showSources ? 'Collapse' : 'Expand more'}
                                            {msg.references?.length ? ` (${msg.references.length})` : ''}
                                        </button>

                                        {showSources && (
                                            <>
                                                {msg.rag_summary && (
                                                    <div className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">KB Summary</div>
                                                        <div className="text-left whitespace-normal">{formatSnippet(msg.rag_summary)}</div>
                                                    </div>
                                                )}
                                                {(msg.references || []).map((ref, idx) => {
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
                                                                    <div className="text-[10px] text-slate-500 line-clamp-2 text-left">
                                                                        {formatSnippet(ref.snippet)}
                                                                    </div>
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
                                                                <div className="mt-1 p-2 bg-white border border-slate-200 rounded text-[11px] text-slate-600 shadow-sm whitespace-normal text-left">
                                                                    {formatSnippet(ref.snippet)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
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
                {showJumpToLatest && (
                    <button
                        type="button"
                        onClick={jumpToLatest}
                        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-slate-600 border border-white/80 shadow-sm backdrop-blur hover:bg-white/80 hover:text-slate-800 transition"
                        title="Jump to latest"
                    >
                        Jump to latest
                    </button>
                )}
            </div>

            {/* Quick Options */}
            {currentStageLabel === 'definition' && !hasUserMessages && !showPermissionCard && (
                <div className="flex flex-wrap justify-end gap-2 mb-3">
                    {[
                        "I want a retirement plan that lets me travel overseas once a year.",
                        "Who is eligible for NZ Super?",
                        "I want to buy a big house on Waiheke Island within 5 years"
                    ].map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSend(opt)}
                            disabled={showPermissionCard}
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[11px] text-indigo-700 font-bold hover:bg-indigo-100 transition-all active:scale-95 shadow-sm text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
            {/* Input Area */}
            <div className="relative shrink-0">
                {/* Mode Switch + Privacy Control (Compact) */}
                <div className="flex items-center justify-between gap-3 mb-2">
                    {/* Left: Mode Switch */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] lg:text-[11px] text-slate-400">
                            {mode === 'auto' && 'Auto-fill'}
                            {mode === 'ask' && 'Q&A'}
                            {mode === 'agent' && 'Smart'}
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full">
                            {['auto', 'ask', 'agent'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setMode(opt)}
                                    className={`px-2 py-0.5 rounded-full text-[9px] lg:text-[10px] font-bold transition-all ${
                                        mode === opt ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                                    }`}
                                    title={`Mode: ${opt}`}
                                    type="button"
                                >
                                    {opt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Right: Privacy Control (Compact) */}
                    <div 
                        className="flex items-center gap-1.5 group"
                        title={allowAIDataSharing 
                            ? 'AI can access your financial data for personalized advice. Click to disable.' 
                            : 'Privacy mode: AI will provide generic advice only. Click to enable data sharing.'}
                    >
                        <span className="text-[10px] text-slate-500 font-medium cursor-help">
                            Privacy
                        </span>
                        {allowAIDataSharing ? (
                            <ShieldCheck size={14} className="text-green-600" />
                        ) : (
                            <ShieldOff size={14} className="text-amber-600" />
                        )}
                        <button
                            type="button"
                            onClick={() => setAllowAIDataSharing(prev => !prev)}
                            className={`
                                w-8 h-4 rounded-full transition-all relative flex items-center px-0.5
                                ${allowAIDataSharing ? 'bg-green-500' : 'bg-amber-500'}
                            `}
                            aria-label={allowAIDataSharing ? 'Disable AI data sharing' : 'Enable AI data sharing'}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all ${allowAIDataSharing ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
                
                <div className="relative flex items-center">
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
                        placeholder={showPermissionCard ? "Waiting for permission..." : "Ask Copilot..."} 
                        rows={1}
                        disabled={showPermissionCard}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none overflow-hidden min-h-[46px] max-h-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !inputText.trim() || showPermissionCard}
                        className="absolute right-2 p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
                For reference only. Not investment advice. AI responses may be inaccurate—please verify.
            </div>
        </div>
    );
};

export default Copilot;
