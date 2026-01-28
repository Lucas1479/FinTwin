import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, 
    Target, 
    DollarSign, 
    Calendar,
    Wallet,
    Percent,
    Calculator,
    CheckCircle2,
    AlertCircle,
    PiggyBank,
    BarChart3,
    TrendingDown,
    Shield,
    Zap
} from 'lucide-react';

// ============================================
// STAGE 1: Goal & Vision (goal_discovery)
// ============================================
const GoalVisionForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        goal_name: initialValues.goal_name || 'Wealth Growth',
        priority: initialValues.priority || 'want',
        target_amount: initialValues.target_amount || 100000,
        time_horizon_years: initialValues.goal_details?.time_horizon_years || 10,
        growth_objective: initialValues.goal_details?.growth_objective || 'balanced',
        target_passive_income: initialValues.goal_details?.target_passive_income || 0,
        current_net_worth: initialValues.goal_details?.current_net_worth || 0,
        description: initialValues.goal_details?.description || ''
    });

    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_name: formData.goal_name,
            priority: formData.priority,
            target_amount: formData.target_amount,
            goal_details: {
                time_horizon_years: formData.time_horizon_years,
                growth_objective: formData.growth_objective,
                target_passive_income: formData.target_passive_income,
                current_net_worth: formData.current_net_worth,
                description: formData.description
            }
        });
    }, [
        formData.goal_name,
        formData.priority,
        formData.target_amount,
        formData.time_horizon_years,
        formData.growth_objective,
        formData.target_passive_income,
        formData.current_net_worth,
        formData.description,
        onChange
    ]);

    const GROWTH_OBJECTIVES = [
        { 
            value: 'capital_appreciation', 
            label: 'Capital Appreciation', 
            icon: TrendingUp,
            desc: 'Focus on portfolio growth and asset value increase',
            allocation: '80% Growth, 20% Income'
        },
        { 
            value: 'passive_income', 
            label: 'Passive Income', 
            icon: DollarSign,
            desc: 'Generate regular income from dividends and interest',
            allocation: '30% Growth, 70% Income'
        },
        { 
            value: 'balanced', 
            label: 'Balanced', 
            icon: BarChart3,
            desc: 'Equal focus on growth and income generation',
            allocation: '60% Growth, 40% Income'
        },
        { 
            value: 'financial_freedom', 
            label: 'Financial Freedom', 
            icon: Zap,
            desc: 'Build wealth to replace employment income',
            allocation: 'Custom mix based on timeline'
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 rounded-3xl p-6 border border-emerald-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Wealth Growth Vision</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Define your wealth accumulation goal and investment horizon.
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
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., Build Investment Portfolio, Financial Freedom"
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
                                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                                    : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Growth Objective */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Primary Objective</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {GROWTH_OBJECTIVES.map((obj) => {
                        const Icon = obj.icon;
                        return (
                            <button
                                key={obj.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, growth_objective: obj.value }))}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                    formData.growth_objective === obj.value
                                        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-emerald-200'
                                }`}
                            >
                                <Icon size={20} className={formData.growth_objective === obj.value ? 'text-emerald-600' : 'text-slate-400'} />
                                <div className="mt-2">
                                    <div className="font-bold text-sm text-slate-900">{obj.label}</div>
                                    <div className="text-xs text-slate-600 mt-1">{obj.desc}</div>
                                    <div className="text-xs text-emerald-600 mt-2 font-medium">{obj.allocation}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Target Values */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Target className="inline w-4 h-4 mr-1" />
                        Target Portfolio Value
                    </label>
                    <input
                        type="number"
                        value={formData.target_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_amount: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        min="0"
                        step="10000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Time Horizon (Years)
                    </label>
                    <input
                        type="number"
                        value={formData.time_horizon_years}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_horizon_years: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        min="1"
                        max="50"
                    />
                </div>
            </div>

            {/* Passive Income Goal (Optional) */}
            {formData.growth_objective === 'passive_income' || formData.growth_objective === 'financial_freedom' ? (
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        Target Monthly Passive Income (Optional)
                    </label>
                    <input
                        type="number"
                        value={formData.target_passive_income}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_passive_income: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        min="0"
                        step="500"
                        placeholder="e.g., 5000"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        If specified, we'll calculate the required portfolio size to generate this income
                    </p>
                </div>
            ) : null}

            {/* Current Net Worth */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <Wallet className="inline w-4 h-4 mr-1" />
                    Current Net Worth (Optional)
                </label>
                <input
                    type="number"
                    value={formData.current_net_worth}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_net_worth: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    min="0"
                    step="10000"
                    placeholder="Total assets minus liabilities"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Helps us understand your starting point
                </p>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Vision & Motivation (Optional)</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    rows={3}
                    placeholder="What does wealth mean to you? What will you do with this wealth?"
                />
            </div>
        </div>
    );
};

// ============================================
// STAGE 2: Investment Parameters (assumptions)
// ============================================
const PlanningParametersForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        expected_return_pct: initialValues.goal_details?.expected_return_pct || 7,
        inflation_pct: initialValues.goal_details?.inflation_pct || 2.5,
        risk_attitude: initialValues.goal_details?.risk_attitude || 'balanced',
        reinvest_dividends: initialValues.goal_details?.reinvest_dividends !== false,
        tax_rate_pct: initialValues.goal_details?.tax_rate_pct || 28,
        investment_strategy: initialValues.goal_details?.investment_strategy || 'diversified',
        rebalance_frequency: initialValues.goal_details?.rebalance_frequency || 'quarterly'
    });

    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_details: {
                ...initialValues.goal_details,
                expected_return_pct: formData.expected_return_pct,
                inflation_pct: formData.inflation_pct,
                risk_attitude: formData.risk_attitude,
                reinvest_dividends: formData.reinvest_dividends,
                tax_rate_pct: formData.tax_rate_pct,
                investment_strategy: formData.investment_strategy,
                rebalance_frequency: formData.rebalance_frequency
            }
        });
    }, [
        formData.expected_return_pct,
        formData.inflation_pct,
        formData.risk_attitude,
        formData.reinvest_dividends,
        formData.tax_rate_pct,
        formData.investment_strategy,
        formData.rebalance_frequency,
        onChange
    ]);

    const RISK_PROFILES = [
        { 
            value: 'conservative', 
            label: 'Conservative', 
            desc: 'Preserve capital, minimize volatility',
            returnRange: '4-6% annual',
            allocation: '20% Stocks, 80% Bonds/Cash'
        },
        { 
            value: 'balanced', 
            label: 'Balanced', 
            desc: 'Moderate growth with stability',
            returnRange: '6-8% annual',
            allocation: '60% Stocks, 40% Bonds'
        },
        { 
            value: 'aggressive', 
            label: 'Aggressive', 
            desc: 'Maximum growth potential',
            returnRange: '8-12% annual',
            allocation: '80-90% Stocks, 10-20% Bonds'
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100/50 rounded-3xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Investment Parameters</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Configure your investment strategy, expected returns, and risk preferences.
                        </p>
                    </div>
                </div>
            </div>

            {/* Risk Attitude */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    <Shield className="inline w-4 h-4 mr-1" />
                    Risk Profile
                </label>
                <div className="grid grid-cols-1 gap-3">
                    {RISK_PROFILES.map((profile) => (
                        <button
                            key={profile.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                                ...prev, 
                                risk_attitude: profile.value,
                                expected_return_pct: profile.value === 'conservative' ? 5 : profile.value === 'balanced' ? 7 : 9
                            }))}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                formData.risk_attitude === profile.value
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-sm text-slate-900">{profile.label}</div>
                                    <div className="text-xs text-slate-600 mt-1">{profile.desc}</div>
                                    <div className="text-xs text-blue-600 mt-2 font-medium">{profile.returnRange}</div>
                                </div>
                                <div className="text-xs text-slate-500 text-right">
                                    {profile.allocation}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Return & Inflation */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <TrendingUp className="inline w-4 h-4 mr-1" />
                        Expected Annual Return (%)
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
                    <p className="text-xs text-slate-500 mt-1">Expected portfolio growth rate</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        <Percent className="inline w-4 h-4 mr-1" />
                        Inflation Rate (%)
                    </label>
                    <input
                        type="number"
                        value={formData.inflation_pct}
                        onChange={(e) => setFormData(prev => ({ ...prev, inflation_pct: Number(e.target.value) }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        min="0"
                        max="10"
                        step="0.1"
                    />
                </div>
            </div>

            {/* Investment Strategy */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Investment Strategy</label>
                <select
                    value={formData.investment_strategy}
                    onChange={(e) => setFormData(prev => ({ ...prev, investment_strategy: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="diversified">Diversified Portfolio (Stocks, Bonds, ETFs)</option>
                    <option value="index_funds">Index Fund Strategy (Low-cost, passive)</option>
                    <option value="dividend_growth">Dividend Growth (Income focus)</option>
                    <option value="growth_stocks">Growth Stocks (High growth potential)</option>
                    <option value="real_estate">Real Estate Investment</option>
                    <option value="custom">Custom Mix</option>
                </select>
            </div>

            {/* Rebalance Frequency */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Portfolio Rebalancing</label>
                <select
                    value={formData.rebalance_frequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, rebalance_frequency: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (Recommended)</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                    <option value="threshold">When allocation drifts >5%</option>
                </select>
            </div>

            {/* Tax Considerations */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Tax Rate on Investment Income (%)
                </label>
                <input
                    type="number"
                    value={formData.tax_rate_pct}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_rate_pct: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                    max="50"
                    step="1"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Your marginal tax rate for capital gains and dividends (NZ: typically 28-33%)
                </p>
            </div>

            {/* Dividend Reinvestment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.reinvest_dividends}
                        onChange={(e) => setFormData(prev => ({ ...prev, reinvest_dividends: e.target.checked }))}
                        className="mt-1"
                    />
                    <div>
                        <div className="font-bold text-sm text-slate-900">Reinvest Dividends & Interest</div>
                        <div className="text-xs text-slate-600 mt-1">
                            Automatically reinvest all dividend and interest income to maximize compound growth.
                            This typically adds 1-2% to your annual returns.
                        </div>
                    </div>
                </label>
            </div>

            {/* Real Return Summary */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100">
                <div className="text-sm font-bold text-slate-700 mb-2">Projected Returns</div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-600">Nominal Return:</span>
                        <span className="font-bold text-emerald-700">{formData.expected_return_pct}% p.a.</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-600">After Inflation:</span>
                        <span className="font-bold text-emerald-700">
                            {(formData.expected_return_pct - formData.inflation_pct).toFixed(1)}% p.a.
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-600">After Tax & Inflation:</span>
                        <span className="font-bold text-emerald-700">
                            {(formData.expected_return_pct * (1 - formData.tax_rate_pct / 100) - formData.inflation_pct).toFixed(1)}% p.a.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// STAGE 3: Wealth Gap Analysis (gap_analysis)
// ============================================
const GapFeasibilityForm = ({ initialValues, onChange }) => {
    const [formData, setFormData] = useState({
        current_portfolio_value: initialValues.goal_details?.current_portfolio_value || 0,
        monthly_investment: initialValues.goal_details?.monthly_investment || 0,
        annual_bonus: initialValues.goal_details?.annual_bonus || 0,
        employer_contribution: initialValues.goal_details?.employer_contribution || 0
    });

    useEffect(() => {
        if (!onChange) return;
        onChange({
            goal_details: {
                ...initialValues.goal_details,
                current_portfolio_value: formData.current_portfolio_value,
                monthly_investment: formData.monthly_investment,
                annual_bonus: formData.annual_bonus,
                employer_contribution: formData.employer_contribution
            }
        });
    }, [
        formData.current_portfolio_value, 
        formData.monthly_investment,
        formData.annual_bonus,
        formData.employer_contribution,
        onChange
    ]);

    // Calculations
    const targetAmount = initialValues.target_amount || 100000;
    const years = initialValues.goal_details?.time_horizon_years || 10;
    const months = years * 12;
    const annualReturn = (initialValues.goal_details?.expected_return_pct || 7) / 100;
    const monthlyReturn = annualReturn / 12;
    const taxRate = (initialValues.goal_details?.tax_rate_pct || 28) / 100;
    const afterTaxReturn = annualReturn * (1 - taxRate);
    const afterTaxMonthlyReturn = afterTaxReturn / 12;

    // Future value calculations
    const futureValueCurrent = formData.current_portfolio_value * Math.pow(1 + afterTaxMonthlyReturn, months);
    
    const totalMonthlyInvestment = formData.monthly_investment + (formData.employer_contribution / 12);
    const futureValueMonthly = totalMonthlyInvestment > 0
        ? totalMonthlyInvestment * ((Math.pow(1 + afterTaxMonthlyReturn, months) - 1) / afterTaxMonthlyReturn)
        : 0;
    
    const futureValueBonus = formData.annual_bonus > 0
        ? formData.annual_bonus * ((Math.pow(1 + afterTaxReturn, years) - 1) / afterTaxReturn)
        : 0;
    
    const totalProjected = futureValueCurrent + futureValueMonthly + futureValueBonus;
    const gap = Math.max(0, targetAmount - totalProjected);
    const isFeasible = totalProjected >= targetAmount * 0.9;
    
    const requiredMonthly = gap > 0 && months > 0
        ? gap / ((Math.pow(1 + afterTaxMonthlyReturn, months) - 1) / afterTaxMonthlyReturn)
        : 0;

    // Passive income calculation
    const targetPassiveIncome = initialValues.goal_details?.target_passive_income || 0;
    const withdrawalRate = 0.04; // 4% rule
    const requiredPortfolioForIncome = targetPassiveIncome * 12 / withdrawalRate;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-violet-50 to-purple-100/50 rounded-3xl p-6 border border-violet-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                        <Target size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Wealth Gap Analysis</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Review your projected growth and required contributions.
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Position */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    <PiggyBank className="inline w-4 h-4 mr-1" />
                    Current Portfolio Value
                </label>
                <input
                    type="number"
                    value={formData.current_portfolio_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_portfolio_value: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                    min="0"
                    step="5000"
                />
                <p className="text-xs text-slate-500 mt-1">Total current investment balance</p>
            </div>

            {/* Regular Contributions */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Regular Contributions</label>
                
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        Your Monthly Investment
                    </label>
                    <input
                        type="number"
                        value={formData.monthly_investment}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_investment: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                        min="0"
                        step="100"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        Annual Bonus (Optional)
                    </label>
                    <input
                        type="number"
                        value={formData.annual_bonus}
                        onChange={(e) => setFormData(prev => ({ ...prev, annual_bonus: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                        min="0"
                        step="1000"
                    />
                    <p className="text-xs text-slate-500 mt-1">Lump sum invested annually (e.g., year-end bonus)</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        Employer Contribution (Annual)
                    </label>
                    <input
                        type="number"
                        value={formData.employer_contribution}
                        onChange={(e) => setFormData(prev => ({ ...prev, employer_contribution: Number(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                        min="0"
                        step="500"
                    />
                    <p className="text-xs text-slate-500 mt-1">KiwiSaver match, stock grants, etc.</p>
                </div>
            </div>

            {/* Projection Results */}
            <div className={`p-6 rounded-2xl border-2 ${
                isFeasible ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
            }`}>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900">
                        {isFeasible ? 'On Track!' : 'Needs Adjustment'}
                    </h4>
                    {isFeasible ? (
                        <CheckCircle2 className="text-emerald-600" size={24} />
                    ) : (
                        <AlertCircle className="text-amber-600" size={24} />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Target</div>
                        <div className="text-lg font-bold text-slate-900">
                            ${(targetAmount / 1000).toFixed(0)}k
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Projected</div>
                        <div className="text-lg font-bold text-emerald-600">
                            ${(totalProjected / 1000).toFixed(0)}k
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl">
                        <div className="text-xs text-slate-500 mb-1">Gap</div>
                        <div className={`text-lg font-bold ${isFeasible ? 'text-slate-400' : 'text-amber-600'}`}>
                            ${(gap / 1000).toFixed(0)}k
                        </div>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="bg-white p-4 rounded-xl space-y-2 mb-4">
                    <div className="text-xs font-bold text-slate-700 mb-2">Projection Breakdown (After Tax)</div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Current portfolio growth:</span>
                        <span className="font-bold text-slate-900">
                            ${(futureValueCurrent / 1000).toFixed(0)}k
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly contributions:</span>
                        <span className="font-bold text-slate-900">
                            ${(futureValueMonthly / 1000).toFixed(0)}k
                        </span>
                    </div>
                    {formData.annual_bonus > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Annual bonus:</span>
                            <span className="font-bold text-slate-900">
                                ${(futureValueBonus / 1000).toFixed(0)}k
                            </span>
                        </div>
                    )}
                </div>

                {!isFeasible && gap > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-amber-100">
                        <p className="text-sm text-slate-700">
                            To reach your target, consider increasing your monthly investment by{' '}
                            <span className="font-bold text-amber-600">
                                ${requiredMonthly.toLocaleString('en', { maximumFractionDigits: 0 })}
                            </span>
                        </p>
                    </div>
                )}

                {isFeasible && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100">
                        <p className="text-sm text-emerald-700">
                            ✓ Your investment plan is projected to reach ${(totalProjected / 1000).toFixed(0)}k in {years} years!
                        </p>
                    </div>
                )}
            </div>

            {/* Passive Income Analysis */}
            {targetPassiveIncome > 0 && (
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                    <div className="flex items-start gap-3 mb-3">
                        <DollarSign size={20} className="text-blue-600 mt-0.5" />
                        <div>
                            <div className="font-bold text-sm text-slate-900">Passive Income Goal</div>
                            <div className="text-xs text-slate-600 mt-1">
                                To generate ${targetPassiveIncome.toLocaleString()}/month passive income
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Required Portfolio Size (4% rule):</span>
                            <span className="text-lg font-bold text-blue-600">
                                ${(requiredPortfolioForIncome / 1000).toFixed(0)}k
                            </span>
                        </div>
                        {requiredPortfolioForIncome > targetAmount && (
                            <p className="text-xs text-amber-600 mt-2">
                                ⚠️ Your income goal requires a larger portfolio than your target amount.
                                Consider adjusting either value.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Visualization */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-slate-700">Progress to Goal</span>
                    <span className="text-sm font-bold text-emerald-600">
                        {Math.min(100, (totalProjected / targetAmount * 100)).toFixed(0)}%
                    </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all ${
                            isFeasible ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (totalProjected / targetAmount) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>$0</span>
                    <span className="font-bold">${(targetAmount / 1000).toFixed(0)}k</span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Main Router Component
// ============================================
const WealthGrowthGoalForm = ({ initialValues, onChange, activeSubstage = 'goal_discovery' }) => {
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

export default WealthGrowthGoalForm;
