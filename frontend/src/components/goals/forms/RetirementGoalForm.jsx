import React, { useState, useEffect, useRef } from 'react';
import { 
    Clock, 
    Heart, 
    DollarSign, 
    Shield, 
    AlertCircle,
    Calculator,
    TrendingUp,
    Calendar
} from 'lucide-react';

const RetirementGoalForm = ({ initialValues, onChange }) => {
    // 1. Local state initialized from parent
    const [details, setDetails] = useState({
        retirement_age: initialValues?.goal_details?.retirement_age || 65,
        life_expectancy: initialValues?.goal_details?.life_expectancy || 95,
        living_expense_pa: initialValues?.goal_details?.living_expense_pa || 52000,
        include_superannuation: initialValues?.goal_details?.include_superannuation ?? true
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues?.goal_name || 'My Retirement',
        due_date: initialValues?.due_date || ''
    });

    const [frequency, setFrequency] = useState('weekly');
    const [inflationAdjust, setInflationAdjust] = useState(initialValues?.inflationAdjust ?? true);

    // Refs to track previous values and prevent infinite loops
    const lastSentPayloadRef = useRef(null);
    const isInternalChangeRef = useRef(false);
    const lastReceivedDataRef = useRef('');

    // SYNC: Incoming updates from AI (Copilot) - only when AI provides NEW data
    useEffect(() => {
        if (!initialValues) return;
        
        // Skip if this update was triggered by our own onChange
        if (isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        // Create a stable comparison key from incoming data (only fields we care about)
        const incomingKey = JSON.stringify({
            goal_name: initialValues.goal_name,
            due_date: initialValues.due_date,
            inflationAdjust: initialValues.inflationAdjust,
            retirement_age: initialValues.goal_details?.retirement_age,
            life_expectancy: initialValues.goal_details?.life_expectancy,
            living_expense_pa: initialValues.goal_details?.living_expense_pa,
            include_superannuation: initialValues.goal_details?.include_superannuation
        });

        // Skip if incoming data is the same as last received
        if (incomingKey === lastReceivedDataRef.current) {
            return;
        }
        lastReceivedDataRef.current = incomingKey;

        console.log('[RetirementGoalForm] Syncing from AI:', initialValues.goal_details);

        // Update details from AI
        if (initialValues.goal_details) {
            setDetails(prev => ({
                ...prev,
                retirement_age: initialValues.goal_details.retirement_age ?? prev.retirement_age,
                life_expectancy: initialValues.goal_details.life_expectancy ?? prev.life_expectancy,
                living_expense_pa: initialValues.goal_details.living_expense_pa ?? prev.living_expense_pa,
                include_superannuation: initialValues.goal_details.include_superannuation ?? prev.include_superannuation
            }));
        }
        if (initialValues.goal_name) {
            setMeta(prev => ({ ...prev, goal_name: initialValues.goal_name }));
        }
        if (initialValues.due_date) {
            setMeta(prev => ({ ...prev, due_date: initialValues.due_date }));
        }
        if (initialValues.inflationAdjust !== undefined) {
            setInflationAdjust(initialValues.inflationAdjust);
        }
    }, [initialValues]);

    // --- Calculation Logic ---
    const NZ_SUPER_SINGLE = 27000;
    const adjustedIncome = Math.max(0, details.living_expense_pa - (details.include_superannuation ? NZ_SUPER_SINGLE : 0));
    const currentAge = 30; // Mock
    const yearsToGo = Math.max(0, details.retirement_age - currentAge);
    const retirementDuration = details.life_expectancy - details.retirement_age;

    let multiplier = 25;
    if (retirementDuration > 30) multiplier = 30;
    else if (retirementDuration < 20) multiplier = 20;

    const calculatedTarget = adjustedIncome * multiplier;

    // Reporting back to parent (The "Source of Truth" hook)
    // Uses a ref to compare and prevent unnecessary updates
    useEffect(() => {
        const payload = {
            goal_name: meta.goal_name,
            target_amount: calculatedTarget,
            due_date: meta.due_date,
            inflationAdjust: inflationAdjust,
            goal_details: {
                ...details,
                required_nest_egg: calculatedTarget,
                multiplier
            }
        };

        // Create a stable comparison key (excluding functions and refs)
        const payloadKey = JSON.stringify({
            goal_name: payload.goal_name,
            target_amount: payload.target_amount,
            due_date: payload.due_date,
            inflationAdjust: payload.inflationAdjust,
            goal_details: payload.goal_details
        });

        // Only notify parent if values are actually different to stop the loop
        if (payloadKey !== lastSentPayloadRef.current) {
            lastSentPayloadRef.current = payloadKey;
            isInternalChangeRef.current = true; // Mark that we're triggering this
            onChange(payload);
        }
    }, [details, meta.goal_name, meta.due_date, calculatedTarget, inflationAdjust, multiplier, onChange]);

    // Handlers
    const handleDetailChange = (key, value) => {
        setDetails(prev => ({ ...prev, [key]: value }));
    };

    const handleMetaChange = (key, value) => {
        setMeta(prev => ({ ...prev, [key]: value }));
    };

    const handleIncomeInput = (val) => {
        const num = Number(val);
        const annual = frequency === 'weekly' ? num * 52 : num;
        handleDetailChange('living_expense_pa', annual);
    };

    // Auto-update Date based on Age
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const targetYear = currentYear + yearsToGo;
        const newDueDate = `${targetYear}-07-01`;
        if (meta.due_date !== newDueDate) {
            setMeta(prev => ({ ...prev, due_date: newDueDate }));
        }
    }, [details.retirement_age, yearsToGo]);

    const displayIncome = frequency === 'weekly' ? Math.round(details.living_expense_pa / 52) : details.living_expense_pa;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* UI remains identical to before */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-6 border border-indigo-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Retirement Strategy</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Planning for the long haul. You have <strong>{yearsToGo} years</strong> to save 
                            for <strong>{details.life_expectancy - details.retirement_age} years</strong> of freedom.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                    <input 
                        type="text" 
                        value={meta.goal_name}
                        onChange={(e) => handleMetaChange('goal_name', e.target.value)}
                        className="w-full input-base"
                    />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-sm font-bold text-slate-500">Retire At Age</span>
                        <span className="text-2xl font-bold text-indigo-600">{details.retirement_age}</span>
                    </div>
                    <input 
                        type="range" 
                        min={50} max={80} 
                        value={details.retirement_age}
                        onChange={(e) => handleDetailChange('retirement_age', Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                        <span>50 (Early)</span>
                        <span>65 (Standard)</span>
                        <span>80 (Late)</span>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="flex justify-between items-end">
                        <label className="block text-sm font-bold text-slate-700">
                            Desired Income
                            <span className="ml-2 text-xs font-normal text-slate-400">(Today's value)</span>
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                type="button"
                                onClick={() => setFrequency('weekly')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${frequency === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Weekly
                            </button>
                            <button 
                                type="button"
                                onClick={() => setFrequency('yearly')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${frequency === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Yearly
                            </button>
                        </div>
                     </div>

                     <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <DollarSign size={16} />
                        </div>
                        <input 
                            type="number" 
                            value={displayIncome}
                            onChange={(e) => handleIncomeInput(e.target.value)}
                            className="w-full input-base pl-10 text-lg font-bold text-slate-900"
                        />
                     </div>
                     <p className="text-xs text-slate-400 pl-1">
                         Equivalent to <strong>${details.living_expense_pa.toLocaleString()}/year</strong>.
                     </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        onClick={() => handleDetailChange('include_superannuation', !details.include_superannuation)}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3 h-full ${details.include_superannuation ? 'border-green-200 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className={`p-2 rounded-full shrink-0 ${details.include_superannuation ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Shield size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-900 text-sm">Include NZ Super</div>
                            <div className="text-xs text-slate-500 mt-1 leading-snug">Deduct ~$27k/yr (Govt pension).</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${details.include_superannuation ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                            {details.include_superannuation && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </div>

                    <div 
                        onClick={() => setInflationAdjust(!inflationAdjust)}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3 h-full ${inflationAdjust ? 'border-purple-200 bg-purple-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className={`p-2 rounded-full shrink-0 ${inflationAdjust ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                            <TrendingUp size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-900 text-sm">Adjust for Inflation</div>
                            <div className="text-xs text-slate-500 mt-1 leading-snug">Maintain purchasing power over time.</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${inflationAdjust ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                            {inflationAdjust && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-200">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                            <Calculator size={16} />
                            Required Nest Egg
                        </div>
                        <div className="text-4xl font-bold mb-1 tracking-tight">${calculatedTarget.toLocaleString()}</div>
                        <p className="text-sm text-slate-400 leading-relaxed mt-2">
                            To generate <strong>${adjustedIncome.toLocaleString()}/year</strong> passive income for <strong>{retirementDuration} years</strong>, 
                            we recommend <strong>{multiplier}x</strong> that amount invested.
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                </div>
            </div>
        </div>
    );
};

export default RetirementGoalForm;
