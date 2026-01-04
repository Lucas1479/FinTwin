import React, { useState, useEffect, useRef } from 'react';
import { 
    GraduationCap, 
    Calendar, 
    Users, 
    Clock, 
    School,
    DollarSign
} from 'lucide-react';

const EducationGoalForm = ({ initialValues, onChange }) => {
    // 1. Local state
    const [details, setDetails] = useState({
        student_name: initialValues?.goal_details?.student_name || '',
        start_year: initialValues?.goal_details?.start_year || new Date().getFullYear() + 1,
        duration_years: initialValues?.goal_details?.duration_years || 3,
        institution_type: initialValues?.goal_details?.institution_type || 'University'
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues?.goal_name || 'Education Fund',
        target_amount: initialValues?.target_amount || 50000,
        due_date: initialValues?.due_date || ''
    });

    const lastSentPayloadRef = useRef(null);
    const isInternalChangeRef = useRef(false);

    // SYNC: Incoming updates from AI
    useEffect(() => {
        if (!initialValues || isInternalChangeRef.current) {
            isInternalChangeRef.current = false;
            return;
        }

        if (initialValues.goal_details) {
            setDetails(prev => ({
                ...prev,
                student_name: initialValues.goal_details.student_name ?? prev.student_name,
                start_year: initialValues.goal_details.start_year ?? prev.start_year,
                duration_years: initialValues.goal_details.duration_years ?? prev.duration_years,
                institution_type: initialValues.goal_details.institution_type ?? prev.institution_type
            }));
        }
        if (initialValues.goal_name) setMeta(prev => ({ ...prev, goal_name: initialValues.goal_name }));
        if (initialValues.target_amount) setMeta(prev => ({ ...prev, target_amount: initialValues.target_amount }));
        if (initialValues.due_date) setMeta(prev => ({ ...prev, due_date: initialValues.due_date }));
    }, [initialValues]);

    // Reporting back to parent
    useEffect(() => {
        const payload = {
            goal_name: meta.goal_name,
            target_amount: meta.target_amount,
            due_date: meta.due_date,
            goal_details: details
        };

        const payloadKey = JSON.stringify(payload);

        if (payloadKey !== lastSentPayloadRef.current) {
            lastSentPayloadRef.current = payloadKey;
            isInternalChangeRef.current = true;
            onChange(payload);
        }
    }, [details, meta, onChange]);

    // Auto-update Due Date based on Start Year
    useEffect(() => {
        const newDate = `${details.start_year}-02-01`; // Typically starts in Feb in NZ
        if (meta.due_date !== newDate) {
            setMeta(prev => ({ ...prev, due_date: newDate }));
        }
    }, [details.start_year]);

    const handleDetailChange = (key, value) => setDetails(prev => ({ ...prev, [key]: value }));
    const handleMetaChange = (key, value) => setMeta(prev => ({ ...prev, [key]: value }));

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-violet-50 to-purple-100/50 rounded-3xl p-6 border border-violet-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Education Planning</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Saving for tuition, living costs, and a bright future.
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">Student Name</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Users size={16} />
                            </div>
                            <input 
                                type="text" 
                                value={details.student_name}
                                placeholder="e.g. Self or Child Name"
                                onChange={(e) => handleDetailChange('student_name', e.target.value)}
                                className="w-full input-base pl-10"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Total Savings Goal ($)</label>
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">Start Year</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Calendar size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    min={new Date().getFullYear()}
                                    value={details.start_year}
                                    onChange={(e) => handleDetailChange('start_year', Number(e.target.value))}
                                    className="w-full input-base pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-slate-700">Course Duration (Years)</label>
                                <span className="text-2xl font-black text-violet-600">{details.duration_years}</span>
                            </div>
                            <input 
                                type="range" 
                                min={1} max={7} 
                                value={details.duration_years}
                                onChange={(e) => handleDetailChange('duration_years', Number(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Institution Type</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <School size={16} />
                                </div>
                                <select 
                                    value={details.institution_type}
                                    onChange={(e) => handleDetailChange('institution_type', e.target.value)}
                                    className="w-full input-base pl-10"
                                >
                                    <option value="University">University</option>
                                    <option value="Polytech">Polytech</option>
                                    <option value="Private">Private Provider</option>
                                    <option value="School">School / College</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <Clock className="text-blue-500 shrink-0" size={18} />
                    <div className="text-xs text-blue-700 leading-relaxed">
                        Educational costs in New Zealand increase by approx. 2-3% annually. Your goal will be adjusted for inflation during strategy simulation.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EducationGoalForm;

