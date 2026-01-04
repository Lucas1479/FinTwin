import React, { useState, useEffect, useRef } from 'react';
import { 
    Car, 
    DollarSign, 
    Calendar,
    Tag,
    ChevronRight,
    Calculator
} from 'lucide-react';

const VehicleGoalForm = ({ initialValues, onChange }) => {
    const [details, setDetails] = useState({
        vehicle_type: initialValues?.goal_details?.vehicle_type || 'SUV',
        trade_in_value: initialValues?.goal_details?.trade_in_value || 0,
        finance_required: initialValues?.goal_details?.finance_required || false
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues?.goal_name || 'New Car',
        target_amount: initialValues?.target_amount || 30000,
        due_date: initialValues?.due_date || ''
    });

    const lastSentPayloadRef = useRef(null);
    const isInternalChangeRef = useRef(false);

    const netTarget = Math.max(0, meta.target_amount - details.trade_in_value);

    useEffect(() => {
        if (!initialValues || isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        if (initialValues.goal_details) {
            setDetails(prev => ({
                ...prev,
                vehicle_type: initialValues.goal_details.vehicle_type ?? prev.vehicle_type,
                trade_in_value: initialValues.goal_details.trade_in_value ?? prev.trade_in_value,
                finance_required: initialValues.goal_details.finance_required ?? prev.finance_required
            }));
        }
        if (initialValues.goal_name) setMeta(prev => ({ ...prev, goal_name: initialValues.goal_name }));
        if (initialValues.target_amount) setMeta(prev => ({ ...prev, target_amount: initialValues.target_amount }));
        if (initialValues.due_date) setMeta(prev => ({ ...prev, due_date: initialValues.due_date }));
    }, [initialValues]);

    useEffect(() => {
        const payload = {
            goal_name: meta.goal_name,
            target_amount: meta.target_amount,
            due_date: meta.due_date,
            goal_details: {
                ...details,
                net_savings_required: netTarget
            }
        };

        const payloadKey = JSON.stringify(payload);

        if (payloadKey !== lastSentPayloadRef.current) {
            lastSentPayloadRef.current = payloadKey;
            isInternalChangeRef.current = true;
            onChange(payload);
        }
    }, [details, meta, netTarget, onChange]);

    const handleDetailChange = (key, value) => setDetails(prev => ({ ...prev, [key]: value }));
    const handleMetaChange = (key, value) => setMeta(prev => ({ ...prev, [key]: value }));

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100/50 rounded-3xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                        <Car size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Vehicle Purchase</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Saving for your next set of wheels.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={meta.goal_name}
                            onChange={(e) => handleMetaChange('goal_name', e.target.value)}
                            className="w-full input-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Type</label>
                        <select 
                            value={details.vehicle_type}
                            onChange={(e) => handleDetailChange('vehicle_type', e.target.value)}
                            className="w-full input-base"
                        >
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="EV / Hybrid">EV / Hybrid</option>
                            <option value="Motorcycle">Motorcycle</option>
                            <option value="Boat">Boat</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Estimated Price</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    value={meta.target_amount}
                                    onChange={(e) => handleMetaChange('target_amount', Number(e.target.value))}
                                    className="w-full input-base pl-10 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Trade-in / Deposit</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Tag size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    value={details.trade_in_value}
                                    onChange={(e) => handleDetailChange('trade_in_value', Number(e.target.value))}
                                    className="w-full input-base pl-10 font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 flex justify-between items-center">
                        <div>
                            <span className="text-sm font-bold text-slate-500 block uppercase tracking-wider">Savings Required</span>
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                ${netTarget.toLocaleString()}
                            </span>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-slate-400 block font-bold">Estimated Net Cost</span>
                             <span className="text-sm font-bold text-blue-600 flex items-center gap-1 justify-end">
                                <Calculator size={14} /> ${meta.target_amount.toLocaleString()} base
                             </span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Purchase Date</label>
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

export default VehicleGoalForm;

