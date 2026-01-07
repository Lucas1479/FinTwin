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

const HomeGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery', substageData = {}, onSubstageSubmit }) => {
    // --- Discovery state (unchanged) ---
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

    // --- GAP substage state ---
    const [gapForm, setGapForm] = useState(() => ({
        monthly_income: '',
        liquid_assets: '',
        investments: '',
        debts: '',
        region_policy: '',
        property_price_estimate: 800000,
        deposit_percentage: 20,
        is_first_home: true,
        ...substageData
    }));

    // --- Assumptions substage state ---
    const [assumptionForm, setAssumptionForm] = useState(() => ({
        expected_return_pct: 6,
        inflation_pct: 2.5,
        risk_attitude: 'balanced',
        cashflow_flexibility: 'medium',
        mortgage_rate_pct: 6,
        loan_term_years: 30,
        ...substageData
    }));

    useEffect(() => {
        // Sync substage data when active substage switches or new data arrives
        if (activeSubstage === 'gap_analysis') {
            setGapForm(prev => ({ ...prev, ...substageData }));
        }
        if (activeSubstage === 'assumptions') {
            setAssumptionForm(prev => ({ ...prev, ...substageData }));
        }
    }, [activeSubstage, substageData]);

    // Calculated derived value (Target Amount = Price * Deposit %)
    const targetAmount = Math.round(details.property_price_estimate * (details.deposit_percentage / 100));

    // Propagate changes up (goal_discovery only)
    useEffect(() => {
        if (activeSubstage !== 'goal_discovery') return;
        onChange?.({
            ...initialValues,
            goal_name: meta.goal_name,
            target_amount: targetAmount, // Auto-calculated!
            due_date: meta.due_date,
            goal_details: details
        });
    }, [details, meta, targetAmount, activeSubstage]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // --- GAP UI ---
    if (activeSubstage === 'gap_analysis') {
        const updateGap = (k, v) => setGapForm(prev => ({ ...prev, [k]: v }));
        const handleSubmit = (e) => { e.preventDefault(); onSubstageSubmit?.(gapForm); };
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Income</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.monthly_income} onChange={(e) => updateGap('monthly_income', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Liquid Assets</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.liquid_assets} onChange={(e) => updateGap('liquid_assets', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Investments</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.investments} onChange={(e) => updateGap('investments', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Debt / Loans</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.debts} onChange={(e) => updateGap('debts', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Property Price ($)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.property_price_estimate} onChange={(e) => updateGap('property_price_estimate', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deposit Target (%)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={gapForm.deposit_percentage} onChange={(e) => updateGap('deposit_percentage', Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={gapForm.is_first_home} onChange={(e) => updateGap('is_first_home', e.target.checked)} />
                        <span className="text-sm text-slate-700">First Home Buyer?</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Policy / Tax Constraints</label>
                    <textarea className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        rows={3} value={gapForm.region_policy} onChange={(e) => updateGap('region_policy', e.target.value)} />
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button type="submit" className="btn-primary-rounded px-5 py-2 text-sm">Save & review</button>
                </div>
            </form>
        );
    }

    // --- Assumptions UI ---
    if (activeSubstage === 'assumptions') {
        const updateAssume = (k, v) => setAssumptionForm(prev => ({ ...prev, [k]: v }));
        const handleSubmit = (e) => { e.preventDefault(); onSubstageSubmit?.(assumptionForm); };
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Return (%)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={assumptionForm.expected_return_pct} onChange={(e) => updateAssume('expected_return_pct', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inflation (%)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={assumptionForm.inflation_pct} onChange={(e) => updateAssume('inflation_pct', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mortgage Rate (%)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={assumptionForm.mortgage_rate_pct} onChange={(e) => updateAssume('mortgage_rate_pct', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loan Term (Years)</label>
                        <input className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            type="number" value={assumptionForm.loan_term_years} onChange={(e) => updateAssume('loan_term_years', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Attitude</label>
                        <select className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            value={assumptionForm.risk_attitude} onChange={(e) => updateAssume('risk_attitude', e.target.value)}>
                            <option value="conservative">Conservative</option>
                            <option value="balanced">Balanced</option>
                            <option value="growth">Growth</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cashflow Flexibility</label>
                        <select className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                            value={assumptionForm.cashflow_flexibility} onChange={(e) => updateAssume('cashflow_flexibility', e.target.value)}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button type="submit" className="btn-primary-rounded px-5 py-2 text-sm">Save & review</button>
                </div>
            </form>
        );
    }

    // --- Discovery UI (default) ---
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

