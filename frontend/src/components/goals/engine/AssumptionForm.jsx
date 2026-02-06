import { useState } from 'react';

/**
 * AssumptionForm - Financial Assumption Form
 * 
 * Used to set investment assumptions: expected return, inflation rate, risk attitude, cash flow flexibility.
 * 
 * @param {Object} initialValues - Initial values object
 * @param {Function} onSubmit - Submit callback function
 * @param {Function} onCancel - Cancel callback function
 */
export const AssumptionForm = ({ initialValues = {}, onSubmit, onCancel }) => {
    const [form, setForm] = useState(() => ({
        expected_return_pct: initialValues.expected_return_pct || 6,
        inflation_pct: initialValues.inflation_pct || 2.5,
        risk_attitude: initialValues.risk_attitude || 'balanced',
        cashflow_flexibility: initialValues.cashflow_flexibility || 'medium',
        ...initialValues
    }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Expected Return (%)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.expected_return_pct}
                        onChange={(e) => setForm(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Inflation (%)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.inflation_pct}
                        onChange={(e) => setForm(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Risk Attitude
                    </label>
                    <select
                        value={form.risk_attitude}
                        onChange={(e) => setForm(prev => ({ ...prev, risk_attitude: e.target.value }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="growth">Growth</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Cashflow Flexibility
                    </label>
                    <select
                        value={form.cashflow_flexibility}
                        onChange={(e) => setForm(prev => ({ ...prev, cashflow_flexibility: e.target.value }))}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
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

export default AssumptionForm;
