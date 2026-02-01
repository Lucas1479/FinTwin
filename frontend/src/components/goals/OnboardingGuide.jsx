import { 
    Brain, 
    Lock, 
    Search, 
    Layout, 
    Zap, 
    Sparkles,
    MessageSquare,
    CheckCircle,
    ArrowRight,
    Maximize2,
    Shield
} from 'lucide-react';

const OnboardingGuide = ({ onClose, onQuickStart, mode = 'page' }) => {
    const quickStartOptions = [
        "I want to retire at 65 with comfortable living",
        "I want to buy a house in 5 years",
        "I want to plan a trip to Europe next year",
        "I want to save for my child's education"
    ];

    const handleQuickStart = (prompt) => {
        onClose?.();
        onQuickStart?.(prompt);
    };

    return (
        <div className={`
            ${mode === 'page' 
                ? 'w-full h-full flex items-start justify-center overflow-y-auto py-8 scrollbar-soft' 
                : 'max-w-2xl'}
        `}>
            <div className={`
                ${mode === 'page' ? 'max-w-2xl w-full mx-4 my-auto' : 'w-full'}
                bg-white rounded-2xl p-6 lg:p-8
                ${mode === 'page' ? 'shadow-xl border border-slate-100' : ''}
            `}>
                
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">
                        Build your financial plan
                    </h2>
                    <p className="text-sm text-slate-600">
                        Chat with AI to create a personalized strategy
                    </p>
                </div>

                {/* How it Works */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap size={14} className="text-indigo-600" />
                        How It Works
                    </h3>
                    <div className="space-y-2">
                        <div className="flex gap-2.5 items-center">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                1
                            </div>
                            <p className="text-sm text-slate-700">
                                <span className="font-bold">Chat</span> with AI about your goal
                            </p>
                        </div>
                        <div className="flex gap-2.5 items-center">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                2
                            </div>
                            <p className="text-sm text-slate-700">
                                <span className="font-bold">Review</span> and adjust AI suggestions
                            </p>
                        </div>
                        <div className="flex gap-2.5 items-center">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                3
                            </div>
                            <p className="text-sm text-slate-700">
                                <span className="font-bold">Progress</span> through 4 stages to completion
                            </p>
                        </div>
                    </div>
                </div>

                {/* Interface Tips */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Layout size={14} className="text-indigo-600" />
                        Interface Tips
                    </h3>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Maximize2 size={14} className="text-slate-500 shrink-0" />
                            <span><span className="font-bold">Resize:</span> Drag divider or drag to edge to collapse</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Shield size={14} className="text-green-600 shrink-0" />
                            <span><span className="font-bold">Privacy:</span> Toggle in copilot footer (Green/Amber)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Brain size={14} className="text-indigo-600 shrink-0" />
                            <span><span className="font-bold">Modes:</span> AUTO, ASK, or AGENT in copilot footer</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                            <Search size={14} className="text-brand-600 shrink-0" />
                            <span><span className="font-bold">AI Features:</span> Search, Reasoning, Citations in header</span>
                        </div>
                    </div>
                </div>

                {/* Quick Options */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare size={14} className="text-indigo-600" />
                        Try asking...
                    </h3>
                    <div className="space-y-2">
                        {quickStartOptions.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickStart(option)}
                                className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 rounded-xl text-sm text-indigo-900 font-medium transition-all active:scale-[0.98] flex items-center justify-between group"
                            >
                                <span>{option}</span>
                                <ArrowRight size={16} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Or close button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    Or start with a custom question
                </button>

                {mode === 'modal' && (
                    <p className="text-center text-xs text-slate-500 mt-4">
                        Press ESC or click outside to close
                    </p>
                )}
            </div>
        </div>
    );
};

export default OnboardingGuide;
