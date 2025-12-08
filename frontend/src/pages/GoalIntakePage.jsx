import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GoalDefinitionForm from '../components/goals/GoalDefinitionForm';
import { createGoal } from '../services/goalService';
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
    RefreshCw
} from 'lucide-react';

// --- MOCK COMPONENTS FOR STAGES ---

// Stage 2: Strategic Guardrails (Risk & Allocation)
const StageStrategy = ({ goalContext, onChange }) => {
    const [selectedStrategy, setSelectedStrategy] = useState('balanced');
    const [granularSettings, setGranularSettings] = useState({
        esg: false,
        inflationAdjust: true,
        taxOptimized: true,
        reinvestDividends: true,
        liquidity: 'flexible'
    });

    const strategies = [
        {
            id: 'conservative',
            title: 'Stability First',
            riskLabel: 'Conservative',
            returnRate: '3.5%',
            volatility: 'Low',
            description: 'Prioritizes capital preservation. Ideal for short-term goals (< 3 years).',
            color: 'blue'
        },
        {
            id: 'balanced',
            title: 'Balanced Growth',
            riskLabel: 'Balanced',
            returnRate: '5.8%',
            volatility: 'Medium',
            description: 'A healthy mix of growth assets and defensive bonds. Good for 3-7 years.',
            color: 'purple',
            recommended: true
        },
        {
            id: 'growth',
            title: 'High Flyer',
            riskLabel: 'Aggressive',
            returnRate: '8.2%',
            volatility: 'High',
            description: 'Maximizes long-term returns with 80%+ stocks. Best for 10+ years.',
            color: 'orange'
        }
    ];

    const handleStrategySelect = (id) => {
        setSelectedStrategy(id);
        onChange({ ...goalContext, strategyType: id });
    };

    const toggleSetting = (key) => {
        setGranularSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recommended Strategy Profiles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {strategies.map((s) => (
                        <div 
                            key={s.id}
                            onClick={() => handleStrategySelect(s.id)}
                            className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                selectedStrategy === s.id 
                                ? `border-${s.color}-500 bg-${s.color}-50/50 shadow-md scale-[1.02]` 
                                : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                        >
                            {s.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                                    <Zap size={10} /> AI Recommended
                                </div>
                            )}
                            
                            <div>
                                <div className={`text-xs font-bold uppercase tracking-wider text-${s.color}-600 mb-1`}>{s.riskLabel}</div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed mb-4">{s.description}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Exp. Return</div>
                                    <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                        <ArrowUpRight size={14} className="text-green-500" /> {s.returnRate}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Volatility</div>
                                    <div className="text-sm font-bold text-slate-700">{s.volatility}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Advanced Customization</h3>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-5">
                    
                    {/* Inflation Adjustment */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${granularSettings.inflationAdjust ? 'bg-brand-100 text-brand-600' : 'bg-white text-slate-400'}`}>
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Inflation Protection</div>
                                <div className="text-xs text-slate-500">Auto-increase target by CPI (approx 2-3% p.a.) to retain purchasing power.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={granularSettings.inflationAdjust} onChange={() => toggleSetting('inflationAdjust')} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>

                    <div className="border-t border-slate-200/50"></div>

                    {/* Tax Optimization */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${granularSettings.taxOptimized ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400'}`}>
                                <Percent size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Tax Optimization (PIE)</div>
                                <div className="text-xs text-slate-500">Prioritize Portfolio Investment Entities (PIE) to cap tax at 28%.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={granularSettings.taxOptimized} onChange={() => toggleSetting('taxOptimized')} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>

                    <div className="border-t border-slate-200/50"></div>

                    {/* Dividend Reinvestment */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${granularSettings.reinvestDividends ? 'bg-purple-100 text-purple-600' : 'bg-white text-slate-400'}`}>
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Reinvest Dividends</div>
                                <div className="text-xs text-slate-500">Automatically reinvest payouts to maximize compound interest.</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={granularSettings.reinvestDividends} onChange={() => toggleSetting('reinvestDividends')} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>

                    <div className="border-t border-slate-200/50"></div>

                    {/* Liquidity / Flexibility */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${granularSettings.liquidity === 'locked' ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'}`}>
                                {granularSettings.liquidity === 'locked' ? <Lock size={20} /> : <Unlock size={20} />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">Liquidity Preference</div>
                                <div className="text-xs text-slate-500">Locked funds (e.g., Term Deposits) often offer higher rates.</div>
                            </div>
                        </div>
                        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button 
                                onClick={() => setGranularSettings(p => ({...p, liquidity: 'flexible'}))}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${granularSettings.liquidity === 'flexible' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Flexible
                            </button>
                            <button 
                                onClick={() => setGranularSettings(p => ({...p, liquidity: 'locked'}))}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${granularSettings.liquidity === 'locked' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Locked
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

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

// Copilot Component
const Copilot = ({ stage, onAction }) => {
    const content = {
        0: {
            title: "Let's define your target",
            text: "Based on your chat, I've drafted a goal. Please verify the amount and date. The gap bridge shows you're currently $50k short.",
            action: "Analyze Gap",
        },
        1: {
            title: "Strategy Analysis",
            text: (
                <span>
                    Based on your 5-year timeline, a <strong>Balanced Strategy</strong> is recommended. 
                    <br/><br/>
                    I've also enabled <strong>Inflation Protection</strong> to ensure your purchasing power isn't eroded by rising costs. 
                    <br/><br/>
                    If you are a high earner, consider enabling <strong>Tax Optimization (PIE)</strong>.
                </span>
            ),
            citation: "Source: FMA Investor Guide - Time Horizons",
            action: "Explain PIE Tax",
        },
        2: {
            title: "Select a Vehicle",
            text: "Since this is for a first home, using a KiwiSaver fund is the most tax-efficient route. Simplicity offers the lowest fees for this category.",
            action: "Compare Fees",
        },
        3: {
            title: "Ready to Launch?",
            text: "Good news! Committing to this goal keeps your overall plan successful (85% probability). It slightly impacts your 'Car' goal, but that's manageable.",
            action: null, 
        }
    }[stage];

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Activity size={16} />
                </div>
                <span className="font-bold text-slate-900 text-sm">FinTwin Copilot</span>
            </div>
            
            <div className="flex-1 bg-slate-50 rounded-2xl p-4 mb-4 overflow-y-auto border border-slate-100 flex flex-col">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-sm text-slate-600 mb-3">
                    <h4 className="font-bold text-slate-900 mb-2">{content.title}</h4>
                    <p className="leading-relaxed mb-3">{content.text}</p>
                    
                    {content.citation && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md w-fit">
                            <Shield size={10} /> {content.citation}
                        </div>
                    )}
                </div>
                
                {content.action && (
                     <button className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline ml-1 self-start">
                        {content.action}
                     </button>
                )}
            </div>

            {/* Chat Input Mock */}
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Ask Copilot..." 
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    disabled
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
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

  const STAGES = [
      { id: 'definition', label: 'Definition', icon: Target },
      { id: 'strategy', label: 'Strategy', icon: Shield },
      { id: 'product', label: 'Product', icon: ShoppingBag },
      { id: 'simulation', label: 'Simulation', icon: Activity },
  ];

  const handleNext = () => {
      if (currentStage < STAGES.length - 1) {
          setCurrentStage(prev => prev + 1);
      }
  };

  const handleBack = () => {
      if (currentStage > 0) {
          setCurrentStage(prev => prev - 1);
      }
  };

  const handleCreate = async (payload) => {
    console.log('Stage 1 Submitted:', payload);
    setGoalContext(prev => ({ ...prev, ...payload }));
    handleNext();
  };
  
  const handleFinalCommit = async () => {
      setSubmitting(true);
      try {
          console.log('Final Goal Context:', goalContext);
          // Call API to create goal and plan
          await createGoal(goalContext);
          navigate('/goals');
      } catch (error) {
          console.error('Failed to create goal:', error);
          alert('Failed to create goal. Please try again.');
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto p-6 h-[calc(100vh-64px)] flex flex-col animate-fade-in">
        
        {/* Top Bar: Progress Stepper */}
        <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/goals')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ChevronLeft className="text-slate-400" />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Goal Engine</h1>
            </div>
            
            <div className="flex items-center gap-2">
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
                                <span className={!isActive && "hidden md:inline"}>{stage.label}</span>
                            </div>
                            {idx < STAGES.length - 1 && (
                                <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-slate-200' : 'bg-slate-100'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="w-24"></div> {/* Spacer for alignment */}
        </div>

        {/* Main Split View - ADJUSTED RATIO AND PLACEMENT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-0">
            
            {/* LEFT COPILOT (40%) */}
            <div className="lg:col-span-2 bg-white/50 border border-slate-100 rounded-[2.5rem] p-6 backdrop-blur-sm h-full">
                <Copilot stage={currentStage} />
            </div>

            {/* RIGHT CANVAS (60%) */}
            <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-8 flex flex-col relative overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {currentStage === 0 && (
                        <div className="max-w-2xl mx-auto">
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
                            <StageStrategy goalContext={goalContext} onChange={setGoalContext} />
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
                    <div className="pt-6 mt-4 border-t border-slate-50 flex justify-between items-center">
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
