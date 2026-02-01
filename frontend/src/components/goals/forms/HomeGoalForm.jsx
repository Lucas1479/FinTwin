import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Home, 
    MapPin, 
    DollarSign, 
    Info,
    Building,
    Trees,
    Warehouse,
    LandPlot,
    Hammer,
    Key,
    Crown,
    Scale, 
    TrendingUp, 
    Shield, 
    AlertTriangle,
    BadgePercent,
    Landmark,
    Calculator, 
    CheckCircle2, 
    AlertCircle, 
    PiggyBank, 
    Banknote,
    Wallet,
    Brain,
    Check
} from 'lucide-react';
import LocationPickerModal from '../LocationPickerModal';

// --- STAGE 1: VISION (Property Type & Location) ---
const HomeVisionForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'My First Home',
        location: initialValues.goal_details?.location || 'Auckland',
        coordinates: initialValues.goal_details?.coordinates || null,
        property_price_estimate: initialValues.goal_details?.property_price_estimate || 800000,
        deposit_percentage: initialValues.goal_details?.deposit_percentage || 20,
        is_first_home: initialValues.goal_details?.is_first_home ?? true,
        property_type: initialValues.goal_details?.property_type || 'house',
        property_condition: initialValues.goal_details?.property_condition || 'turn_key',
        due_date: initialValues.due_date || ''
    });

    const [isMapOpen, setIsMapOpen] = useState(false);
    const [searchTrigger, setSearchTrigger] = useState('');

    // Track the last synced data to prevent infinite loops
    const lastSyncedRef = React.useRef(null);
    const isInternalUpdateRef = React.useRef(false);

    // Sync with initialValues from AI/Parent
    useEffect(() => {
        // Skip if this is triggered by our own onChange call
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false;
            return;
        }

        if (initialValues.goal_details || initialValues.goal_name || initialValues.due_date) {
            // Create a stable key from incoming data
            const incomingKey = JSON.stringify({
                goal_name: initialValues.goal_name,
                location: initialValues.goal_details?.location,
                coordinates: initialValues.goal_details?.coordinates,
                property_price_estimate: initialValues.goal_details?.property_price_estimate,
                deposit_percentage: initialValues.goal_details?.deposit_percentage,
                is_first_home: initialValues.goal_details?.is_first_home,
                property_type: initialValues.goal_details?.property_type,
                property_condition: initialValues.goal_details?.property_condition,
                due_date: initialValues.due_date
            });

            // Skip if data hasn't changed
            if (incomingKey === lastSyncedRef.current) {
                return;
            }
            lastSyncedRef.current = incomingKey;

            setFormData(prev => {
                const newVal = {
                    goal_name: initialValues.goal_name || prev.goal_name,
                    location: initialValues.goal_details?.location || prev.location,
                    coordinates: initialValues.goal_details?.coordinates || prev.coordinates,
                    property_price_estimate: initialValues.goal_details?.property_price_estimate || prev.property_price_estimate,
                    deposit_percentage: initialValues.goal_details?.deposit_percentage || prev.deposit_percentage,
                    is_first_home: initialValues.goal_details?.is_first_home ?? prev.is_first_home,
                    property_type: initialValues.goal_details?.property_type || prev.property_type,
                    property_condition: initialValues.goal_details?.property_condition || prev.property_condition,
                    due_date: initialValues.due_date || prev.due_date
                };

                // Avoid unnecessary updates if data is consistent
                if (
                    newVal.goal_name === prev.goal_name &&
                    newVal.location === prev.location &&
                    newVal.property_price_estimate === prev.property_price_estimate &&
                    newVal.deposit_percentage === prev.deposit_percentage &&
                    newVal.is_first_home === prev.is_first_home &&
                    newVal.property_type === prev.property_type &&
                    newVal.property_condition === prev.property_condition &&
                    newVal.due_date === prev.due_date &&
                    JSON.stringify(newVal.coordinates) === JSON.stringify(prev.coordinates)
                ) {
                    return prev;
                }

                return newVal;
            });
        }
    }, [
        initialValues.goal_name,
        initialValues.due_date,
        initialValues.goal_details?.location,
        initialValues.goal_details?.property_price_estimate,
        initialValues.goal_details?.deposit_percentage,
        initialValues.goal_details?.is_first_home,
        initialValues.goal_details?.property_type,
        initialValues.goal_details?.property_condition
    ]);

    // Derived State - 派生值自动计算（房价 × 首付比例 = 首付金额）
    const targetDeposit = Math.round(formData.property_price_estimate * (formData.deposit_percentage / 100));

    // Propagate changes to parent immediately
    const lastPropagatedRef = React.useRef(null);
    useEffect(() => {
        // Create a stable key from current formData
        const currentKey = JSON.stringify({
            goal_name: formData.goal_name,
            location: formData.location,
            coordinates: formData.coordinates,
            property_price_estimate: formData.property_price_estimate,
            deposit_percentage: formData.deposit_percentage,
            is_first_home: formData.is_first_home,
            property_type: formData.property_type,
            property_condition: formData.property_condition,
            due_date: formData.due_date,
            targetDeposit
        });
        
        // Skip if we've already propagated this exact data
        if (currentKey === lastPropagatedRef.current) {
            return;
        }
        lastPropagatedRef.current = currentKey;

        // Mark that this is an internal update
        isInternalUpdateRef.current = true;

        onChange?.({
            goal_name: formData.goal_name,
            target_amount: targetDeposit,
            due_date: formData.due_date,
            goal_details: {
                location: formData.location,
                coordinates: formData.coordinates,
                property_price_estimate: formData.property_price_estimate,
                deposit_percentage: formData.deposit_percentage,
                is_first_home: formData.is_first_home,
                property_type: formData.property_type,
                property_condition: formData.property_condition
            }
        });
    }, [
        formData.goal_name,
        formData.location,
        formData.coordinates,
        formData.property_price_estimate,
        formData.deposit_percentage,
        formData.is_first_home,
        formData.property_type,
        formData.property_condition,
        formData.due_date,
        targetDeposit,
        onChange
    ]);

    const handleLocationSelect = (loc) => {
        setFormData(prev => ({ 
            ...prev, 
            location: loc.name,
            coordinates: { lat: loc.lat, lng: loc.lng }
        }));
        setIsMapOpen(false);
    };

    const handleLocationInputChange = (newLocation) => {
        setFormData(prev => ({ ...prev, location: newLocation }));
    };

    const handleLocationSearch = () => {
        if (formData.location && formData.location.trim().length > 0) {
            setSearchTrigger(formData.location);
            setIsMapOpen(true);
        }
    };

    const PROPERTY_TYPES = [
        { id: 'house', label: 'House', icon: Home, desc: 'Standalone property' },
        { id: 'townhouse', label: 'Townhouse', icon: Building, desc: 'Medium density' },
        { id: 'apartment', label: 'Apartment', icon: Warehouse, desc: 'Inner city living' },
        { id: 'lifestyle', label: 'Lifestyle', icon: Trees, desc: 'Rural / Semi-rural' },
        { id: 'land', label: 'Land', icon: LandPlot, desc: 'Build your own' }
    ];

    const CONDITIONS = [
        { id: 'fixer_upper', label: 'Do-Up', icon: Hammer, desc: 'Needs work, cheaper' },
        { id: 'turn_key', label: 'Move-In Ready', icon: Key, desc: 'Standard condition' },
        { id: 'luxury', label: 'Premium', icon: Crown, desc: 'High spec finish' }
    ];

    const handleSubmit = () => {
        onSubstageSubmit(formData);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-100/50 rounded-3xl p-6 border border-emerald-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                        <Home size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Define Your Dream Home</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Tell us what you're looking for. We'll help you calculate the deposit and loan you need.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: Basics */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                            placeholder="e.g. My First Home"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Target Location</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <MapPin size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    value={formData.location}
                                    onChange={(e) => handleLocationInputChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLocationSearch();
                                        }
                                    }}
                                    placeholder="e.g. Wellington, Christchurch"
                                    className="w-full input-base pl-10"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleLocationSearch}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
                            >
                                <MapPin size={16} />
                                Find on Map
                            </button>
                        </div>
                    </div>

                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Property Type</label>
                         <div className="grid grid-cols-2 gap-3">
                            {PROPERTY_TYPES.map(type => (
                                <div
                                    key={type.id}
                                    onClick={() => setFormData(prev => ({ ...prev, property_type: type.id }))}
                                    className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${
                                        formData.property_type === type.id 
                                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${formData.property_type === type.id ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        <type.icon size={16} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{type.label}</div>
                                        <div className="text-[10px] text-slate-500">{type.desc}</div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>

                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Condition / Spec</label>
                         <div className="flex gap-2">
                            {CONDITIONS.map(cond => (
                                <button
                                    key={cond.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, property_condition: cond.id }))}
                                    className={`flex-1 p-2 rounded-xl border text-center transition-all ${
                                        formData.property_condition === cond.id
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="text-xs mb-1">{cond.label}</div>
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Right Col: Financials */}
                <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
                             Estimated Financials
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Property Price Estimate</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign size={18} />
                                </div>
                                <input 
                                    type="number" 
                                    step={10000}
                                    value={formData.property_price_estimate || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // 如果是空字符串，设为0；否则转换为数字
                                        const numVal = val === '' ? 0 : Number(val);
                                        setFormData(prev => ({ ...prev, property_price_estimate: numVal }));
                                    }}
                                    className="w-full input-base pl-10 text-lg font-bold text-slate-900"
                                    placeholder="800000"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-bold text-slate-700">Deposit Goal</label>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                    formData.deposit_percentage < 20 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                    {formData.deposit_percentage}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min={5} max={50} step={5}
                                value={formData.deposit_percentage}
                                onChange={(e) => setFormData(prev => ({ ...prev, deposit_percentage: Number(e.target.value) }))}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                    formData.deposit_percentage < 20 ? 'bg-rose-200 accent-rose-500' : 'bg-emerald-200 accent-emerald-500'
                                }`}
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2">
                                <span>5% (Low Deposit)</span>
                                <span>20% (Standard)</span>
                                <span>50%</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Required Cash</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                                        ${targetDeposit.toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loan Amount</div>
                                    <div className="text-lg font-bold text-slate-400">
                                        ${(formData.property_price_estimate - targetDeposit).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => setFormData(prev => ({ ...prev, is_first_home: !prev.is_first_home }))}
                        className={`
                            border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3
                            ${formData.is_first_home ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}
                        `}
                    >
                        <div className={`p-2 rounded-full ${formData.is_first_home ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Info size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-900 text-sm">First Home Buyer?</div>
                            <div className="text-xs text-slate-600 mt-1 leading-snug">
                                Enable to check eligibility for <strong>First Home Grants</strong> (up to $10k per person) and KiwiSaver withdrawal.
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 ml-auto flex items-center justify-center transition-colors ${
                            formData.is_first_home ? 'bg-sky-500 border-sky-500' : 'border-slate-300'
                        }`}>
                            {formData.is_first_home && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Target Purchase Date</label>
                        <input 
                            type="date" 
                            value={(() => {
                                if (!formData.due_date) return '';
                                const d = new Date(formData.due_date);
                                if (Number.isNaN(d.getTime())) return '';
                                return d.toISOString().split('T')[0];
                            })()}
                            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                            className="w-full input-base"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Save & Continue
                </button>
            </div>

            <LocationPickerModal 
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleLocationSelect}
                initialLocation={formData.coordinates}
                searchAddress={searchTrigger}
            />
        </div>
    );
};

// --- STAGE 2: PARAMETERS (Market & Mortgage) ---
const HomePlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        // Market Assumptions - 优先从AI返回的ai_decision读取，否则从goal_details，最后才用默认值
        expected_return_pct: initialValues.ai_decision?.expected_return_pct ?? initialValues.goal_details?.expected_return_pct ?? 6,
        inflation_pct: initialValues.ai_decision?.inflation_pct ?? initialValues.goal_details?.inflation_pct ?? 2.5,
        property_appreciation_pct: initialValues.ai_decision?.property_appreciation_pct ?? initialValues.goal_details?.property_appreciation_pct ?? 3.5,
        risk_attitude: initialValues.ai_decision?.risk_attitude ?? initialValues.goal_details?.risk_attitude ?? 'balanced',
        
        // Mortgage Specifics - 优先从AI返回的ai_decision读取
        mortgage_rate_pct: initialValues.ai_decision?.mortgage_rate_pct ?? initialValues.goal_details?.mortgage_rate_pct ?? 6.5,
        stress_test_rate_pct: initialValues.ai_decision?.stress_test_rate_pct ?? initialValues.goal_details?.stress_test_rate_pct ?? 8.5, // Usually +2% buffer
        loan_term_years: initialValues.ai_decision?.loan_term_years ?? initialValues.goal_details?.loan_term_years ?? 30
    });

    // Track the last synced data to prevent infinite loops
    const lastSyncedRef = React.useRef(null);
    const isInternalUpdateRef = React.useRef(false);

    // Sync with initialValues from parent (AI or goal_details)
    useEffect(() => {
        // Skip if this is triggered by our own onChange call
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false;
            return;
        }

        // 优先从AI的ai_decision读取，否则从goal_details读取
        const aiDecision = initialValues.ai_decision || {};
        const goalDetails = initialValues.goal_details || {};
        
        // Create a stable key from incoming data (从两个源合并)
        const incomingKey = JSON.stringify({
            expected_return_pct: aiDecision.expected_return_pct ?? goalDetails.expected_return_pct,
            inflation_pct: aiDecision.inflation_pct ?? goalDetails.inflation_pct,
            property_appreciation_pct: aiDecision.property_appreciation_pct ?? goalDetails.property_appreciation_pct,
            risk_attitude: aiDecision.risk_attitude ?? goalDetails.risk_attitude,
            mortgage_rate_pct: aiDecision.mortgage_rate_pct ?? goalDetails.mortgage_rate_pct,
            stress_test_rate_pct: aiDecision.stress_test_rate_pct ?? goalDetails.stress_test_rate_pct,
            loan_term_years: aiDecision.loan_term_years ?? goalDetails.loan_term_years
        });

        // Skip if data hasn't changed
        if (incomingKey === lastSyncedRef.current) {
            return;
        }
        lastSyncedRef.current = incomingKey;

        setFormData(prev => {
            const newVal = {
                expected_return_pct: aiDecision.expected_return_pct ?? goalDetails.expected_return_pct ?? prev.expected_return_pct,
                inflation_pct: aiDecision.inflation_pct ?? goalDetails.inflation_pct ?? prev.inflation_pct,
                property_appreciation_pct: aiDecision.property_appreciation_pct ?? goalDetails.property_appreciation_pct ?? prev.property_appreciation_pct,
                risk_attitude: aiDecision.risk_attitude ?? goalDetails.risk_attitude ?? prev.risk_attitude,
                mortgage_rate_pct: aiDecision.mortgage_rate_pct ?? goalDetails.mortgage_rate_pct ?? prev.mortgage_rate_pct,
                stress_test_rate_pct: aiDecision.stress_test_rate_pct ?? goalDetails.stress_test_rate_pct ?? prev.stress_test_rate_pct,
                loan_term_years: aiDecision.loan_term_years ?? goalDetails.loan_term_years ?? prev.loan_term_years
            };

            // Avoid update if values are identical
            if (
                newVal.expected_return_pct === prev.expected_return_pct &&
                newVal.inflation_pct === prev.inflation_pct &&
                newVal.property_appreciation_pct === prev.property_appreciation_pct &&
                newVal.risk_attitude === prev.risk_attitude &&
                newVal.mortgage_rate_pct === prev.mortgage_rate_pct &&
                newVal.stress_test_rate_pct === prev.stress_test_rate_pct &&
                newVal.loan_term_years === prev.loan_term_years
            ) {
                return prev;
            }
            
            return newVal;
        });
    }, [
        initialValues.ai_decision?.expected_return_pct, 
        initialValues.ai_decision?.inflation_pct, 
        initialValues.ai_decision?.property_appreciation_pct, 
        initialValues.ai_decision?.risk_attitude, 
        initialValues.ai_decision?.mortgage_rate_pct, 
        initialValues.ai_decision?.stress_test_rate_pct, 
        initialValues.ai_decision?.loan_term_years,
        initialValues.goal_details?.expected_return_pct, 
        initialValues.goal_details?.inflation_pct, 
        initialValues.goal_details?.property_appreciation_pct, 
        initialValues.goal_details?.risk_attitude, 
        initialValues.goal_details?.mortgage_rate_pct, 
        initialValues.goal_details?.stress_test_rate_pct, 
        initialValues.goal_details?.loan_term_years
    ]);

    // 自动联动：当贷款利率变化时，压力测试利率自动跟随（+2%）
    useEffect(() => {
        setFormData(prev => {
            // 只在合理范围内自动更新 Stress Test Rate
            const ruleBasedStress = prev.mortgage_rate_pct + 2.0;
            if (Math.abs(prev.stress_test_rate_pct - ruleBasedStress) < 0.5) {
                return { ...prev, stress_test_rate_pct: ruleBasedStress };
            }
            return prev;
        });
    }, [formData.mortgage_rate_pct]);

    // Propagate changes to parent immediately (but only propagate formData, not merge with initialValues)
    const lastPropagatedRef = React.useRef(null);
    useEffect(() => {
        // Create a stable key from current formData
        const currentKey = JSON.stringify(formData);
        
        // Skip if we've already propagated this exact data
        if (currentKey === lastPropagatedRef.current) {
            return;
        }
        lastPropagatedRef.current = currentKey;

        // Mark that this is an internal update
        isInternalUpdateRef.current = true;

        onChange?.({
            goal_details: formData
        });
    }, [formData.expected_return_pct, formData.inflation_pct, formData.property_appreciation_pct, formData.risk_attitude, formData.mortgage_rate_pct, formData.stress_test_rate_pct, formData.loan_term_years, onChange]);

    const handleSubmit = () => {
        onSubstageSubmit(formData);
    };

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Scale size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Market & Mortgage Assumptions</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Set the rules for your simulation. We use a <strong>Stress Test Rate</strong> to ensure you can afford the loan even if rates rise.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: Mortgage Rules */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Landmark size={16} /> Mortgage Parameters
                    </h4>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Mortgage Interest Rate</label>
                                <span className="text-2xl font-black text-slate-900">{formData.mortgage_rate_pct}%</span>
                            </div>
                            <div className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">
                                Current Avg: ~6.5%
                            </div>
                        </div>
                        <input 
                            type="range" min={2} max={10} step={0.1}
                            value={formData.mortgage_rate_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, mortgage_rate_pct: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1">
                                        <AlertTriangle size={12} className="text-amber-500"/> Stress Test Rate
                                    </label>
                                    <span className="text-xl font-bold text-slate-700">{formData.stress_test_rate_pct}%</span>
                                </div>
                                <div className="text-[10px] text-slate-400 max-w-[120px] text-right leading-tight">
                                    Bank serviceability buffer (+2%)
                                </div>
                            </div>
                             <input 
                                type="range" min={4} max={12} step={0.1}
                                value={formData.stress_test_rate_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, stress_test_rate_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-slate-700">Loan Term</label>
                            <span className="text-xl font-bold text-slate-900">{formData.loan_term_years} Years</span>
                        </div>
                        <input 
                            type="range" min={10} max={30} step={5}
                            value={formData.loan_term_years}
                            onChange={(e) => setFormData(prev => ({ ...prev, loan_term_years: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                         <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>10y (Aggressive)</span>
                            <span>30y (Standard)</span>
                        </div>
                    </div>
                </div>

                {/* Right Col: Investment & Growth */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                        <TrendingUp size={16} /> Savings & Growth
                    </h4>

                    {/* Risk Profile */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Deposit Savings Risk Profile</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'conservative', label: 'Stable', Icon: Shield },
                                { id: 'balanced', label: 'Balanced', Icon: Scale },
                                { id: 'growth', label: 'Growth', Icon: TrendingUp }
                            ].map((risk) => (
                                <div 
                                    key={risk.id}
                                    onClick={() => setFormData(prev => ({ ...prev, risk_attitude: risk.id }))}
                                    className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${
                                        formData.risk_attitude === risk.id 
                                        ? `border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 text-indigo-700` 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <div className="flex justify-center mb-1">
                                        <risk.Icon size={18} />
                                    </div>
                                    <div className="font-bold text-[10px] uppercase">{risk.label}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            *For short timeframes (&lt;3 years), we recommend <strong>Conservative</strong> to protect your deposit.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500">Savings Return (After Tax)</label>
                                <span className="text-sm font-bold text-slate-900">{formData.expected_return_pct}%</span>
                            </div>
                            <input 
                                type="range" min={1} max={10} step={0.25}
                                value={formData.expected_return_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <BadgePercent size={12} /> Property Appreciation
                                </label>
                                <span className="text-sm font-bold text-slate-900">{formData.property_appreciation_pct}%</span>
                            </div>
                            <input 
                                type="range" min={0} max={8} step={0.5}
                                value={formData.property_appreciation_pct}
                                onChange={(e) => setFormData(prev => ({ ...prev, property_appreciation_pct: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="text-[10px] text-slate-400 mt-1">
                                NZ Historical Avg: ~3-5% (Real). Higher rates increase your deposit target over time.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Confirm Parameters
                </button>
            </div>
        </div>
    );
};

// --- STAGE 3: GAP (Deposit & Servicing) ---
const HomeGapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    // 1. Read-Only Context from Previous Stages
    const vision = initialValues.goal_details || {};
    const assumptions = initialValues.goal_details || {}; // Merged in same object
    
    // Try to get financial data from multiple sources (AI decision > goal_details > direct props)
    const getFinancialValue = (key, aiKey = key) => {
        return initialValues.ai_decision?.[aiKey] 
            ?? initialValues.goal_details?.[key] 
            ?? initialValues[key] 
            ?? 0;
    };

    const realAssets = {
        liquid_assets: getFinancialValue('liquid_assets'),
        investments: getFinancialValue('investments'),
        kiwisaver: getFinancialValue('current_super_balance'),
        monthly_income: getFinancialValue('monthly_income'),
        debts: getFinancialValue('debts'),
        hasData: (
            initialValues.ai_decision?.liquid_assets !== undefined || 
            initialValues.goal_details?.liquid_assets !== undefined ||
            initialValues.liquid_assets !== undefined
        )
    };

    // 2. Constants & Helpers - Try multiple sources
    const PROPERTY_PRICE = vision.property_price_estimate 
        || initialValues.property_price_estimate 
        || initialValues.ai_decision?.property_price_estimate 
        || 800000;
    const DEPOSIT_PCT = vision.deposit_percentage 
        || initialValues.deposit_percentage 
        || initialValues.ai_decision?.deposit_percentage 
        || 20;
    const FIRST_HOME_GRANT = (vision.is_first_home ?? initialValues.is_first_home ?? initialValues.ai_decision?.is_first_home) ? 10000 : 0;
    const MORTGAGE_RATE = assumptions.mortgage_rate_pct || 6.5;
    const TERM_YEARS = assumptions.loan_term_years || 30;

    // 3. Deposit Gap Calculation
    const targetDeposit = Math.round(PROPERTY_PRICE * (DEPOSIT_PCT / 100));
    const availableDeposit = realAssets.liquid_assets + realAssets.investments + (vision.is_first_home ? realAssets.kiwisaver : 0) + FIRST_HOME_GRANT;
    const depositGap = Math.max(0, targetDeposit - availableDeposit);

    // 4. Servicing Gap Calculation (Simplified PMT)
    const principal = PROPERTY_PRICE - availableDeposit; // Assuming they buy NOW with what they have (or target)
    // Actually, servicing is based on the *Target Loan Amount* (Price - Target Deposit)
    const targetLoanAmount = PROPERTY_PRICE - targetDeposit;
    
    // Monthly P&I Payment Formula: P * r(1+r)^n / ((1+r)^n - 1)
    const monthlyRate = (MORTGAGE_RATE / 100) / 12;
    const numPayments = TERM_YEARS * 12;
    const monthlyMortgagePayment = targetLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    // DTI / Affordability Check (Rough Rule: Mortgage < 40% of Income)
    const maxAffordablePayment = (realAssets.monthly_income || 0) * 0.40;
    const servicingGap = Math.max(0, monthlyMortgagePayment - maxAffordablePayment);
    const isServiceable = monthlyMortgagePayment <= maxAffordablePayment;
    
    // Overall Feasibility Score
    const depositReadyPct = Math.min(100, (availableDeposit / targetDeposit) * 100);
    const isFeasible = depositReadyPct > 80 && isServiceable;

    const handleSubmit = () => {
        onSubstageSubmit({ confirmed: true });
    };

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Header */}
             <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Calculator size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Affordability Check</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We look at two things: <strong>Deposit</strong> (Entry Ticket) and <strong>Servicing</strong> (Keeping the House).
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. DEPOSIT ANALYSIS */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    depositReadyPct >= 100 ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-white'
                }`}>
                    <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <PiggyBank size={18} className="text-indigo-500" /> Deposit Check
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-bold">Target ({DEPOSIT_PCT}%)</span>
                            <span className="text-xl font-black text-slate-900">${(targetDeposit/1000).toFixed(0)}k</span>
                        </div>
                        
                        {/* Stacked Bar */}
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            {/* Savings */}
                            <div style={{ width: `${(realAssets.liquid_assets / targetDeposit) * 100}%` }} className="bg-emerald-400 h-full" title="Cash" />
                            {/* Investments */}
                            <div style={{ width: `${(realAssets.investments / targetDeposit) * 100}%` }} className="bg-emerald-300 h-full" title="Investments" />
                            {/* KiwiSaver (if eligible) */}
                            {vision.is_first_home && (
                                <div style={{ width: `${(realAssets.kiwisaver / targetDeposit) * 100}%` }} className="bg-blue-400 h-full" title="KiwiSaver" />
                            )}
                             {/* Grant */}
                             {vision.is_first_home && (
                                <div style={{ width: `${(FIRST_HOME_GRANT / targetDeposit) * 100}%` }} className="bg-sky-400 h-full" title="Grant" />
                            )}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                            <span>Have: ${(availableDeposit/1000).toFixed(0)}k</span>
                            <span className={depositGap > 0 ? "text-rose-500" : "text-emerald-500"}>
                                {depositGap > 0 ? `Gap: $${(depositGap/1000).toFixed(0)}k` : "Ready!"}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="flex flex-wrap gap-2">
                        {vision.is_first_home && (
                            <div className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1">
                                <Landmark size={10} /> +${(realAssets.kiwisaver/1000).toFixed(0)}k KiwiSaver
                            </div>
                        )}
                        {vision.is_first_home && (
                            <div className="px-2 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-lg border border-sky-100 flex items-center gap-1">
                                <Banknote size={10} /> +$10k Grant
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SERVICING ANALYSIS */}
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isServiceable ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-white'
                }`}>
                     <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold uppercase tracking-wider text-sm">
                        <Wallet size={18} className="text-indigo-500" /> Servicing Check
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Est. Mortgage Payment</span>
                            <span className="text-lg font-black text-slate-900">
                                ${Math.round(monthlyMortgagePayment).toLocaleString()} <span className="text-xs font-normal text-slate-400">/mo</span>
                            </span>
                        </div>

                        <div className="relative pt-4">
                             <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400">Affordability limit (~40% Income)</div>
                             <div className="h-2 w-full bg-slate-100 rounded-full mt-1 relative">
                                 {/* Limit Line */}
                                 <div 
                                    className="absolute top-[-4px] bottom-[-4px] w-1 bg-slate-300 z-10" 
                                    style={{ left: '60%' }} // Visual anchor
                                 />
                                 
                                 {/* Usage Bar - normalized so 60% is the limit visually */}
                                 <div 
                                    className={`h-full rounded-full transition-all ${isServiceable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(100, (monthlyMortgagePayment / (maxAffordablePayment * 1.5)) * 100)}%` }}
                                 />
                             </div>
                             <div className="flex justify-between mt-1 text-[10px] font-bold">
                                 <span className="text-slate-400">0</span>
                                 <span className={isServiceable ? 'text-emerald-600' : 'text-rose-600'}>
                                     {realAssets.monthly_income > 0 
                                         ? `${Math.round((monthlyMortgagePayment / realAssets.monthly_income) * 100)}% of Income`
                                         : 'Income data needed'
                                     }
                                 </span>
                             </div>
                        </div>

                        {!isServiceable && (
                            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex gap-2 items-start">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <p>Payments exceed 40% of reported income. Bank approval may be difficult.</p>
                            </div>
                        )}
                         {isServiceable && (
                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex gap-2 items-start">
                                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                                <p>Payments look manageable within standard lending criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Recommendation */}
            {initialValues.ai_decision?.rationale && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-3xl p-6 border border-indigo-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
                            <Brain size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">AI Analysis</div>
                            <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {initialValues.ai_decision.rationale}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Confirm & Generate Strategy
                </button>
            </div>
        </div>
    );
};

const HomeGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    // Substage Router
    if (activeSubstage === 'goal_discovery') {
        return (
            <HomeVisionForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit} 
                needsRecompute={needsRecompute} 
            />
        );
    }

    if (activeSubstage === 'assumptions') {
        return (
            <HomePlanningParametersForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit} 
            />
        );
    }

    if (activeSubstage === 'gap_analysis') {
        return (
            <HomeGapFeasibilityForm 
                initialValues={initialValues} 
                onSubstageSubmit={onSubstageSubmit} 
            />
        );
    }

    // Fallback
    return <div className="text-center text-slate-500 py-8">Unknown Substage: {activeSubstage}</div>;
};

export default HomeGoalForm;
