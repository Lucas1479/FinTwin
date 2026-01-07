import React, { useState, useEffect } from 'react';
import { MapPin, Coffee, Utensils, Plane, DollarSign } from 'lucide-react';

const VisionForm = ({ initialValues, onSubmit, onChange }) => {
    const [formData, setFormData] = useState({
        location: initialValues.goal_details?.location || 'Auckland',
        lifestyle_tier: initialValues.goal_details?.lifestyle_tier || 'comfortable', // no_frills, comfortable, luxury
        lumpy_expenses: initialValues.goal_details?.lumpy_expenses || [], // e.g. ['travel_biannual', 'new_car_5y']
        living_expense_pa: initialValues.goal_details?.living_expense_pa || 60000
    });

    const LIFESTYLES = {
        no_frills: {
            label: 'No Frills',
            desc: 'Basic essentials. Home cooking, local trips, limited dining out.',
            baseCost: { 'Auckland': 45000, 'Regional': 35000 },
            icon: Coffee
        },
        comfortable: {
            label: 'Comfortable',
            desc: 'Good standard. Health insurance, domestic travel, regular dining.',
            baseCost: { 'Auckland': 60000, 'Regional': 50000 },
            icon: Utensils
        },
        luxury: {
            label: 'Luxury',
            desc: 'High end. International travel, new cars, premium healthcare.',
            baseCost: { 'Auckland': 90000, 'Regional': 75000 },
            icon: Plane
        }
    };

    // Auto-calculate expense when tier/location changes
    useEffect(() => {
        const tier = LIFESTYLES[formData.lifestyle_tier];
        const base = tier.baseCost[formData.location === 'Auckland' ? 'Auckland' : 'Regional'] || tier.baseCost['Regional'];
        
        // Add lumpy expenses buffer (simplified estimation)
        let lumpyAddon = 0;
        if (formData.lumpy_expenses.includes('travel_biannual')) lumpyAddon += 5000;
        if (formData.lumpy_expenses.includes('new_car_5y')) lumpyAddon += 4000;

        const calculated = base + lumpyAddon;
        
        // Only update if significantly different to avoid overriding user manual edits too aggressively
        // But for this stage, we want to guide them, so we update unless user explicitly locked it?
        // For now, we update state, user can override the number field.
        setFormData(prev => ({ ...prev, living_expense_pa: calculated }));
        
        // Propagate to parent context
        onChange?.({
            goal_details: {
                ...initialValues.goal_details,
                location: formData.location,
                lifestyle_tier: formData.lifestyle_tier,
                lumpy_expenses: formData.lumpy_expenses,
                living_expense_pa: calculated
            }
        });

    }, [formData.lifestyle_tier, formData.location, formData.lumpy_expenses.length]);

    const handleLumpyToggle = (id) => {
        setFormData(prev => {
            const exists = prev.lumpy_expenses.includes(id);
            return {
                ...prev,
                lumpy_expenses: exists 
                    ? prev.lumpy_expenses.filter(x => x !== id)
                    : [...prev.lumpy_expenses, id]
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Where will you retire?</label>
                <div className="grid grid-cols-2 gap-3">
                    {['Auckland', 'Regional NZ'].map(loc => (
                        <button
                            key={loc}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, location: loc === 'Auckland' ? 'Auckland' : 'Regional' }))}
                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                                (formData.location === 'Auckland' && loc === 'Auckland') || (formData.location !== 'Auckland' && loc !== 'Auckland')
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <MapPin size={18} />
                            <span className="font-bold text-sm">{loc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lifestyle Standard</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(LIFESTYLES).map(([key, config]) => {
                        const Icon = config.icon;
                        const isSelected = formData.lifestyle_tier === key;
                        return (
                            <div 
                                key={key}
                                onClick={() => setFormData(prev => ({ ...prev, lifestyle_tier: key }))}
                                className={`cursor-pointer border rounded-xl p-4 transition-all hover:shadow-md ${
                                    isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${
                                    isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <Icon size={16} />
                                </div>
                                <div className="font-bold text-slate-900 text-sm mb-1">{config.label}</div>
                                <div className="text-xs text-slate-500 leading-snug">{config.desc}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regular Big Ticket Items</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => handleLumpyToggle('travel_biannual')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            formData.lumpy_expenses.includes('travel_biannual') 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                    >
                        ✈️ Int'l Travel (Every 2yrs)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleLumpyToggle('new_car_5y')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            formData.lumpy_expenses.includes('new_car_5y') 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                    >
                        🚗 New Car (Every 5yrs)
                    </button>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Estimated Annual Expense</label>
                    <span className="text-xs text-slate-400">Today's Dollar Value</span>
                </div>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <DollarSign size={18} />
                    </div>
                    <input 
                        type="number"
                        value={formData.living_expense_pa}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData(prev => ({ ...prev, living_expense_pa: val }));
                            onChange?.({ goal_details: { ...initialValues.goal_details, living_expense_pa: val } });
                        }}
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" className="btn-primary-rounded px-6 py-2.5">
                    Confirm Vision
                </button>
            </div>
        </form>
    );
};

export default VisionForm;
