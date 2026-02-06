/**
 * Component Showcase - Refactored Goal Engine Components Demo
 * 
 * Test and validate all refactored components from GoalIntakePage
 * Live interactive demos with code examples
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { SubstageStepIndicator } from '../components/goals/engine/SubstageStepIndicator';
import { ConfirmedCard } from '../components/goals/engine/ConfirmedCard';
import { GapAnalysisForm } from '../components/goals/engine/GapAnalysisForm';
import { AssumptionForm } from '../components/goals/engine/AssumptionForm';
import Copilot from '../components/goals/engine/Copilot';
import { GENERIC_SUBSTAGES, getSubstagesForCategory, buildInitialSubstageState } from '../components/goals/engine/constants';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const ComponentShowcase = () => {
    // Demo state management
    const [activeDemo, setActiveDemo] = useState('indicator');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I\'m the AI assistant. How can I help you with your financial goals today?' }
    ]);
    const [useRag, setUseRag] = useState(true);
    const [mode, setMode] = useState('agent');
    const [allowAIDataSharing, setAllowAIDataSharing] = useState(false);
    const [pendingQuery, setPendingQuery] = useState(null);
    const [showPermissionCard, setShowPermissionCard] = useState(false);
    const [requestedDataTypes, setRequestedDataTypes] = useState([]);
    const [selectedAllowlist, setSelectedAllowlist] = useState([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const [substageState, setSubstageState] = useState(buildInitialSubstageState());
    const [cardExpanded, setCardExpanded] = useState(true);

    const goalContext = {
        category: 'retirement',
        goal_name: 'Retirement Planning',
        target_amount: 500000,
        due_date: '2040-01-01'
    };

    const demos = [
        { id: 'indicator', name: 'SubstageStepIndicator', icon: '📊' },
        { id: 'card', name: 'ConfirmedCard', icon: '✅' },
        { id: 'gap-form', name: 'GapAnalysisForm', icon: '📝' },
        { id: 'assumption-form', name: 'AssumptionForm', icon: '🎯' },
        { id: 'copilot', name: 'Copilot', icon: '🤖' }
    ];

    const handleUpdateContext = (updates) => {
        console.log('Context updated:', updates);
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Link 
                                    to="/goals/new"
                                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Goal Engine
                                </Link>
                                <h1 className="text-3xl font-bold text-slate-900">
                                    🎨 Component Showcase
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    Test and validate refactored components
                                </p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 size={20} />
                                    <div>
                                        <div className="font-bold text-sm">Refactoring Complete</div>
                                        <div className="text-xs">7 Components · 96 Tests</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Sidebar - Component List */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-4">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Components
                                </h2>
                                <div className="space-y-2">
                                    {demos.map((demo) => (
                                        <button
                                            key={demo.id}
                                            onClick={() => setActiveDemo(demo.id)}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                                                ${activeDemo === demo.id
                                                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            <span className="text-xl">{demo.icon}</span>
                                            <span className="text-sm">{demo.name}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Statistics
                                    </h3>
                                    <div className="space-y-1 text-sm text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Components</span>
                                            <span className="font-semibold">7</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Test Cases</span>
                                            <span className="font-semibold">96</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Lines of Code</span>
                                            <span className="font-semibold">1,249</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Test Coverage</span>
                                            <span className="font-semibold">70%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content - Component Demo */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                {/* SubstageStepIndicator Demo */}
                                {activeDemo === 'indicator' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                            📊 SubstageStepIndicator
                                        </h2>
                                        <p className="text-slate-600 mb-6">
                                            Progress indicator showing substage status
                                        </p>
                                        
                                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">Live Demo</h3>
                                            <div className="bg-white rounded-lg p-6 border border-slate-200">
                                                <SubstageStepIndicator 
                                                    config={GENERIC_SUBSTAGES}
                                                    state={substageState.definition}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <button
                                                onClick={() => {
                                                    setSubstageState(prev => ({
                                                        ...prev,
                                                        definition: {
                                                            ...prev.definition,
                                                            currentIndex: (prev.definition.currentIndex + 1) % GENERIC_SUBSTAGES.length
                                                        }
                                                    }));
                                                }}
                                                className="btn-primary-rounded px-4 py-2 text-sm"
                                            >
                                                Next Step
                                            </button>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <h3 className="text-sm font-bold text-blue-900 mb-2">Usage Example</h3>
                                            <pre className="text-xs text-blue-800 overflow-x-auto">
{`import { SubstageStepIndicator } from './components/goals/engine/SubstageStepIndicator';

<SubstageStepIndicator 
    config={GENERIC_SUBSTAGES}
    state={substageState.definition}
/>`}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* ConfirmedCard Demo */}
                                {activeDemo === 'card' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                            ✅ ConfirmedCard
                                        </h2>
                                        <p className="text-slate-600 mb-6">
                                            Confirmed data card with expand/collapse and edit functionality
                                        </p>
                                        
                                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">Live Demo</h3>
                                            <ConfirmedCard
                                                title="Financial Information"
                                                dataLines={[
                                                    { label: 'Monthly Income', value: '$5,000' },
                                                    { label: 'Liquid Assets', value: '$10,000' },
                                                    { label: 'Investments', value: '$50,000' },
                                                    { label: 'Debts', value: '$20,000' }
                                                ]}
                                                onEdit={() => alert('Edit functionality')}
                                                isExpanded={cardExpanded}
                                                onToggle={() => setCardExpanded(!cardExpanded)}
                                            />
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <h3 className="text-sm font-bold text-blue-900 mb-2">Usage Example</h3>
                                            <pre className="text-xs text-blue-800 overflow-x-auto">
{`import { ConfirmedCard } from './components/goals/engine/ConfirmedCard';

<ConfirmedCard
    title="Financial Information"
    dataLines={[
        { label: 'Monthly Income', value: '$5,000' },
        { label: 'Assets', value: '$10,000' }
    ]}
    onEdit={() => console.log('Edit')}
    isExpanded={true}
    onToggle={() => setExpanded(!expanded)}
/>`}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* GapAnalysisForm Demo */}
                                {activeDemo === 'gap-form' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                            📝 GapAnalysisForm
                                        </h2>
                                        <p className="text-slate-600 mb-6">
                                            Financial gap analysis form collecting current financial state
                                        </p>
                                        
                                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">Live Demo</h3>
                                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                                                <GapAnalysisForm
                                                    initialValues={{
                                                        monthly_income: 5000,
                                                        liquid_assets: 10000,
                                                        investments: 50000,
                                                        debts: 20000
                                                    }}
                                                    onSubmit={(data) => {
                                                        alert('Form submitted:\n' + JSON.stringify(data, null, 2));
                                                    }}
                                                    onCancel={() => alert('Cancelled')}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <h3 className="text-sm font-bold text-blue-900 mb-2">Usage Example</h3>
                                            <pre className="text-xs text-blue-800 overflow-x-auto">
{`import { GapAnalysisForm } from './components/goals/engine/GapAnalysisForm';

<GapAnalysisForm
    initialValues={{
        monthly_income: 5000,
        liquid_assets: 10000
    }}
    onSubmit={(data) => console.log(data)}
    onCancel={() => console.log('Cancel')}
/>`}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* AssumptionForm Demo */}
                                {activeDemo === 'assumption-form' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                            🎯 AssumptionForm
                                        </h2>
                                        <p className="text-slate-600 mb-6">
                                            Financial assumptions form for investment parameters and risk preferences
                                        </p>
                                        
                                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">Live Demo</h3>
                                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                                                <AssumptionForm
                                                    initialValues={{
                                                        expected_return_pct: 7.0,
                                                        inflation_pct: 3.0,
                                                        risk_attitude: 'moderate',
                                                        cashflow_flexibility: 'medium'
                                                    }}
                                                    onSubmit={(data) => {
                                                        alert('Form submitted:\n' + JSON.stringify(data, null, 2));
                                                    }}
                                                    onCancel={() => alert('Cancelled')}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <h3 className="text-sm font-bold text-blue-900 mb-2">Usage Example</h3>
                                            <pre className="text-xs text-blue-800 overflow-x-auto">
{`import { AssumptionForm } from './components/goals/engine/AssumptionForm';

<AssumptionForm
    initialValues={{
        expected_return_pct: 7.0,
        inflation_pct: 3.0
    }}
    onSubmit={(data) => console.log(data)}
    onCancel={() => console.log('Cancel')}
/>`}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Copilot Demo */}
                                {activeDemo === 'copilot' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                            🤖 Copilot (AI Assistant)
                                        </h2>
                                        <p className="text-slate-600 mb-6">
                                            Complete AI assistant with chat, permission management, RAG retrieval, and more
                                        </p>
                                        
                                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 mb-3">Live Demo</h3>
                                            <div className="bg-white rounded-lg border border-slate-200" style={{ height: '600px' }}>
                                                <Copilot
                                                    stage={0}
                                                    currentStageLabel="definition"
                                                    goalContext={goalContext}
                                                    onUpdateContext={handleUpdateContext}
                                                    messages={messages}
                                                    setMessages={setMessages}
                                                    useRag={useRag}
                                                    setUseRag={setUseRag}
                                                    mode={mode}
                                                    setMode={setMode}
                                                    allowAIDataSharing={allowAIDataSharing}
                                                    setAllowAIDataSharing={setAllowAIDataSharing}
                                                    pendingQuery={pendingQuery}
                                                    setPendingQuery={setPendingQuery}
                                                    showPermissionCard={showPermissionCard}
                                                    setShowPermissionCard={setShowPermissionCard}
                                                    requestedDataTypes={requestedDataTypes}
                                                    setRequestedDataTypes={setRequestedDataTypes}
                                                    selectedAllowlist={selectedAllowlist}
                                                    setSelectedAllowlist={setSelectedAllowlist}
                                                    onExecuteSubstageWithPermission={() => {}}
                                                    quickStartPrompt={null}
                                                    isLoadingAI={isLoadingAI}
                                                    setIsLoadingAI={setIsLoadingAI}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <h3 className="text-sm font-bold text-blue-900 mb-2">Key Features</h3>
                                            <ul className="text-sm text-blue-800 space-y-1">
                                                <li>✅ Streaming AI responses</li>
                                                <li>✅ Markdown rendering (with table support)</li>
                                                <li>✅ Chain of Thought visualization</li>
                                                <li>✅ RAG (Retrieval Augmented Generation)</li>
                                                <li>✅ Permission management</li>
                                                <li>✅ Multi-mode support (auto/ask/agent)</li>
                                                <li>✅ Message copying</li>
                                                <li>✅ Auto-scroll</li>
                                                <li>✅ Citations and source display</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ComponentShowcase;
