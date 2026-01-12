import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Clock, 
    Heart, 
    DollarSign, 
    Shield, 
    AlertCircle,
    Calculator,
    TrendingUp,
    Calendar,
    MapPin,
    Plane,
    Sun,
    Snowflake,
    Palmtree,
    Mountain,
    Globe,
    Briefcase,
    Brain,
    CheckCircle2,
    Check
} from 'lucide-react';

// --- STAGE 1: VISION (Destination & Style) ---
const GoalVisionForm = ({ initialValues, onChange, onSubstageSubmit, needsRecompute }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Dream Holiday',
        priority: initialValues.priority || 'want',
        destination: initialValues.goal_details?.destination || 'Europe',
        travel_style: initialValues.goal_details?.travel_style || 'comfort', // budget, comfort, luxury
        travelers_count: initialValues.goal_details?.travelers_count || 2,
        duration_days: initialValues.goal_details?.duration_days || 14,
        season: initialValues.goal_details?.season || 'shoulder', // peak, shoulder, off
        estimated_cost: initialValues.goal_details?.estimated_cost || 15000,
        notes: initialValues.goal_details?.notes || ''
    });

    const DESTINATIONS = {
        Europe: { label: 'Europe', icon: '🏰', baseDay: 400 },
        USA: { label: 'USA', icon: '🗽', baseDay: 450 },
        Asia: { label: 'Asia', icon: '🍜', baseDay: 200 },
        Pacific: { label: 'Pacific Islands', icon: '🏝️', baseDay: 300 },
        SouthAmerica: { label: 'South America', icon: '🦙', baseDay: 250 }
    };

    const STYLES = {
        budget: { label: 'Budget', mult: 0.7, desc: 'Hostels & Street Food' },
        comfort: { label: 'Comfort', mult: 1.0, desc: 'Hotels & Dining' },
        luxury: { label: 'Luxury', mult: 2.5, desc: '5-Star & Fine Dining' }
    };

    const SEASONS = {
        peak: { label: 'Peak Season', mult: 1.3, icon: Sun },
        shoulder: { label: 'Shoulder', mult: 1.0, icon: Palmtree },
        off: { label: 'Off Peak', mult: 0.8, icon: Snowflake }
    };

    // Auto-calculate Cost
    useEffect(() => {
        const destBase = DESTINATIONS[formData.destination]?.baseDay || 300;
        const styleMult = STYLES[formData.travel_style]?.mult || 1;
        const seasonMult = SEASONS[formData.season]?.mult || 1;
        
        // Formula: (Base * Style * Season * Days * People) + Flights
        // Flight approx: Europe/USA $2500, Asia $1500, Pacific $800
        let flightCost = 1500;
        if (['Europe', 'USA', 'SouthAmerica'].includes(formData.destination)) flightCost = 2500;
        if (formData.destination === 'Pacific') flightCost = 800;

        const dailyTotal = destBase * styleMult * seasonMult;
        const groundTotal = dailyTotal * formData.duration_days * formData.travelers_count;
        const flightsTotal = flightCost * formData.travelers_count;
        
        const total = Math.round(groundTotal + flightsTotal);

        setFormData(prev => {
            if (prev.estimated_cost === total) return prev;
            return { ...prev, estimated_cost: total };
        });

        onChange?.({
            goal_name: formData.goal_name,
            priority: formData.priority,
            goal_details: {
                ...initialValues.goal_details,
                ...formData,
                estimated_cost: total
            }
        });
    }, [formData.destination, formData.travel_style, formData.travelers_count, formData.duration_days, formData.season]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-sky-50 to-blue-100/50 rounded-3xl p-6 border border-sky-100 relative overflow-hidden">
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-600">
                        <Plane size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">Plan Your Trip</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Where are you heading? We'll help estimate the cost based on destination and season.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                        <input 
                            type="text" 
                            value={formData.goal_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                            className="w-full input-base"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Destination</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(DESTINATIONS).map(([key, data]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, destination: key }))}
                                    className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                        formData.destination === key
                                        ? 'bg-sky-500 text-white border-sky-600 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="mr-2">{data.icon}</span>{data.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Travelers</label>
                            <input 
                                type="number" min={1} max={10}
                                value={formData.travelers_count}
                                onChange={(e) => setFormData(prev => ({ ...prev, travelers_count: Number(e.target.value) }))}
                                className="w-full input-base"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Duration (Days)</label>
                            <input 
                                type="number" min={3} max={90}
                                value={formData.duration_days}
                                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: Number(e.target.value) }))}
                                className="w-full input-base"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Season</label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            {Object.entries(SEASONS).map(([key, data]) => {
                                const Icon = data.icon;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, season: key }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                            formData.season === key
                                            ? 'bg-white text-sky-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Icon size={14} /> {data.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Estimate Card */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Estimated Budget</div>
                        <div className="text-4xl font-black text-slate-900 mb-2">
                            ${(formData.estimated_cost / 1000).toFixed(1)}k
                        </div>
                        <div className="text-sm text-slate-500 mb-6">
                            Total for {formData.travelers_count} people, {formData.duration_days} days
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Travel Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(STYLES).map(([key, data]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, travel_style: key }))}
                                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                                formData.travel_style === key
                                                ? 'border-sky-500 bg-sky-50 text-sky-700'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {data.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Next: Timeline
                </button>
            </div>
        </div>
    );
};

