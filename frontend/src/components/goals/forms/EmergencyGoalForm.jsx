import React, { useState, useEffect, useRef } from 'react';
import { 
    Shield, 
    AlertCircle, 
    DollarSign, 
    Calculator,
    Calendar,
    ArrowUpRight
} from 'lucide-react';

const EmergencyGoalForm = ({ initialValues, onChange }) => {
    // 1. Local state initialized from parent
    const [details, setDetails] = useState({
        monthly_expenditure: initialValues?.goal_details?.monthly_expenditure || 4000,
        coverage_months: initialValues?.goal_details?.coverage_months || 3,
        is_locked: initialValues?.goal_details?.is_locked || false
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues?.goal_name || 'Emergency Fund',
        due_date: initialValues?.due_date || '',
        priority: initialValues?.priority || 'need'
    });

    // Refs to track previous values and prevent infinite loops
    const lastSentPayloadRef = useRef(null);
    const isInternalChangeRef = useRef(false);

    // Calculated Target Amount
    const calculatedTarget = details.monthly_expenditure * details.coverage_months;

    // SYNC: Incoming updates from AI (Copilot)
    useEffect(() => {
        if (!initialValues || isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        if (initialValues.goal_details) {
            setDetails(prev => ({
                ...prev,
                monthly_expenditure: initialValues.goal_details.monthly_expenditure ?? prev.monthly_expenditure,
                coverage_months: initialValues.goal_details.coverage_months ?? prev.coverage_months,
                is_locked: initialValues.goal_details.is_locked ?? prev.is_locked
            }));
        }
        if (initialValues.goal_name) {
            setMeta(prev => ({ ...prev, goal_name: initialValues.goal_name }));
        }
        if (initialValues.due_date) {
            setMeta(prev => ({ ...prev, due_date: initialValues.due_date }));
        }
        if (initialValues.priority) {
            setMeta(prev => ({ ...prev, priority: initialValues.priority }));
        }
    }, [initialValues]);

    // Reporting back to parent
    useEffect(() => {
        const payload = {
            goal_name: meta.goal_name,
            target_amount: calculatedTarget,
            due_date: meta.due_date,
            priority: meta.priority,
            goal_details: details
        };

        const payloadKey = JSON.stringify(payload);

        if (payloadKey !== lastSentPayloadRef.current) {
            lastSentPayloadRef.current = payloadKey;
            isInternalChangeRef.current = true;
            onChange(payload);
        }
    }, [details, meta, calculatedTarget, onChange]);

    const handleDetailChange = (key, value) => {
        setDetails(prev => ({ ...prev, [key]: value }));
    };

    const handleMetaChange = (key, value) => {
        setMeta(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Intro */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 rounded-3xl p-6 border border-amber-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Emergency Fund</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Your financial safety net. Experts recommend <strong>3-6 months</strong> of essential expenses.
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

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-700">Monthly Expenses</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={details.monthly_expenditure}
                                    onChange={(e) => handleDetailChange('monthly_expenditure', Number(e.target.value))}
                                    className="bg-slate-50 border-none rounded-xl py-2 pl-7 pr-4 text-right font-bold text-slate-900 w-32 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Include rent, groceries, utilities, and debt minimums.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between mb-4">
                            <span className="text-sm font-bold text-slate-700">Months of Coverage</span>
                            <span className="text-2xl font-black text-amber-600">{details.coverage_months}</span>
                        </div>
                        <input 
                            type="range" 
                            min={1} max={12} 
                            value={details.coverage_months}
                            onChange={(e) => handleDetailChange('coverage_months', Number(e.target.value))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                            <span>1 Month</span>
                            <span>3-6 (Ideal)</span>
                            <span>12 Months</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-200">
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                                <Calculator size={16} />
                                Safety Net Target
                            </div>
                            <div className="text-4xl font-black tracking-tight text-amber-400">
                                ${calculatedTarget.toLocaleString()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400 font-bold mb-1 uppercase">Priority</div>
                            <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-black uppercase">
                                {meta.priority}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Date to Complete Fund</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="date" 
                            value={meta.due_date ? new Date(meta.due_date).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleMetaChange('due_date', e.target.value)}
                            className="w-full input-base pl-10"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyGoalForm;

