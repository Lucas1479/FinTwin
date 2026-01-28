import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    ShoppingBag, 
    Heart, 
    Music, 
    Palette, 
    Watch, 
    Gift,
    Calendar, 
    DollarSign, 
    Target,
    TrendingUp,
    Wallet,
    AlertCircle,
    CheckCircle2,
    Percent,
    Calculator,
    CreditCard,
    ArrowUpCircle
} from 'lucide-react';

// ============================================
// STAGE 1: Goal & Vision (goal_discovery)
// ============================================
const GoalVisionForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Major Purchase',
        priority: initialValues.priority || 'want',
        purchase_category: initialValues.goal_details?.purchase_category || 'luxury_item',
        target_amount: initialValues.target_amount || 10000,
        due_date: initialValues.due_date ? new Date(initialValues.due_date).toISOString().split('T')[0] : '',
        description: initialValues.goal_details?.description || '',
        is_appreciating_asset: initialValues.goal_details?.is_appreciating_asset || false,
        expected_appreciation_rate: initialValues.goal_details?.expected_appreciation_rate || 0
    });

    // Sync to parent
    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_name: formData.goal_name,
            priority: formData.priority,
            target_amount: formData.target_amount,
            due_date: formData.due_date,
            goal_details: {
                purchase_category: formData.purchase_category,
                description: formData.description,
                is_appreciating_asset: formData.is_appreciating_asset,
                expected_appreciation_rate: formData.expected_appreciation_rate
            }
        });
    }, [
        formData.goal_name, 
        formData.priority, 
        formData.target_amount, 
        formData.due_date, 
        formData.purchase_category,
        formData.description,
        formData.is_appreciating_asset,
        formData.expected_appreciation_rate,
        onChange
    ]);

    const PURCHASE_CATEGORIES = [
        { id: 'wedding', label: 'Wedding', icon: Heart, desc: 'Ceremony & reception' },
        { id: 'luxury_item', label: 'Luxury Item', icon: ShoppingBag, desc: 'Designer goods, jewelry' },
        { id: 'instrument', label: 'Musical Instrument', icon: Music, desc: 'Piano, guitar, etc.' },
        { id: 'art', label: 'Art & Collectibles', icon: Palette, desc: 'Paintings, sculptures' },
        { id: 'watch', label: 'Timepiece', icon: Watch, desc: 'Luxury watches' },
        { id: 'event', label: 'Special Event', icon: Gift, desc: 'Birthday, anniversary' },
        { id: 'other', label: 'Other', icon: ShoppingBag, desc: 'Custom purchase' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-purple-50 to-pink-100/50 rounded-3xl p-6 border border-purple-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-purple-600">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Major Purchase Planning</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Define your purchase goal, budget, and timeline.
                        </p>
                    </div>
                </div>
            </div>

            {/* Goal Name & Priority */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Goal Name</label>
                <input
                    type="text"
                    value={formData.goal_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="e.g., Wedding, Luxury Watch, Musical Instrument"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
                <div className="flex gap-3">
                    {['need', 'want', 'wish'].map((level) => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, priority: level }))}
                            className={`flex-1 px-4 py-3 rounded-xl font-bold transition-colors ${
                                formData.priority === level
                                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                                    : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Purchase Category */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Purchase Category</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PURCHASE_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, purchase_category: cat.id }))}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    formData.purchase_category === cat.id
                                        ? 'bg-purple-50 border-purple-300 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-purple-200'
                                }`}
                            >
                                <Icon size={20} className={formData.purchase_category === cat.id ? 'text-purple-600' : 'text-slate-400'} />
                                <div className="mt-2">
                                    <div className="font-bold text-sm text-slate-900">{cat.label}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{cat.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Budget & Timeline */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        Target Amount
                    </label>
                    <input
                        type="number"
                        value={formData.target_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_amount: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                        min="0"
                        step="1000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Target Date
                    </label>
                    <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description (Optional)</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    rows={3}
                    placeholder="Add any additional details..."
                />
            </div>

            {/* Investment Value Consideration */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer mb-3">
                    <input
                        type="checkbox"
                        checked={formData.is_appreciating_asset}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_appreciating_asset: e.target.checked }))}
                        className="mt-1"
                    />
                    <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <ArrowUpCircle size={16} className="text-emerald-600" />
                            This is an appreciating asset
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                            Check if this purchase is expected to increase in value (e.g., real estate, art, collectibles)
                        </div>
                    </div>
                </label>

                {formData.is_appreciating_asset && (
                    <div className="mt-3 pl-7">
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                            Expected Annual Appreciation Rate (%)
                        </label>
                        <input
                            type="number"
                            value={formData.expected_appreciation_rate}
                            onChange={(e) => setFormData(prev => ({ ...prev, expected_appreciation_rate: Number(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                            min="0"
                            max="20"
                            step="0.5"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// STAGE 2: Planning Parameters (assumptions)
// ============================================
const PlanningParametersForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        payment_method: initialValues.goal_details?.payment_method || 'lump_sum',
        installment_months: initialValues.goal_details?.installment_months || 12,
        interest_rate: initialValues.goal_details?.interest_rate || 0,
        budget_flexibility_pct: initialValues.goal_details?.budget_flexibility_pct || 10,
        includes_maintenance: initialValues.goal_details?.includes_maintenance || false,
        annual_maintenance_cost: initialValues.goal_details?.annual_maintenance_cost || 0,
        includes_insurance: initialValues.goal_details?.includes_insurance || false,
        annual_insurance_cost: initialValues.goal_details?.annual_insurance_cost || 0,
        inflation_adjustment: initialValues.goal_details?.inflation_adjustment !== false,
        inflation_pct: initialValues.goal_details?.inflation_pct || 2.5,
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 5,
        risk_attitude: initialValues.goal_details?.risk_attitude || 'balanced'
    });

    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_details: {
                ...initialValues.goal_details,
                payment_method: formData.payment_method,
                installment_months: formData.installment_months,
                interest_rate: formData.interest_rate,
                budget_flexibility_pct: formData.budget_flexibility_pct,
                includes_maintenance: formData.includes_maintenance,
                annual_maintenance_cost: formData.annual_maintenance_cost,
                includes_insurance: formData.includes_insurance,
                annual_insurance_cost: formData.annual_insurance_cost,
                inflation_adjustment: formData.inflation_adjustment,
                inflation_pct: formData.inflation_pct,
                expected_return_pct: formData.expected_return_pct,
                risk_attitude: formData.risk_attitude
            }
        });
    }, [
        formData.payment_method,
        formData.installment_months,
        formData.interest_rate,
        formData.budget_flexibility_pct,
        formData.includes_maintenance,
        formData.annual_maintenance_cost,
        formData.includes_insurance,
        formData.annual_insurance_cost,
        formData.inflation_adjustment,
        formData.inflation_pct,
        formData.expected_return_pct,
        formData.risk_attitude,
        onChange
    ]);

    const targetAmount = initialValues.target_amount || 10000;
    const totalWithMaintenance = targetAmount + 
        (formData.includes_maintenance ? formData.annual_maintenance_cost : 0) +
        (formData.includes_insurance ? formData.annual_insurance_cost : 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100/50 rounded-3xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Planning Parameters</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Configure payment method, ongoing costs, and investment assumptions.
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment Method */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_method: 'lump_sum' }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.payment_method === 'lump_sum'
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200'
                        }`}
                    >
                        <Wallet size={20} className={formData.payment_method === 'lump_sum' ? 'text-blue-600' : 'text-slate-400'} />
                        <div className="mt-2">
                            <div className="font-bold text-sm">Lump Sum</div>
                            <div className="text-xs text-slate-500 mt-1">Pay in full at purchase</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, payment_method: 'installment' }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.payment_method === 'installment'
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200'
                        }`}
                    >
                        <CreditCard size={20} className={formData.payment_method === 'installment' ? 'text-blue-600' : 'text-slate-400'} />
                        <div className="mt-2">
                            <div className="font-bold text-sm">Installment</div>
                            <div className="text-xs text-slate-500 mt-1">Pay over time with interest</div>
                        </div>
                    </button>
                </div>

                {formData.payment_method === 'installment' && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">Installment Period (Months)</label>
                            <input
                                type="number"
                                value={formData.installment_months}
                                onChange={(e) => setFormData(prev => ({ ...prev, installment_months: Number(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                min="1"
                                max="120"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">Interest Rate (%)</label>
                            <input
                                type="number"
                                value={formData.interest_rate}
                                onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: Number(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                min="0"
                                max="30"
                                step="0.1"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Budget Flexibility */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Budget Flexibility: {formData.budget_flexibility_pct}%
                </label>
                <input
                    type="range"
                    value={formData.budget_flexibility_pct}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_flexibility_pct: Number(e.target.value) }))}
                    className="w-full"
                    min="0"
                    max="50"
                    step="5"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Strict Budget</span>
                    <span>Flexible</span>
                </div>
            </div>

            {/* Ongoing Costs */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Ongoing Costs (Optional)</label>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.includes_maintenance}
                            onChange={(e) => setFormData(prev => ({ ...prev, includes_maintenance: e.target.checked }))}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">Maintenance Costs</div>
                            <div className="text-xs text-slate-600 mt-1">Annual upkeep, repairs, servicing</div>
                            {formData.includes_maintenance && (
                                <input
                                    type="number"
                                    value={formData.annual_maintenance_cost}
                                    onChange={(e) => setFormData(prev => ({ ...prev, annual_maintenance_cost: Number(e.target.value) || 0 }))}
                                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="Annual cost"
                                    min="0"
                                />
                            )}
                        </div>
                    </label>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.includes_insurance}
                            onChange={(e) => setFormData(prev => ({ ...prev, includes_insurance: e.target.checked }))}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">Insurance</div>
                            <div className="text-xs text-slate-600 mt-1">Annual insurance premiums</div>
                            {formData.includes_insurance && (
                                <input
                                    type="number"
                                    value={formData.annual_insurance_cost}
                                    onChange={(e) => setFormData(prev => ({ ...prev, annual_insurance_cost: Number(e.target.value) || 0 }))}
                                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="Annual cost"
                                    min="0"
                                />
                            )}
                        </div>
                    </label>
                </div>
            </div>

            {/* Inflation Adjustment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.inflation_adjustment}
                        onChange={(e) => setFormData(prev => ({ ...prev, inflation_adjustment: e.target.checked }))}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">Adjust for Inflation</div>
                        <div className="text-xs text-slate-600 mt-1">Account for price increases over time</div>
                        {formData.inflation_adjustment && (
                            <div className="mt-3">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Inflation Rate (%)</label>
                                <input
                                    type="number"
                                    value={formData.inflation_pct}
                                    onChange={(e) => setFormData(prev => ({ ...prev, inflation_pct: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                />
                            </div>
                        )}
                    </div>
                </label>
            </div>

            {/* Investment Parameters */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <TrendingUp className="inline w-4 h-4 mr-1" />
                    Expected Return Rate (% per year)
                </label>
                <input
                    type="number"
                    value={formData.expected_return_pct}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_return_pct: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                    max="20"
                    step="0.5"
                />
                <p className="text-xs text-slate-500 mt-1">Expected annual growth rate of your savings</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Risk Attitude</label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: 'conservative', label: 'Conservative', desc: 'Lower risk' },
                        { value: 'balanced', label: 'Balanced', desc: 'Moderate risk' },
                        { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk' }
                    ].map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, risk_attitude: option.value }))}
                            className={`p-3 rounded-xl text-center transition-colors ${
                                formData.risk_attitude === option.value
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                    : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                        >
                            <div className="font-bold text-sm">{option.label}</div>
                            <div className="text-xs mt-1 opacity-75">{option.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                <div className="text-sm font-bold text-slate-700 mb-2">Total Cost Summary</div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-600">Purchase Price:</span>
                        <span className="font-bold">${targetAmount.toLocaleString()}</span>
                    </div>
                    {formData.includes_maintenance && (
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>+ Annual Maintenance:</span>
                            <span>${formData.annual_maintenance_cost.toLocaleString()}</span>
                        </div>
                    )}
                    {formData.includes_insurance && (
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>+ Annual Insurance:</span>
                            <span>${formData.annual_insurance_cost.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// STAGE 3: Gap Analysis (gap_analysis)
// ============================================
const GapFeasibilityForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        current_savings: initialValues.goal_details?.current_savings || 0,
        monthly_contribution: initialValues.goal_details?.monthly_contribution || 0,
        has_existing_funding: initialValues.goal_details?.has_existing_funding || false,
        existing_funding_amount: initialValues.goal_details?.existing_funding_amount || 0,
        funding_source: initialValues.goal_details?.funding_source || ''
    });

    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_details: {
                ...initialValues.goal_details,
                current_savings: formData.current_savings,
                monthly_contribution: formData.monthly_contribution,
                has_existing_funding: formData.has_existing_funding,
                existing_funding_amount: formData.existing_funding_amount,
                funding_source: formData.funding_source
            }
        });
    }, [
        formData.current_savings, 
        formData.monthly_contribution,
        formData.has_existing_funding,
        formData.existing_funding_amount,
        formData.funding_source,
        onChange
    ]);

    // Calculations
    const targetAmount = initialValues.target_amount || 10000;
    const dueDate = initialValues.due_date ? new Date(initialValues.due_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const monthsRemaining = Math.max(1, Math.round((dueDate - new Date()) / (30 * 24 * 60 * 60 * 1000)));
    
    const expectedReturn = (initialValues.goal_details?.expected_return_pct || 5) / 100 / 12;
    const futureValueSavings = formData.current_savings * Math.pow(1 + expectedReturn, monthsRemaining);
    const futureValueContributions = formData.monthly_contribution > 0
        ? formData.monthly_contribution * ((Math.pow(1 + expectedReturn, monthsRemaining) - 1) / expectedReturn)
        : 0;
    
    const totalAvailable = futureValueSavings + futureValueContributions + 
        (formData.has_existing_funding ? formData.existing_funding_amount : 0);
    
    const gap = Math.max(0, targetAmount - totalAvailable);
    const isFeasible = gap <= targetAmount * 0.1;
    const requiredMonthly = gap > 0 && monthsRemaining > 0 
        ? gap / ((Math.pow(1 + expectedReturn, monthsRemaining) - 1) / expectedReturn)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 rounded-3xl p-6 border border-emerald-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                        <Target size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Gap Analysis</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Review your current position and required savings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Position */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Current Position</label>
                
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        <Wallet className="inline w-4 h-4 mr-1" />
                        Current Savings
                    </label>
                    <input
                        type="number"
                        value={formData.current_savings}
                        onChange={(e) => setFormData(prev => ({ ...prev, current_savings: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        min="0"
                        step="1000"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        Monthly Contribution
                    </label>
                    <input
                        type="number"
                        value={formData.monthly_contribution}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_contribution: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        min="0"
                        step="100"
                    />
                </div>
            </div>

            {/* Additional Funding */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.has_existing_funding}
                        onChange={(e) => setFormData(prev => ({ ...prev, has_existing_funding: e.target.checked }))}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900">Additional Funding Source</div>
                        <div className="text-xs text-slate-600 mt-1">
                            Gift, loan, bonus, or other guaranteed funding
                        </div>
                        {formData.has_existing_funding && (
                            <div className="mt-3 space-y-3">
                                <input
                                    type="number"
                                    value={formData.existing_funding_amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, existing_funding_amount: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                    placeholder="Amount"
                                    min="0"
                                />
                                <select
                                    value={formData.funding_source}
                                    onChange={(e) => setFormData(prev => ({ ...prev, funding_source: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                >
                                    <option value="">Select source...</option>
                                    <option value="gift">Gift from family</option>
                                    <option value="bonus">Work bonus</option>
                                    <option value="loan">Personal loan</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        )}
                    </div>
                </label>
            </div>

            {/* Gap Analysis Results */}
            <div className={`p-6 rounded-2xl border-2 ${
                isFeasible ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
            }`}>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900">
                        {isFeasible ? 'On Track!' : 'Gap Detected'}
                    </h4>
                    {isFeasible ? (
                        <CheckCircle2 className="text-emerald-600" size={24} />
                    ) : (
                        <AlertCircle className="text-rose-600" size={24} />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Target</div>
                        <div className="text-xl font-bold text-slate-900">
                            ${targetAmount.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Available</div>
                        <div className="text-xl font-bold text-emerald-600">
                            ${totalAvailable.toLocaleString('en', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Gap</div>
                        <div className={`text-xl font-bold ${isFeasible ? 'text-slate-400' : 'text-rose-600'}`}>
                            ${gap.toLocaleString('en', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>

                {!isFeasible && gap > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-rose-100">
                        <p className="text-sm text-slate-700">
                            To close the gap, you need{' '}
                            {requiredMonthly > 0 && (
                                <>
                                    an additional{' '}
                                    <span className="font-bold text-rose-600">
                                        ${requiredMonthly.toLocaleString('en', { maximumFractionDigits: 0 })}/month
                                    </span>
                                    {' '}(additional ${requiredMonthly.toLocaleString('en', { maximumFractionDigits: 0 })}/month) to meet your target by{' '}
                                </>
                            )}
                            {dueDate.toLocaleDateString()}.
                        </p>
                    </div>
                )}

                {isFeasible && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100">
                        <p className="text-sm text-emerald-700">
                            ✓ Your current plan should reach your goal in {monthsRemaining} months!
                        </p>
                    </div>
                )}
            </div>

            {/* Timeline Visualization */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-3">Progress to Goal</div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all ${
                            isFeasible ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, (totalAvailable / targetAmount) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>$0</span>
                    <span className="font-bold">${targetAmount.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Main Router Component
// ============================================
const MajorPurchaseGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery' }) => {
    if (activeSubstage === 'goal_discovery') {
        return <GoalVisionForm initialValues={initialValues} onChange={onChange} />;
    }

    if (activeSubstage === 'assumptions') {
        return <PlanningParametersForm initialValues={initialValues} onChange={onChange} />;
    }

    if (activeSubstage === 'gap_analysis') {
        return <GapFeasibilityForm initialValues={initialValues} onChange={onChange} />;
    }

    return (
        <div className="text-center text-slate-500 py-8">
            Unknown substage: {activeSubstage}
        </div>
    );
};

export default MajorPurchaseGoalForm;