// --- STAGE 2: PARAMETERS (Timeline & FX) ---
const PlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [formData, setFormData] = useState({
        target_date: initialValues.due_date ? new Date(initialValues.due_date).toISOString().split('T')[0] : '',
        fx_buffer_pct: initialValues.goal_details?.fx_buffer_pct || 5,
        inflation_pct: initialValues.goal_details?.inflation_pct || 3.0
    });

    useEffect(() => {
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                ...formData
            },
            due_date: formData.target_date
        });
    }, [formData]);

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-gradient-to-br from-sky-50 to-blue-100/50 rounded-3xl p-6 border border-sky-100">
                <div className="flex items-center gap-4">
                    <Calendar className="text-sky-600" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">When are you going?</h3>
                        <p className="text-sm text-slate-600">Set a target date and add a buffer for exchange rates.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Departure Date</label>
                    <input 
                        type="date"
                        value={formData.target_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                        className="w-full input-base"
                    />
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                            <span>FX Buffer (Exchange Rate Risk)</span>
                            <span>{formData.fx_buffer_pct}%</span>
                        </div>
                        <input 
                            type="range" min={0} max={15} step={1}
                            value={formData.fx_buffer_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, fx_buffer_pct: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                            <span>Travel Inflation</span>
                            <span>{formData.inflation_pct}%</span>
                        </div>
                        <input 
                            type="range" min={0} max={10} step={0.1}
                            value={formData.inflation_pct}
                            onChange={(e) => setFormData(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit(formData)}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Confirm Parameters
                </button>
            </div>
        </div>
    );
};

// --- STAGE 3: GAP ---
const GapFeasibilityForm = ({ initialValues, onSubstageSubmit }) => {
    const required = initialValues.goal_details?.estimated_cost || 10000;
    const current = initialValues.goal_details?.saved_amount || 0;
    const gap = Math.max(0, required - current);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Funding Gap</div>
                <div className={`text-5xl font-black mb-4 ${gap > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ${(gap / 1000).toFixed(1)}k
                </div>
                <p className="text-slate-600 max-w-md mx-auto">
                    {gap > 0 
                        ? "You need to save this amount before your trip. We'll build a savings plan next." 
                        : "You're fully funded! Enjoy your trip!"}
                </p>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => onSubstageSubmit({ target_amount: required })}
                    className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200"
                >
                    Generate Strategy
                </button>
            </div>
        </div>
    );
};

const TravelGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit, needsRecompute = false }) => {
    if (activeSubstage === 'goal_discovery') {
        return <GoalVisionForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} needsRecompute={needsRecompute} />;
    }
    if (activeSubstage === 'assumptions') {
        return <PlanningParametersForm initialValues={initialValues} onChange={onChange} onSubstageSubmit={onSubstageSubmit} />;
    }
    if (activeSubstage === 'gap_analysis') {
        return <GapFeasibilityForm initialValues={initialValues} onSubstageSubmit={onSubstageSubmit} />;
    }
    return <div>Unknown Substage</div>;
};

export default TravelGoalForm;