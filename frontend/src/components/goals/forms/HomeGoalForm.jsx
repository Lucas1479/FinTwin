import React, { useState, useEffect } from 'react';
import { 
    Home, 
    MapPin, 
    DollarSign, 
    Percent, 
    Calculator,
    Info
} from 'lucide-react';
import LocationPickerModal from '../LocationPickerModal';

const HomeGoalForm = ({ initialValues, onChange }) => {
    // Local state
    const [details, setDetails] = useState({
        location: initialValues.goal_details?.location || '',
        coordinates: initialValues.goal_details?.coordinates || null,
        property_price_estimate: initialValues.goal_details?.property_price_estimate || 800000,
        deposit_percentage: initialValues.goal_details?.deposit_percentage || 20,
        is_first_home: initialValues.goal_details?.is_first_home ?? true
    });

    const [meta, setMeta] = useState({
        goal_name: initialValues.goal_name || 'My First Home',
        due_date: initialValues.due_date || ''
    });

    // Calculated derived value (Target Amount = Price * Deposit %)
    const targetAmount = Math.round(details.property_price_estimate * (details.deposit_percentage / 100));

    // Propagate changes up
    useEffect(() => {
        onChange({
            ...initialValues,
            goal_name: meta.goal_name,
            target_amount: targetAmount, // Auto-calculated!
            due_date: meta.due_date,
            goal_details: details
        });
    }, [details, meta, targetAmount]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDetailChange = (key, value) => {
        setDetails(prev => ({ ...prev, [key]: value }));
    };

    const handleMetaChange = (key, value) => {
        setMeta(prev => ({ ...prev, [key]: value }));
    };

    const handleLocationSelect = (loc) => {
        setDetails(prev => ({ 
            ...prev, 
            location: loc.name,
            coordinates: { lat: loc.lat, lng: loc.lng }
        }));
        setIsMapOpen(false);
    };

    return (
        <div className="space-y-8 animate-fade-in">
             {/* Header / Intro */}
             <div className="bg-gradient-to-br from-emerald-50 to-teal-100/50 rounded-3xl p-6 border border-emerald-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                        <Home size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Home Ownership</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Saving for a deposit. Based on a <strong>{details.deposit_percentage}%</strong> deposit 
                            on a <strong>${(details.property_price_estimate / 1000).toFixed(0)}k</strong> property.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                 {/* Name & Location */}
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
                        <label className="block text-sm font-bold text-slate-700 mb-2">Target Location</label>
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <MapPin size={16} />
                            </div>
                            <input 
                                type="text" 
                                value={details.location}
                                placeholder="e.g. Auckland Central"
                                onChange={(e) => handleDetailChange('location', e.target.value)}
                                className="w-full input-base pl-10"
                            />
                        </div>
                    </div>
                 </div>

                 {/* Price & Deposit Calculator Block */}
                 <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
                        <Calculator size={14} /> Calculator
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Property Price</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign size={16} />
                                </div>
                                <input 
                                    type="number" 
                                    step={10000}
                                    value={details.property_price_estimate}
                                    onChange={(e) => handleDetailChange('property_price_estimate', Number(e.target.value))}
                                    className="w-full input-base pl-10 text-lg font-bold text-slate-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Deposit %</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 rounded">{details.deposit_percentage}%</span>
                            </label>
                            <input 
                                type="range" 
                                min={5} max={50} step={5}
                                value={details.deposit_percentage}
                                onChange={(e) => handleDetailChange('deposit_percentage', Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2">
                                <span>5%</span>
                                <span>20%</span>
                                <span>50%</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500">Required Deposit Target</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            ${targetAmount.toLocaleString()}
                        </span>
                    </div>
                 </div>

                 {/* First Home Buyer Toggle */}
                 <div 
                        onClick={() => handleDetailChange('is_first_home', !details.is_first_home)}
                        className={`
                            border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3
                            ${details.is_first_home ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 hover:border-slate-300'}
                        `}
                    >
                        <div className={`p-2 rounded-full ${details.is_first_home ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Info size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">First Home Buyer</div>
                            <div className="text-xs text-slate-500 mt-1 leading-snug">
                                Enable to check eligibility for First Home Grants (up to $10k).
                            </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border ml-auto flex items-center justify-center ${details.is_first_home ? 'bg-sky-500 border-sky-500' : 'border-slate-300'}`}>
                            {details.is_first_home && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </div>

                 {/* Date */}
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Target Purchase Date</label>
                    <input 
                        type="date" 
                        value={meta.due_date ? new Date(meta.due_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleMetaChange('due_date', e.target.value)}
                        className="w-full input-base"
                    />
                </div>
            </div>

            {/* Location Picker Inline */}
            <LocationPickerModal 
                onSelect={handleLocationSelect}
                initialLocation={details.coordinates}
            />
        </div>
    );
};

export default HomeGoalForm;

