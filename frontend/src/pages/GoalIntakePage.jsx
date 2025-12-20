import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import StageStrategy from '../components/goals/StageStrategy';
import goalEngineService from '../services/goalEngineService';
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


// Stage 3: Product Selection (Vehicle)
const StageProduct = ({ goalContext, onSelect }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);

    const products = [
        { id: 1, name: 'Simplicity Growth Fund', type: 'KiwiSaver', fees: '0.31%', return: '8.5%', match: 95 },
        { id: 2, name: 'Milford Active Growth', type: 'Managed Fund', fees: '1.05%', return: '9.2%', match: 88 },
        { id: 3, name: 'ANZ Serious Saver', type: 'Savings', fees: '0%', return: '4.5%', match: 60 },
    ];

    return (
        <div className="space-y-6">
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold">Growth Strategy</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Low Fees</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">ESG Friendly</span>
            </div>

            <div className="grid gap-4">
                {products.map(p => (
                    <div 
                        key={p.id}
                        onClick={() => { setSelectedProduct(p.id); onSelect(p); }}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            selectedProduct === p.id 
                            ? 'border-brand-500 bg-brand-50/50 shadow-md' 
                            : 'border-slate-100 bg-white hover:border-brand-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.type}</span>
                                <h4 className="font-bold text-slate-900">{p.name}</h4>
                            </div>
                            {p.match > 90 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                    <Zap size={12} /> Best Match
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div>
                                <span className="block text-xs text-slate-400 font-bold">Fees</span>
                                <span className="font-medium text-slate-700">{p.fees}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-400 font-bold">Hist. Return</span>
                                <span className="font-medium text-green-600">{p.return}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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
const Copilot = ({ stage, currentStageLabel, goalContext, onUpdateContext, externalMessage }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null); 
    const [showReasoning, setShowReasoning] = useState(true);
    
    const scrollRef = useRef(null);
    const textareaRef = useRef(null); 

    // Initial greeting based on stage
    useEffect(() => {
        const greetings = {
            0: "Let's define your target. I can help you calculate how much you need or check if your plan is feasible.",
            1: "Now for the strategy. I'll analyze your goal timeline and suggest an asset allocation mix.",
            2: "Let's pick a product. I can filter funds by fees or past performance.",
            3: "Final check. Ready to launch?"
        };
        // Reset messages on stage change
        setMessages([{ role: 'system', text: greetings[stage] || "How can I help?" }]);
    }, [stage]);

    // Handle external messages (auto-trigger)
    useEffect(() => {
        if (externalMessage) {
            setMessages(prev => [...prev, { role: 'assistant', text: externalMessage, isTyping: true }]);
        }
    }, [externalMessage]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]); // Scroll on every update (including typewriter ticks)

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

        try {
            const data = await goalEngineService.generateDecision({
                stage: currentStageLabel,
                goalContext,
                userInput: { text: userMsg.text },
                previousDecisions: [] 
            });
            
            const aiText = data.text || "I've updated the plan based on your request.";
            const aiDecision = data.json?.ai_decision;

            // Mark message as 'isTyping' to trigger effect
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: aiText, 
                isTyping: true,
                thought_process: aiDecision?.thought_process,
                references: aiDecision?.references
            }]);

            if (aiDecision && onUpdateContext) {
                onUpdateContext(aiDecision);
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

                        <div className={`
                            relative max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed pr-8 break-words
                            ${msg.role === 'user' 
                                ? 'bg-slate-900 text-white rounded-br-none' 
                                : 'bg-white border border-slate-200 text-slate-600 rounded-tl-none shadow-sm'}
                        `}>
                            {/* Main Message Content with Markdown */}
                            <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-600'}`}>
                                {msg.role === 'assistant' && msg.isTyping && i === messages.length - 1 ? (
                                    <TypewriterMessage 
                                        text={msg.text} 
                                        onComplete={() => {
                                            const newMessages = [...messages];
                                            newMessages[i].isTyping = false;
                                            setMessages(newMessages);
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
  
  // Resizable Sidebar State (Pixels instead of percentage for better precision)
  const [leftWidth, setLeftWidth] = useState(450); 
  const [isResizing, setIsResizing] = useState(false);
  
  const containerRef = useRef(null);

  // NEW: Track loading state for stage transitions
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [copilotSystemMsg, setCopilotSystemMsg] = useState(null);

  const STAGES = [
      { id: 'definition', label: 'Definition', icon: Target },
      { id: 'strategy', label: 'Strategy', icon: Shield },
      { id: 'product', label: 'Product', icon: ShoppingBag },
      { id: 'simulation', label: 'Simulation', icon: Activity },
  ];
  const runStageAnalysis = async (stageId, context) => {
      setIsLoadingAI(true);
      try {
          const data = await goalEngineService.generateDecision({
              stage: stageId,
              goalContext: context
          });
          
          console.log("DEBUG: Auto-Analysis Result:", data);
          
          if (data.json?.ai_decision) {
              handleContextUpdate(data.json.ai_decision);
          }
          if (data.text) {
              setCopilotSystemMsg(data.text);
          }
      } catch (err) {
          console.error("Auto-Analysis Failed:", err);
      } finally {
          setIsLoadingAI(false);
      }
  };

  const handleNext = async () => {
      if (currentStage < STAGES.length - 1) {
          const nextStageIndex = currentStage + 1;
          const nextStageId = STAGES[nextStageIndex].id;
          
          setCurrentStage(nextStageIndex);
          
          // Auto-trigger analysis for Strategy stage
          if (nextStageId === 'strategy') {
              // We pass current goalContext, but wait a tick for any pending state updates? 
              // Actually React state updates are batched, so safe to use current 'goalContext' 
              // IF it was updated by the definition form submit.
              // Better: pass the merged context if we just updated it.
              runStageAnalysis(nextStageId, goalContext);
          }
      }
  };

  const handleBack = () => {
      if (currentStage > 0) {
          setCurrentStage(prev => prev - 1);
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
        runStageAnalysis('strategy', updatedContext);
    }
  };

  // Helper to allow Copilot to update context (e.g. AI fills form)
  // Also normalizes flat AI response fields back into goal_details structure
  const handleContextUpdate = (updates) => {
      console.log("DEBUG: handleContextUpdate triggered with:", updates); // DEBUG LOG 3
      if (!updates) return;

      const normalized = { ...updates };
      
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
          const nextState = { ...prev, ...normalized };
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

          console.log("DEBUG: New GoalContext State:", nextState); // DEBUG LOG 4
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
                    externalMessage={copilotSystemMsg}
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
