import React, { useState, useEffect } from 'react';
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
    Crown
} from 'lucide-react';
import LocationPickerModal from '../../LocationPickerModal';

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

    // Sync with initialValues
    useEffect(() => {
        if (initialValues.goal_details || initialValues.goal_name) {
            setFormData(prev => {
                // Only update if external values are different from current state
                // This prevents the slider loop issue
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

                // Simple shallow comparison for primitives to avoid loop
                if (
                    newVal.goal_name === prev.goal_name &&
                    newVal.location === prev.location &&
                    newVal.property_price_estimate === prev.property_price_estimate &&
                    newVal.deposit_percentage === prev.deposit_percentage &&
                    newVal.is_first_home === prev.is_first_home &&
                    newVal.property_type === prev.property_type &&
                    newVal.property_condition === prev.property_condition &&
                    newVal.due_date === prev.due_date
                ) {
                    return prev;
                }

                return newVal;
            });
        }
    }, [initialValues]);

    // Derived State
    const targetDeposit = Math.round(formData.property_price_estimate * (formData.deposit_percentage / 100));

    // Propagate changes
    useEffect(() => {
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
    }, [formData]);

    const handleLocationSelect = (loc) => {
        setFormData(prev => ({ 
            ...prev, 
            location: loc.name,
            coordinates: { lat: loc.lat, lng: loc.lng }
        }));
        setIsMapOpen(false);
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

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubstageSubmit(formData); }} className="space-y-8 animate-fade-in">
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
                        <div className="relative group cursor-pointer" onClick={() => setIsMapOpen(true)}>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors">
                                <MapPin size={18} />
                            </div>
                            <input 
                                type="text" 
                                readOnly
                                value={formData.location}
                                className="w-full input-base pl-10 cursor-pointer hover:border-emerald-300 transition-colors"
                            />
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
                                    value={formData.property_price_estimate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, property_price_estimate: Number(e.target.value) }))}
                                    className="w-full input-base pl-10 text-lg font-bold text-slate-900"
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
                            value={formData.due_date ? new Date(formData.due_date).toISOString().split('T')[0] : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                            className="w-full input-base"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary-rounded px-8 py-3 shadow-lg shadow-brand-200">
                    Save & Continue
                </button>
            </div>

            <LocationPickerModal 
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleLocationSelect}
                initialLocation={formData.coordinates}
            />
        </form>
    );
};

export default HomeVisionForm;