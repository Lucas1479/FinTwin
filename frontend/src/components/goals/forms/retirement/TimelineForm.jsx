import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Briefcase } from 'lucide-react';

const TimelineForm = ({ initialValues, onSubmit, onChange }) => {
    const [formData, setFormData] = useState({
        current_age: initialValues.goal_details?.current_age || 30, // Should come from user profile ideally
        retirement_age: initialValues.goal_details?.retirement_age || 65,
        life_expectancy: initialValues.goal_details?.life_expectancy || 95,
        transition_phase: initialValues.goal_details?.transition_phase || false // Semi-retirement
    });

    // Propagate changes
    useEffect(() => {
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            }
        });
    }, [formData.retirement_age, formData.life_expectancy, formData.transition_phase]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(formData);
    };

    const yearsToSave = Math.max(0, formData.retirement_age - formData.current_age);
    const yearsInRetirement = Math.max(0, formData.life_expectancy - formData.retirement_age);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Visual Timeline Header */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between text-center">
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Accumulation</div>
                    <div className="text-xl font-bold text-indigo-600">{yearsToSave} <span className="text-xs text-slate-400">years</span></div>
                </div>
                <div className="h-8 w-[1px] bg-slate-300"></div>
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Retirement</div>
                    <div className="text-xl font-bold text-emerald-600">{yearsInRetirement} <span className="text-xs text-slate-400">years</span></div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Retirement Age Slider */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Clock size={16} className="text-indigo-500" />
                            Retire at Age
                        </label>
                        <span className="text-2xl font-bold text-slate-900">{formData.retirement_age}</span>
                    </div>
                    <input 
                        type="range"
                        min={50}
                        max={80}
                        step={1}
                        value={formData.retirement_age}
                        onChange={(e) => setFormData(prev => ({ ...prev, retirement_age: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                        <span>50 (Early)</span>
                        <span>65 (Standard)</span>
                        <span>80 (Late)</span>
                    </div>
                </div>

                {/* Life Expectancy Slider */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Calendar size={16} className="text-emerald-500" />
                            Plan Until Age
                        </label>
                        <span className="text-2xl font-bold text-slate-900">{formData.life_expectancy}</span>
                    </div>
                    <input 
                        type="range"
                        min={80}
                        max={110}
                        step={1}
                        value={formData.life_expectancy}
                        onChange={(e) => setFormData(prev => ({ ...prev, life_expectancy: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        💡 <strong>Advisor Tip:</strong> We recommend planning to age 95+ to minimize longevity risk (outliving your savings).
                    </p>
                </div>

                {/* Transition Phase Toggle */}
                <div 
                    onClick={() => setFormData(prev => ({ ...prev, transition_phase: !prev.transition_phase }))}
                    className={`cursor-pointer border rounded-2xl p-4 transition-all flex items-start gap-4 ${
                        formData.transition_phase ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <div className={`p-2 rounded-full shrink-0 ${formData.transition_phase ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Briefcase size={20} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900">Semi-Retirement Phase</div>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.transition_phase ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.transition_phase ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            I plan to work part-time for a few years after my official retirement age.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" className="btn-primary-rounded px-6 py-2.5">
                    Confirm Timeline
                </button>
            </div>
        </form>
    );
};

export default TimelineForm;
