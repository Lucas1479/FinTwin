import { useState } from 'react';

/**
 * GapAnalysisForm - Gap Analysis Form
 * 
 * Used to collect user's current financial state data: income, assets, debts, policy constraints.
 * 
 * @param {Object} initialValues - Initial values object
 * @param {Function} onSubmit - Submit callback function
 * @param {Function} onCancel - Cancel callback function
 */
export const GapAnalysisForm = ({ initialValues = {}, onSubmit, onCancel }) => {
    const [form, setForm] = useState(() => ({
        monthly_income: '',
        liquid_assets: '',
        investments: '',
        debts: '',
        region_policy: '',
        ...initialValues
    }));

    const updateField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Monthly Income
                    </label>
                    <input
                        type="number"
                        value={form.monthly_income}
                        onChange={(e) => updateField('monthly_income', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="e.g., 12000"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Liquid Assets
                    </label>
                    <input
                        type="number"
                        value={form.liquid_assets}
                        onChange={(e) => updateField('liquid_assets', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Cash / short-term holdings"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Investments
                    </label>
                    <input
                        type="number"
                        value={form.investments}
                        onChange={(e) => updateField('investments', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Funds / stocks / pension"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Debt / Loans
                    </label>
                    <input
                        type="number"
                        value={form.debts}
                        onChange={(e) => updateField('debts', e.target.value)}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        placeholder="Mortgage / auto / credit"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Policy / Tax Constraints
                </label>
                <textarea
                    value={form.region_policy}
                    onChange={(e) => updateField('region_policy', e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    rows={3}
                    placeholder="Region, tax benefits, regulatory constraints"
                />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm font-bold text-slate-500 hover:text-slate-700"
                    >
                        Back to edit
                    </button>
                )}
                <button
                    type="submit"
                    className="btn-primary-rounded px-5 py-2 text-sm"
                >
                    Save & review
                </button>
            </div>
        </form>
    );
};

export default GapAnalysisForm;
