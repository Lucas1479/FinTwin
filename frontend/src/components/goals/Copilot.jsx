// Copilot component extracted from GoalIntakePage.jsx
// This allows for independent testing without affecting the main page

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractField } from '../../utils/streamHelpers';
import { getRequiredDataTypes, shouldShowPermissionCard } from '../../constants/privacyDataTypes';
import goalEngineService from '../../services/goalEngineService';
import { 
    Send, Copy, Check, ChevronDown, Sparkles, 
    ShieldAlert, MessageSquare, Info 
} from 'lucide-react';

/**
 * Copilot - AI Assistant Component
 * 
 * Extracted as an independent component for easier testing and reuse
 * 
 * @param {Object} props
 * @param {string} props.stage - Current stage
 * @param {string} props.currentStageLabel - Current stage label
 * @param {Object} props.goalContext - Goal context
 * @param {Function} props.onUpdateContext - Callback to update context
 * @param {Array} props.messages - Message list
 * @param {Function} props.setMessages - Set message list
 * @param {boolean} props.useRag - Whether to use RAG
 * @param {string} props.mode - Mode ('ask' | 'auto')
 * @param {boolean} props.allowAIDataSharing - Whether to allow AI data sharing
 * @param {Function} props.setAllowAIDataSharing - Set AI data sharing
 * @param {string} props.pendingQuery - Pending query
 * @param {Function} props.setPendingQuery - Set pending query
 * @param {boolean} props.showPermissionCard - Whether to show permission card
 * @param {Function} props.setShowPermissionCard - Set show permission card
 * @param {Array} props.requestedDataTypes - Requested data types
 * @param {Function} props.setRequestedDataTypes - Set requested data types
 * @param {Array} props.selectedAllowlist - Selected allowlist
 * @param {Function} props.setSelectedAllowlist - Set selected allowlist
 * @param {Function} props.onExecuteSubstageWithPermission - Execute substage callback
 * @param {string} props.quickStartPrompt - Quick start prompt
 * @param {boolean} props.isLoadingAI - Whether AI is loading
 * @param {Function} props.setIsLoadingAI - Set AI loading state
 */
export const Copilot = ({ 
    stage, 
    currentStageLabel, 
    goalContext, 
    onUpdateContext, 
    messages = [], 
    setMessages = () => {},
    useRag = false,
    mode = 'ask',
    allowAIDataSharing = false,
    setAllowAIDataSharing = () => {}, 
    pendingQuery = null,
    setPendingQuery = () => {},
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

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current && messages?.length > 0) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle quick start prompt
    useEffect(() => {
        if (quickStartPrompt && textareaRef.current) {
            setInputText(quickStartPrompt);
            textareaRef.current.focus();
        }
    }, [quickStartPrompt]);

    // Handle send message
    const handleSend = async () => {
        const query = inputText.trim();
        if (!query || isLoading) return;

        // Check if AI data sharing is required
        const requiredTypes = getRequiredDataTypes(stage, mode);
        const needsPermission = shouldShowPermissionCard(allowAIDataSharing, requiredTypes);

        if (needsPermission) {
            setPendingQuery(query);
            setRequestedDataTypes(requiredTypes);
            setSelectedAllowlist(requiredTypes);
            setShowPermissionCard(true);
            return;
        }

        // Add user message
        const userMessage = { role: 'user', text: query, id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Call AI service
            const response = await goalEngineService.generateDecisionStream({
                stage,
                substage: goalContext.substage,
                userQuery: query,
                goalContext,
                useRag,
                mode
            });

            // Add AI response
            const aiMessage = { 
                role: 'assistant', 
                text: response.text || response, 
                id: Date.now() + 1 
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI request failed:', error);
            const errorMessage = { 
                role: 'assistant', 
                text: '⚠️ Sorry, I encountered an error. Please try again.', 
                id: Date.now() + 1 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle copy message
    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-brand-600" size={20} />
                    <h3 className="font-semibold text-slate-900">AI Copilot</h3>
                    <span className="text-xs text-slate-500">({currentStageLabel})</span>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-8">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Ask me anything about your financial goals</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user' 
                                    ? 'bg-brand-600 text-white' 
                                    : 'bg-slate-100 text-slate-900'
                            }`}
                        >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text}
                            </ReactMarkdown>
                            
                            {msg.role === 'assistant' && (
                                <button
                                    onClick={() => handleCopy(msg.text, msg.id)}
                                    className="mt-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                >
                                    {copiedId === msg.id ? (
                                        <><Check size={12} /> Copied</>
                                    ) : (
                                        <><Copy size={12} /> Copy</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-lg p-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Permission Card */}
            {showPermissionCard && (
                <div className="p-4 bg-amber-50 border-t border-amber-200">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="text-amber-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                            <h4 className="font-semibold text-amber-900 mb-1">
                                AI needs access to financial data
                            </h4>
                            <p className="text-sm text-amber-700 mb-3">
                                Required: {requestedDataTypes.join(', ')}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setAllowAIDataSharing(true);
                                        setShowPermissionCard(false);
                                        onExecuteSubstageWithPermission();
                                    }}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm"
                                >
                                    Grant Access
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPermissionCard(false);
                                        setPendingQuery(null);
                                    }}
                                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask your AI Copilot..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                        rows={2}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    <Info size={12} className="inline mr-1" />
                    For reference only. Not investment advice. AI responses may be inaccurate—please verify.
                </p>
            </div>
        </div>
    );
};

export default Copilot;
