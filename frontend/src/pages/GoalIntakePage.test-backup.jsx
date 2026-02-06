import { useState, useEffect, useRef } from 'react';
import { extractField } from '../utils/streamHelpers';
import { getRequiredDataTypes, shouldShowPermissionCard } from '../constants/privacyDataTypes';
import goalEngineService from '../services/goalEngineService';
import { 
    Send, Copy, Check, ChevronDown, Sparkles, 
    ShieldAlert, MessageSquare, Info 
} from 'lucide-react';

// --- STUB/MOCK FOR TypewriterMessage ---
// Ensure this is imported correctly from your components folder
// If it's missing, this stub prevents the app from crashing.
const TypewriterMessage = ({ text, role }) => <span>{text}</span>;

const Copilot = ({ 
    stage, 
    currentStageLabel, 
    goalContext, 
    onUpdateContext, 
    messages = [], 
    setMessages = () => {},         // Added default empty function
    useRag = false,
    mode = 'ask',
    allowAIDataSharing = false,
    setAllowAIDataSharing = () => {}, 
    pendingQuery = null,
    setPendingQuery = () => {},     // Added default empty function (FIXES CRASH)
    showPermissionCard = false,
    setShowPermissionCard = () => {},
    requestedDataTypes = [],
    setRequestedDataTypes = () => {},
    selectedAllowlist = [],
    setSelectedAllowlist = () => {},
    onExecuteSubstageWithPermission = () => {},
    quickStartPrompt = null,
    isLoadingAI = false,
    setIsLoadingAI = () => {}
}) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null); 
    const scrollRef = useRef(null);
    const textareaRef = useRef(null); 

    // 1. Safe scroll to bottom
    useEffect(() => {
        if (scrollRef.current && messages?.length > 0) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // 2. Handle Quick Start Prompts
    useEffect(() => {
        if (quickStartPrompt && !isLoading) {
            handleSend(quickStartPrompt);
        }
    }, [quickStartPrompt]);

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handlePermissionResponse = async (granted) => {
        setShowPermissionCard?.(false);
        if (!granted) {
            setMessages?.(prev => [...prev, { 
                role: 'system', 
                text: '🔒 Access denied. AI will provide generic advice.' 
            }]);
            setPendingQuery?.(null);
            return;
        }
        
        if (pendingQuery?.startsWith?.('auto_substage:')) {
            const nextSubId = pendingQuery.replace('auto_substage:', '');
            setPendingQuery?.(null);
            onExecuteSubstageWithPermission?.(nextSubId, selectedAllowlist);
        } else {
            const queryToExecute = pendingQuery;
            setPendingQuery?.(null);
            executeAIGeneration(queryToExecute, true);
        }
    };

    const handleSend = async (overrideText) => {
        const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
        if (!textToSend?.trim() || isLoading) return;

        // Use optional chaining for safe checks
        const needsPermission = shouldShowPermissionCard?.(
            currentStageLabel,
            goalContext?.substage,
            goalContext?.category,
            allowAIDataSharing
        );

        if (needsPermission && mode !== 'ask') {
            setMessages?.(prev => [...prev, { role: 'user', text: textToSend, mode, id: Date.now() }]);
            setPendingQuery?.(textToSend); // Safe call
            
            const required = getRequiredDataTypes?.(currentStageLabel, goalContext?.substage, goalContext?.category) || [];
            setRequestedDataTypes?.(required);
            setSelectedAllowlist?.(required);
            setShowPermissionCard?.(true);
            setInputText('');
            return;
        }

        executeAIGeneration(textToSend, allowAIDataSharing);
    };

    const executeAIGeneration = async (text, hasPermission) => {
        setIsLoading(true);
        setIsLoadingAI?.(true);
        
        const userMsg = { role: 'user', text, mode, id: Date.now() };
        const assistantMsgId = Date.now() + 1;
        
        setMessages?.(prev => [...prev, userMsg, { 
            id: assistantMsgId,
            role: 'assistant', 
            text: '', 
            isStreaming: true,
            mode 
        }]);
        setInputText('');

        try {
            let accumulatedRaw = '';
            // Safe history filtering
            const askHistory = (messages || [])
                .filter(m => m?.mode === 'ask' && m?.text)
                .slice(-6)
                .map(m => ({ role: m.role, text: m.text }));

            const finalData = await goalEngineService.generateDecisionStream({
                stage: currentStageLabel,
                goalContext,
                userInput: { text },
                useRag,
                allowAIDataSharing: hasPermission,
                dataAllowlist: selectedAllowlist,
                mode,
                askHistory
            }, (chunk) => {
                accumulatedRaw += chunk;
                const streamingRationale = extractField('rationale', accumulatedRaw);
                const streamingThought = extractField('thought_process', accumulatedRaw);

                setMessages?.(prev => prev.map(m => 
                    m.id === assistantMsgId 
                        ? { ...m, text: streamingRationale || streamingThought || "Thinking...", thought_process: streamingThought }
                        : m
                ));
            });

            if (finalData?.ai_decision) {
                const decision = finalData.ai_decision;
                setMessages?.(prev => prev.map(m => 
                    m.id === assistantMsgId 
                        ? { 
                            ...m, 
                            text: decision.rationale || "Analysis complete.", 
                            isStreaming: false, 
                            references: decision.references,
                            thought_process: decision.thought_process 
                          }
                        : m
                ));
                if (mode !== 'ask') onUpdateContext?.(decision);
            }
        } catch (err) {
            console.error("AI Generation Error:", err);
            setMessages?.(prev => [...prev, { role: 'system', text: "Connection error. Please try again.", id: Date.now() }]);
        } finally {
            setIsLoading(false);
            setIsLoadingAI?.(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200">
            {/* Chat Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {messages?.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}>
                            <TypewriterMessage text={msg.text} role={msg.role} />
                            {msg.role === 'assistant' && !msg.isStreaming && (
                                <button 
                                    onClick={() => handleCopy(msg.text, msg.id)} 
                                    className="mt-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    aria-label="Copy message"
                                >
                                    {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Permission UI Overlay */}
            {showPermissionCard && (
                <div className="p-4 bg-amber-50 border-t border-amber-100 animate-in slide-in-from-bottom-2">
                    <div className="flex gap-2 mb-3">
                        <ShieldAlert className="text-amber-600" size={18} />
                        <p className="text-xs text-amber-800 font-medium">AI needs access to financial data to provide accurate advice.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handlePermissionResponse(true)} className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">Grant Access</button>
                        <button onClick={() => handlePermissionResponse(false)} className="flex-1 bg-white border border-amber-200 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">Generic Only</button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative flex items-end gap-2 bg-slate-100 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Ask your AI Copilot..."
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 px-2 text-sm"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={isLoading || !inputText.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-all flex-shrink-0"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Copilot;