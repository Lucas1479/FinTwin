import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Bot, User, Sparkles, GripHorizontal, ExternalLink, Maximize2, Minimize2, ShieldCheck, ShieldOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX styles
import { useHelp } from '../../context/HelpContext';
import { getUserProfile } from '../../services/userService';

const HelpChatBox = () => {
  const { isHelpOpen, closeHelp, externalMessage, setExternalMessage } = useHelp();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hi there! I'm your FinTwin guide. I can help you understand financial terms or navigate the app. What's on your mind?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedRef, setExpandedRef] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);

  // 🔒 Privacy Control State
  const [userPrivacySettings, setUserPrivacySettings] = useState({ shareWithAI: true });
  const [allowAIDataSharing, setAllowAIDataSharing] = useState(true);

  // Resize State
  const [isExpanded, setIsExpanded] = useState(false);

  // Draggable State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 🔒 Fetch user privacy settings on mount
  useEffect(() => {
    const fetchPrivacySettings = async () => {
      try {
        const profile = await getUserProfile();
        const shareWithAI = profile?.privacy?.shareWithAI !== false;
        setUserPrivacySettings({ shareWithAI });
        setAllowAIDataSharing(shareWithAI);
        console.log('[Privacy][HelpChat] Loaded privacy settings:', { shareWithAI });
      } catch (error) {
        console.error('[Privacy][HelpChat] Failed to load privacy settings:', error);
        setUserPrivacySettings({ shareWithAI: true });
        setAllowAIDataSharing(true);
      }
    };
    fetchPrivacySettings();
  }, []);

  // Handle External Messages (e.g. from Tooltips)
  useEffect(() => {
    if (externalMessage && isHelpOpen) {
      handleSendMessage(externalMessage);
      setExternalMessage(null); // Clear after sending
    }
  }, [externalMessage, isHelpOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isHelpOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isHelpOpen]);

  // Drag Handlers
  const handleMouseDown = (e) => {
    // Only drag from header
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = chatBoxRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        if (chatBoxRef.current) {
             chatBoxRef.current.style.right = 'auto';
             chatBoxRef.current.style.bottom = 'auto';
             chatBoxRef.current.style.left = `${newX}px`;
             chatBoxRef.current.style.top = `${newY}px`;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isTyping) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${apiBaseUrl}/help/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ 
          message: text,
          history: messages.slice(-10) 
        }),
      });

      if (!response.ok || !response.body) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setMessages(prev => [...prev, { role: 'assistant', content: '', references: [] }]);

      let assistantResponse = '';
      let finalReferences = [];
      let thoughtProcess = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              assistantResponse += parsed.token;
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = assistantResponse;
                return newMsgs;
              });
            }
            if (parsed.references) {
              finalReferences = parsed.references;
              thoughtProcess = parsed.thought_process || thoughtProcess;
            }
          } catch (err) {
            console.error('Error parsing SSE chunk', err);
          }
        }
      }

      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1]) {
          newMsgs[newMsgs.length - 1].references = finalReferences;
          newMsgs[newMsgs.length - 1].thought_process = thoughtProcess;
        }
        return newMsgs;
      });

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(input);
    setInput('');
  };

  if (!isHelpOpen) return null;

  return createPortal(
    <div 
      ref={chatBoxRef}
      onMouseDown={handleMouseDown}
      className={`fixed bottom-6 right-6 z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans transition-all duration-300 ${
        isExpanded ? 'w-[600px] h-[800px]' : 'w-[400px] h-[600px]'
      }`}
    >
      
      {/* Header */}
      <div className="drag-handle p-4 bg-indigo-600 text-white rounded-t-2xl flex justify-between items-center shadow-md cursor-grab active:cursor-grabbing select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">FinTwin Support</h3>
            <p className="text-[10px] text-indigo-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
            <GripHorizontal size={18} className="text-white/40 mr-1" />
            
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              onMouseDown={(e) => e.stopPropagation()} 
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <button 
              onClick={closeHelp}
              onMouseDown={(e) => e.stopPropagation()} 
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
              ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-emerald-600 border border-slate-100'}
            `}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`
              max-w-[80%] rounded-2xl p-3.5 text-sm shadow-sm
              ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none prose prose-sm max-w-none'}
            `}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.content}
                </ReactMarkdown>
              )}

              {/* References */}
              {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-2">
                  {msg.references.map((ref, idx) => {
                    const marker = ref.marker || `[${idx + 1}]`;
                    const title = ref.title || 'Source';
                    const hasUrl = !!ref.url;
                    const refKey = `${idx}-${title}-${marker}`;
                    const isOpen = expandedRef === refKey;

                    const contentHeader = (
                      <>
                        <span className="text-slate-500 font-semibold">{marker}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold">
                            {hasUrl ? <ExternalLink size={10} /> : null} {title}
                          </div>
                          {!hasUrl && ref.snippet && (
                            <div className="text-[10px] text-slate-500 line-clamp-2">{ref.snippet}</div>
                          )}
                          <div className="text-[10px] text-slate-400">{ref.source || 'KnowledgeBase'}</div>
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
                          {contentHeader}
                        </a>
                      );
                    }

                    // No URL: collapsible to show snippet
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-100"
                        onClick={() => setExpandedRef(isOpen ? null : refKey)}
                      >
                        <div className="flex items-start gap-2">{contentHeader}</div>
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
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-white text-emerald-600 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
               <Bot size={16} />
             </div>
             <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
               <div className="flex gap-1">
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 rounded-b-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* Privacy Control (Compact) */}
        <div className="flex items-center justify-end gap-1.5 mb-2 group"
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
              w-7 h-3.5 rounded-full transition-all relative flex items-center px-0.5
              ${allowAIDataSharing ? 'bg-green-500' : 'bg-amber-500'}
            `}
            aria-label={allowAIDataSharing ? 'Disable AI data sharing' : 'Enable AI data sharing'}
          >
            <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all ${allowAIDataSharing ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about investing, terms, or the app..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          AI can make mistakes. Please verify important financial information.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default HelpChatBox;
