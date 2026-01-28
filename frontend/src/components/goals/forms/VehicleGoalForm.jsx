import React, { useState, useEffect } from 'react';
import { 
    Car, 
    Truck, 
    Zap, 
    Fuel, 
    Shield, 
    Tag, 
    Calendar, 
    DollarSign, 
    TrendingUp, 
    TrendingDown,
    CheckCircle2, 
    ArrowRight, 
    ChevronRight, 
    Settings,
    Gauge,
    Wallet,
    Banknote,
    Info,
    Leaf,
    Briefcase,
    Gem,
    Armchair
} from 'lucide-react';

// --- MOCK DATABASE (Expanded & Categorized) ---
const CAR_DATABASE = {
    // Top brands layout - 2 Rows of 4
    brands: [
        { id: 'toyota', name: 'Toyota', logo: 'T' },
        { id: 'tesla', name: 'Tesla', logo: 'T' },
        { id: 'ford', name: 'Ford', logo: 'F' },
        { id: 'mazda', name: 'Mazda', logo: 'M' },
        { id: 'byd', name: 'BYD', logo: 'B' },
        { id: 'bmw', name: 'BMW', logo: 'B' },
        { id: 'mercedes', name: 'Mercedes', logo: 'M' },
        { id: 'other', name: 'Other', logo: '?' }
    ],
    // Models with Tiers/Categories
    models: {
        toyota: [
            { id: 'corolla', name: 'Corolla Hybrid', type: 'Hatch', fuel: 'hybrid', price_new: 36000, price_used: 22000, depreciation: 0.12, tier: 'economy' },
            { id: 'yaris_cross', name: 'Yaris Cross', type: 'SUV', fuel: 'hybrid', price_new: 33000, price_used: 25000, depreciation: 0.11, tier: 'economy' },
            { id: 'rav4', name: 'RAV4 Hybrid', type: 'SUV', fuel: 'hybrid', price_new: 48000, price_used: 35000, depreciation: 0.10, tier: 'family' },
            { id: 'highlander', name: 'Highlander', type: 'SUV', fuel: 'hybrid', price_new: 70000, price_used: 50000, depreciation: 0.11, tier: 'family' },
            { id: 'hilux', name: 'Hilux SR5', type: 'Ute', fuel: 'diesel', price_new: 65000, price_used: 45000, depreciation: 0.08, tier: 'utility' },
            { id: 'landcruiser', name: 'Land Cruiser 300', type: 'SUV', fuel: 'diesel', price_new: 130000, price_used: 110000, depreciation: 0.07, tier: 'luxury' }
        ],
        tesla: [
            { id: 'model_3', name: 'Model 3 RWD', type: 'Sedan', fuel: 'ev', price_new: 63900, price_used: 50000, depreciation: 0.15, tier: 'family' },
            { id: 'model_y', name: 'Model Y RWD', type: 'SUV', fuel: 'ev', price_new: 67900, price_used: 55000, depreciation: 0.15, tier: 'family' },
            { id: 'model_s', name: 'Model S Plaid', type: 'Sedan', fuel: 'ev', price_new: 175000, price_used: 120000, depreciation: 0.18, tier: 'performance' }
        ],
        ford: [
            { id: 'ranger_xlt', name: 'Ranger XLT', type: 'Ute', fuel: 'diesel', price_new: 68000, price_used: 52000, depreciation: 0.09, tier: 'utility' },
            { id: 'ranger_raptor', name: 'Ranger Raptor', type: 'Ute', fuel: 'petrol', price_new: 95000, price_used: 80000, depreciation: 0.09, tier: 'performance' },
            { id: 'mustang', name: 'Mustang GT', type: 'Sports', fuel: 'petrol', price_new: 85000, price_used: 65000, depreciation: 0.12, tier: 'performance' },
            { id: 'everest', name: 'Everest', type: 'SUV', fuel: 'diesel', price_new: 75000, price_used: 60000, depreciation: 0.10, tier: 'family' }
        ],
        mazda: [
             { id: 'mazda_2', name: 'Mazda 2', type: 'Hatch', fuel: 'petrol', price_new: 28000, price_used: 15000, depreciation: 0.14, tier: 'economy' },
             { id: 'cx_5', name: 'CX-5', type: 'SUV', fuel: 'petrol', price_new: 42000, price_used: 28000, depreciation: 0.13, tier: 'family' },
             { id: 'mx_5', name: 'MX-5 Roadster', type: 'Sports', fuel: 'petrol', price_new: 55000, price_used: 35000, depreciation: 0.11, tier: 'performance' }
        ],
        byd: [
            { id: 'dolphin', name: 'Dolphin', type: 'Hatch', fuel: 'ev', price_new: 46000, price_used: 38000, depreciation: 0.18, tier: 'economy' },
            { id: 'atto_3', name: 'Atto 3', type: 'SUV', fuel: 'ev', price_new: 56000, price_used: 45000, depreciation: 0.18, tier: 'family' },
            { id: 'seal', name: 'Seal', type: 'Sedan', fuel: 'ev', price_new: 62000, price_used: 55000, depreciation: 0.18, tier: 'performance' },
            { id: 'shark', name: 'Shark', type: 'Ute', fuel: 'phev', price_new: 60000, price_used: 55000, depreciation: 0.15, tier: 'utility' }
        ],
        bmw: [
            { id: '1_series', name: '118i', type: 'Hatch', fuel: 'petrol', price_new: 55000, price_used: 35000, depreciation: 0.16, tier: 'economy' },
            { id: '3_series', name: '320i', type: 'Sedan', fuel: 'petrol', price_new: 90000, price_used: 55000, depreciation: 0.16, tier: 'luxury' },
            { id: 'x5', name: 'X5 xDrive', type: 'SUV', fuel: 'diesel', price_new: 145000, price_used: 90000, depreciation: 0.15, tier: 'luxury' },
            { id: 'm4', name: 'M4 Competition', type: 'Sports', fuel: 'petrol', price_new: 180000, price_used: 140000, depreciation: 0.14, tier: 'performance' }
        ],
        mercedes: [
            { id: 'a_class', name: 'A-Class', type: 'Hatch', fuel: 'petrol', price_new: 60000, price_used: 40000, depreciation: 0.16, tier: 'luxury' },
            { id: 'glc', name: 'GLC 300', type: 'SUV', fuel: 'hybrid', price_new: 105000, price_used: 80000, depreciation: 0.15, tier: 'luxury' },
             { id: 'eqc', name: 'EQC', type: 'SUV', fuel: 'ev', price_new: 120000, price_used: 85000, depreciation: 0.18, tier: 'luxury' }
        ],
        other: []
    }
};

// --- STAGE 1: VISION (The Dream) ---
const VehicleVisionForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [data, setData] = useState({
        tier: initialValues?.goal_details?.tier || 'family', 
        brand: initialValues?.goal_details?.brand || '',
        model_id: initialValues?.goal_details?.model_id || '',
        model_name: initialValues?.goal_details?.model_name || '',
        condition: initialValues?.goal_details?.condition || 'new',
        fuel_type: initialValues?.goal_details?.fuel_type || 'petrol',
        goal_name: initialValues?.goal_name || 'My New Ride',
        estimated_price: initialValues?.target_amount || 0,
        due_date: initialValues?.due_date || ''
    });

    // Sync from parent
    useEffect(() => {
        if (initialValues?.goal_details || initialValues?.goal_name || initialValues?.target_amount || initialValues?.due_date) {
            setData(prev => {
                // Normalize brand to lowercase to match CAR_DATABASE keys
                const brandValue = initialValues?.goal_details?.brand;
                const normalizedBrand = brandValue ? brandValue.toLowerCase() : prev.brand;
                
                const newData = {
                    tier: initialValues?.goal_details?.tier || prev.tier,
                    brand: normalizedBrand,
                    model_id: initialValues?.goal_details?.model_id || prev.model_id,
                    model_name: initialValues?.goal_details?.model_name || prev.model_name,
                    condition: initialValues?.goal_details?.condition || prev.condition,
                    fuel_type: initialValues?.goal_details?.fuel_type || prev.fuel_type,
                    goal_name: initialValues?.goal_name || prev.goal_name,
                    estimated_price: initialValues?.target_amount || prev.estimated_price,
                    due_date: initialValues?.due_date || prev.due_date
                };
                
                // Avoid unnecessary updates if data is consistent
                if (JSON.stringify(newData) === JSON.stringify(prev)) {
                    return prev;
                }
                
                return newData;
            });
        }
    }, [initialValues]);

    // Sync to parent (only when relevant fields change)
    useEffect(() => {
        onChange?.({
            goal_name: data.goal_name,
            target_amount: data.estimated_price,
            due_date: data.due_date,
            goal_details: {
                tier: data.tier,
                brand: data.brand,
                model_id: data.model_id,
                model_name: data.model_name,
                condition: data.condition,
                fuel_type: data.fuel_type
            }
        });
    }, [
        data.goal_name, 
        data.estimated_price, 
        data.due_date, 
        data.tier, 
        data.brand, 
        data.model_id, 
        data.model_name, 
        data.condition, 
        data.fuel_type
        // Note: onChange is intentionally NOT in deps (should be stable)
    ]);

    // Handlers
    const handleModelSelect = (model) => {
        const price = data.condition === 'new' ? model.price_new : model.price_used;
        setData(prev => ({
            ...prev,
            model_id: model.id,
            model_name: model.name,
            fuel_type: model.fuel,
            estimated_price: price,
            // Smart naming: Only auto-name if user hasn't typed a custom name (or if it's default)
            goal_name: (prev.goal_name.includes('My New Ride') || prev.goal_name.includes('New Car') || prev.goal_name.includes('Used')) 
                ? `${data.condition === 'new' ? 'New' : 'Used'} ${model.name}` 
                : prev.goal_name
        }));
    };

    const handleConditionChange = (newCondition) => {
        let newPrice = data.estimated_price;
        if (data.brand && data.model_id && data.brand !== 'other') {
            const models = CAR_DATABASE.models[data.brand];
            const model = models?.find(m => m.id === data.model_id);
            if (model) {
                newPrice = newCondition === 'new' ? model.price_new : model.price_used;
            }
        }
        setData(prev => ({ ...prev, condition: newCondition, estimated_price: newPrice }));
    };

    // Filter logic
    const availableModels = data.brand && data.brand !== 'other' && CAR_DATABASE.models[data.brand]
        ? CAR_DATABASE.models[data.brand].filter(m => {
            return m.tier === data.tier;
        })
        : [];

    const TIERS = [
        { id: 'economy', label: 'Economy', icon: Leaf, desc: 'Efficient & Practical' },
        { id: 'family', label: 'Family', icon: Armchair, desc: 'Space & Safety' },
        { id: 'utility', label: 'Utility', icon: Briefcase, desc: 'Work & Towing' },
        { id: 'performance', label: 'Sport', icon: Gauge, desc: 'Speed & Fun' },
        { id: 'luxury', label: 'Luxury', icon: Gem, desc: 'Comfort & Status' }
    ];

    // Helper: Valid form check
    const isValid = data.estimated_price > 0 && data.due_date;

    return (
        <div className="space-y-8 animate-fade-in pb-24">
             {/* Header - Standardized Style */}
             <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-8 border border-indigo-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                        <Car size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Vehicle Vision</h2>
                        <p className="text-slate-600 font-medium">What fits your lifestyle?</p>
                    </div>
                </div>
            </div>

            {/* Step 1: Lifestyle / Tier */}
            <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    1. Choose Vehicle Class
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {TIERS.map((tier) => {
                        const Icon = tier.icon;
                        const isSelected = data.tier === tier.id;
                        return (
                            <button
                                key={tier.id}
                                onClick={() => setData(prev => ({ ...prev, tier: tier.id, brand: '', model_id: '' }))} 
                                className={`
                                    relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group
                                    ${isSelected 
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100' 
                                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}
                                `}
                            >
                                <div className={`mb-3 p-2 rounded-xl w-fit ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-600'}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="font-bold text-slate-900">{tier.label}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{tier.desc}</div>
                                
                                {isSelected && (
                                    <div className="absolute top-2 right-2 text-indigo-600">
                                        <CheckCircle2 size={16} className="fill-indigo-100" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Step 2: Condition */}
            <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    2. Condition
                </label>
                <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-md">
                    {['new', 'used'].map((c) => (
                        <button
                            key={c}
                            onClick={() => handleConditionChange(c)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all flex items-center justify-center gap-2 ${
                                data.condition === c 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {c === 'new' ? <Zap size={14} /> : <Settings size={14} />}
                            {c === 'new' ? 'Brand New' : 'Pre-Owned'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Brand */}
            {data.tier && (
                <div className="space-y-4 animate-fade-in-up">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        3. Select Brand
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-3">
                        {CAR_DATABASE.brands.map((brand) => {
                            const hasModels = brand.id === 'other' || (CAR_DATABASE.models[brand.id] && CAR_DATABASE.models[brand.id].some(m => m.tier === data.tier));
                            
                            return (
                                <button
                                    key={brand.id}
                                    disabled={!hasModels}
                                    onClick={() => setData(prev => ({ ...prev, brand: brand.id, model_id: '', model_name: '' }))}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                                        ${data.brand === brand.id 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md' 
                                            : hasModels ? 'border-slate-100 bg-white hover:border-indigo-200 text-slate-600' : 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed'}
                                    `}
                                >
                                    <span className="text-xl font-black w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg">
                                        {brand.logo}
                                    </span>
                                    <span className="text-sm font-bold truncate">{brand.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 4: Model */}
            {data.brand && (
                <div className="space-y-4 animate-fade-in-up">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>4. Select Model</span>
                        {data.brand !== 'other' && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Filtering by {data.tier}</span>}
                    </label>
                    
                    {data.brand === 'other' ? (
                         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Custom Model Name</label>
                                <input 
                                    type="text" 
                                    value={data.model_name}
                                    onChange={(e) => setData(prev => ({ ...prev, model_name: e.target.value }))}
                                    placeholder="e.g. Classic Car"
                                    className="w-full input-base"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estimated Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        value={data.estimated_price || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setData(prev => ({ ...prev, estimated_price: val === '' ? 0 : Number(val) }));
                                        }}
                                        className="w-full input-base pl-8"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : availableModels.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableModels.map((model) => {
                                const isSelected = data.model_id === model.id;
                                const displayPrice = data.condition === 'new' ? model.price_new : model.price_used;
                                
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleModelSelect(model)}
                                        className={`
                                            flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all group
                                            ${isSelected 
                                                ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                                                : 'border-slate-100 bg-white hover:border-indigo-200'}
                                        `}
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900">{model.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                <span className="capitalize bg-slate-100 px-1.5 py-0.5 rounded">{model.type}</span>
                                                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                    model.fuel === 'ev' ? 'bg-green-100 text-green-700' :
                                                    model.fuel === 'hybrid' ? 'bg-blue-100 text-blue-700' :
                                                    model.fuel === 'phev' ? 'bg-teal-100 text-teal-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {model.fuel === 'ev' ? <Zap size={10} /> : <Fuel size={10} />}
                                                    <span className="uppercase">{model.fuel}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-black text-lg ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                                                ${(displayPrice / 1000).toFixed(1)}k
                                            </div>
                                            {isSelected && <CheckCircle2 size={16} className="text-indigo-600 ml-auto mt-1" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                            No recommended {data.tier} models found for {CAR_DATABASE.brands.find(b => b.id === data.brand)?.name}.
                            <br/>
                            <button className="text-indigo-600 font-bold mt-2 hover:underline" onClick={() => setData(prev => ({...prev, brand: 'other'}))}>
                                Enter Custom Details
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 5: Target Date (New) */}
            <div className="space-y-4 animate-fade-in-up">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    5. Target Date
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Calendar size={18} />
                    </span>
                    <input 
                        type="date"
                        value={data.due_date}
                        onChange={(e) => setData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full input-base pl-10"
                    />
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    type="button"
                    disabled={!isValid}
                    onClick={() => onSubstageSubmit(data)} 
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                    Confirm Configuration
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};


// --- STAGE 2: PARAMETERS (The Deal Structurer) ---
const VehiclePlanningParametersForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    // Determine defaults based on Vision data
    const vision = initialValues?.goal_details || {};
    const defaultDepreciation = (() => {
        if (vision.brand && vision.model_id) {
            const models = CAR_DATABASE.models[vision.brand];
            const model = models?.find(m => m.id === vision.model_id);
            return model ? model.depreciation * 100 : 12;
        }
        return 12; // Standard default
    })();

    const [data, setData] = useState({
        target_amount: initialValues?.target_amount || 0, // Vehicle Price
        on_road_costs: initialValues?.goal_details?.on_road_costs || 1200, // ORC
        trade_in_value: initialValues?.goal_details?.trade_in_value || 0,
        deposit_cash: initialValues?.goal_details?.deposit_cash || 5000,
        
        // Financing
        finance_method: initialValues?.goal_details?.finance_method || 'cash', // 'cash', 'loan'
        loan_interest_rate: initialValues?.goal_details?.loan_interest_rate || 9.95,
        loan_term_years: initialValues?.goal_details?.loan_term_years || 5,

        // Ownership
        running_costs_annual: initialValues?.goal_details?.running_costs_annual || (vision.fuel_type === 'ev' ? 1000 : 2500),
        insurance_annual: initialValues?.goal_details?.insurance_annual || 1500,
        depreciation_rate: initialValues?.goal_details?.depreciation_rate || defaultDepreciation
    });

    // Sync from parent
    useEffect(() => {
        if (initialValues?.target_amount !== undefined || initialValues?.goal_details) {
            setData(prev => {
                const newData = {
                    target_amount: initialValues?.target_amount ?? prev.target_amount,
                    on_road_costs: initialValues?.goal_details?.on_road_costs ?? prev.on_road_costs,
                    trade_in_value: initialValues?.goal_details?.trade_in_value ?? prev.trade_in_value,
                    deposit_cash: initialValues?.goal_details?.deposit_cash ?? prev.deposit_cash,
                    finance_method: initialValues?.goal_details?.finance_method ?? prev.finance_method,
                    loan_interest_rate: initialValues?.goal_details?.loan_interest_rate ?? prev.loan_interest_rate,
                    loan_term_years: initialValues?.goal_details?.loan_term_years ?? prev.loan_term_years,
                    running_costs_annual: initialValues?.goal_details?.running_costs_annual ?? prev.running_costs_annual,
                    insurance_annual: initialValues?.goal_details?.insurance_annual ?? prev.insurance_annual,
                    depreciation_rate: initialValues?.goal_details?.depreciation_rate ?? prev.depreciation_rate
                };
                
                // Avoid unnecessary updates
                if (JSON.stringify(newData) === JSON.stringify(prev)) {
                    return prev;
                }
                
                return newData;
            });
        }
    }, [initialValues]);

    // Sync to parent
    useEffect(() => {
        // Calculate Loan details
        const totalCost = data.target_amount + data.on_road_costs;
        const upfrontPaid = data.trade_in_value + data.deposit_cash;
        const loanAmount = Math.max(0, totalCost - upfrontPaid);
        
        let monthlyRepayment = 0;
        if (data.finance_method === 'loan' && loanAmount > 0) {
            const r = data.loan_interest_rate / 100 / 12;
            const n = data.loan_term_years * 12;
            monthlyRepayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        onChange?.({
            target_amount: data.target_amount,
            goal_details: {
                ...data,
                loan_principal: loanAmount,
                monthly_repayment: monthlyRepayment,
                net_upfront_cost: data.finance_method === 'cash' ? Math.max(0, totalCost - data.trade_in_value) : data.deposit_cash
            }
        });
    }, [data, onChange]);

    // Helpers
    const totalCost = data.target_amount + data.on_road_costs;
    const upfrontPaid = data.trade_in_value + data.deposit_cash;
    const loanAmount = Math.max(0, totalCost - upfrontPaid);
    
    // Loan Calculation for Display
    const r = data.loan_interest_rate / 100 / 12;
    const n = data.loan_term_years * 12;
    const monthlyRepayment = (data.finance_method === 'loan' && loanAmount > 0) 
        ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : 0;

    const handleConfirm = () => {
        onSubstageSubmit({
            target_amount: data.target_amount,
            goal_details: {
                ...data,
                loan_principal: loanAmount,
                monthly_repayment: monthlyRepayment
            }
        });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            {/* Payment Method Switch */}
            <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex">
                <button 
                    onClick={() => setData(p => ({ ...p, finance_method: 'cash' }))}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        data.finance_method === 'cash' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Wallet size={16} /> Cash / Savings
                </button>
                <button 
                    onClick={() => setData(p => ({ ...p, finance_method: 'loan' }))}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        data.finance_method === 'loan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Banknote size={16} /> Finance / Loan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Cost Structure */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-2">Deal Structure</h3>
                        
                        <div>
                            <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">Vehicle Price (MSRP)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={data.target_amount || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setData(p => ({ ...p, target_amount: val === '' ? 0 : Number(val) }));
                                    }}
                                    className="w-full bg-slate-50 rounded-xl px-8 py-3 font-bold text-slate-800"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                <span>On-Road Costs</span>
                                <span className="text-slate-400 font-normal">Rego, WOF, Clean Car Fee</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={data.on_road_costs || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setData(p => ({ ...p, on_road_costs: val === '' ? 0 : Number(val) }));
                                    }}
                                    className="w-full bg-slate-50 rounded-xl px-8 py-3 font-bold text-slate-800"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                             <div className="flex justify-between items-center text-sm font-bold">
                                <span>Total Price</span>
                                <span>${totalCost.toLocaleString()}</span>
                             </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-xs font-bold text-green-600 mb-1">Less: Trade-In Value</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={data.trade_in_value || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setData(p => ({ ...p, trade_in_value: val === '' ? 0 : Number(val) }));
                                    }}
                                    className="w-full bg-green-50 rounded-xl px-8 py-3 font-bold text-green-700 focus:ring-green-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Financing or Cash */}
                <div className="space-y-6">
                    {data.finance_method === 'loan' ? (
                        <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 space-y-4">
                            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-200 pb-2 mb-2 flex items-center gap-2">
                                <Banknote size={16}/> Finance Details
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-indigo-600 mb-1">Cash Deposit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={data.deposit_cash}
                                        onChange={(e) => setData(p => ({ ...p, deposit_cash: Number(e.target.value) }))}
                                        className="w-full bg-white rounded-xl px-8 py-3 font-bold text-indigo-900 border border-indigo-200"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-indigo-600 mb-1">Interest Rate (%)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={data.loan_interest_rate}
                                        onChange={(e) => setData(p => ({ ...p, loan_interest_rate: Number(e.target.value) }))}
                                        className="w-full bg-white rounded-xl px-4 py-3 font-bold text-indigo-900 border border-indigo-200"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-indigo-600 mb-1">Term (Years)</label>
                                    <select 
                                        value={data.loan_term_years}
                                        onChange={(e) => setData(p => ({ ...p, loan_term_years: Number(e.target.value) }))}
                                        className="w-full bg-white rounded-xl px-4 py-3 font-bold text-indigo-900 border border-indigo-200"
                                    >
                                        {[1,2,3,4,5,7].map(y => <option key={y} value={y}>{y} Years</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-indigo-600 rounded-2xl p-4 text-white mt-4">
                                <div className="text-xs font-medium text-indigo-200 uppercase tracking-wider mb-1">Estimated Repayment</div>
                                <div className="text-3xl font-black">${Math.round(monthlyRepayment).toLocaleString()}<span className="text-sm font-normal text-indigo-200">/mo</span></div>
                                <div className="text-xs text-indigo-300 mt-2">
                                    Principal: ${loanAmount.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 h-full flex flex-col justify-center items-center text-center">
                            <div className="p-4 bg-white rounded-full text-green-600 shadow-sm mb-2">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Cash Purchase</h3>
                            <p className="text-sm text-slate-500 max-w-xs">
                                You are planning to pay upfront using savings.
                            </p>
                            <div className="mt-4 w-full bg-white border border-slate-200 p-4 rounded-2xl">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Savings Required</div>
                                <div className="text-3xl font-black text-slate-900">
                                    ${Math.max(0, totalCost - data.trade_in_value).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Costs (TCO) */}
            <div className="border-t border-slate-100 pt-6">
                <button 
                    type="button"
                    onClick={() => { /* Toggle expand logic could go here */ }}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4 hover:text-indigo-600 transition-colors"
                >
                    <Info size={16} /> Advanced: Assumptions for TCO (Total Cost of Ownership)
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Running Costs / Year</label>
                        <input 
                            type="number"
                            value={data.running_costs_annual}
                            onChange={(e) => setData(p => ({ ...p, running_costs_annual: Number(e.target.value) }))}
                            className="w-full input-base text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Insurance / Year</label>
                        <input 
                            type="number"
                            value={data.insurance_annual}
                            onChange={(e) => setData(p => ({ ...p, insurance_annual: Number(e.target.value) }))}
                            className="w-full input-base text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Depreciation %</label>
                        <input 
                            type="number"
                            value={data.depreciation_rate}
                            onChange={(e) => setData(p => ({ ...p, depreciation_rate: Number(e.target.value) }))}
                            className="w-full input-base text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                    Confirm Structure
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};


// --- STAGE 3: GAP / FEASIBILITY (The Advisor) ---
const VehicleGapFeasibilityForm = ({ initialValues, onChange, onSubstageSubmit }) => {
    const [data, setData] = useState({
        due_date: initialValues?.due_date || '',
    });

    // Sync from parent
    useEffect(() => {
        if (initialValues?.due_date) {
            setData(prev => {
                if (prev.due_date === initialValues.due_date) {
                    return prev;
                }
                return { due_date: initialValues.due_date };
            });
        }
    }, [initialValues]);

    // Derived from Context
    const details = initialValues?.goal_details || {};
    const financeMethod = details.finance_method || 'cash';
    const monthlyRepayment = details.monthly_repayment || 0;
    const netUpfrontCost = details.net_upfront_cost || 0;
    
    // TCO Calculation (5 Years)
    const years = 5;
    const initialCost = details.target_amount + details.on_road_costs;
    const totalRunning = (details.running_costs_annual + details.insurance_annual) * years;
    const resaleValue = initialCost * Math.pow(1 - (details.depreciation_rate/100), years);
    const totalCostOfOwnership = initialCost + totalRunning - resaleValue + (financeMethod === 'loan' ? (monthlyRepayment * 12 * details.loan_term_years) - details.loan_principal : 0);

    // Sync to parent
    useEffect(() => {
        onChange?.({
            due_date: data.due_date
        });
    }, [data, onChange]);

    // Calculate Savings Plan (if Cash)
    const today = new Date();
    const targetDate = data.due_date ? new Date(data.due_date) : new Date(new Date().setFullYear(today.getFullYear() + 1));
    const monthsUntil = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth()));
    const monthlySavingsRequired = financeMethod === 'cash' ? netUpfrontCost / monthsUntil : (details.deposit_cash / monthsUntil);

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <div className="text-center">
                <h2 className="text-2xl font-black text-slate-900">Feasibility & Analysis</h2>
                <p className="text-slate-500">The true cost of your decision.</p>
            </div>

            {/* Timeline Input */}
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-md mx-auto">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Target Purchase Date</label>
                <div className="relative">
                    <input 
                        type="date"
                        value={data.due_date}
                        onChange={(e) => setData({ due_date: e.target.value })}
                        className="w-full text-center bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 font-black text-lg focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className="mt-4 text-xs font-bold text-indigo-500 uppercase tracking-wider">{monthsUntil} months away</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Immediate Cashflow Impact */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-2 mb-4 opacity-80">
                        <Wallet size={20} />
                        <span className="font-bold text-sm uppercase">Monthly Commitment</span>
                    </div>
                    
                    {financeMethod === 'loan' ? (
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-indigo-200 font-bold uppercase">Pre-Purchase Savings</div>
                                <div className="text-2xl font-black">${Math.ceil(monthlySavingsRequired).toLocaleString()}</div>
                                <div className="text-xs text-indigo-300">Save for deposit over {monthsUntil}mo</div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <div className="text-xs text-indigo-200 font-bold uppercase">Post-Purchase Repayment</div>
                                <div className="text-3xl font-black text-yellow-300">${Math.ceil(monthlyRepayment).toLocaleString()}</div>
                                <div className="text-xs text-indigo-300">For {details.loan_term_years} years</div>
                            </div>
                        </div>
                    ) : (
                        <div>
                             <div className="text-xs text-indigo-200 font-bold uppercase">Savings Target</div>
                             <div className="text-4xl font-black">${Math.ceil(monthlySavingsRequired).toLocaleString()}</div>
                             <div className="text-xs text-indigo-300 mt-1">Save monthly to buy cash in {monthsUntil}mo</div>
                        </div>
                    )}
                </div>

                {/* Long Term TCO Analysis */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-slate-500">
                        <TrendingDown size={20} />
                        <span className="font-bold text-sm uppercase">5-Year TCO Analysis</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Depreciation Loss</span>
                            <span className="font-bold text-red-500">-${Math.round(initialCost - resaleValue).toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Running Costs (5yr)</span>
                            <span className="font-bold text-orange-500">-${Math.round(totalRunning).toLocaleString()}</span>
                        </div>
                         {financeMethod === 'loan' && (
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Loan Interest</span>
                                <span className="font-bold text-yellow-600">-${Math.round((monthlyRepayment * 12 * details.loan_term_years) - details.loan_principal).toLocaleString()}</span>
                            </div>
                         )}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 mt-2">
                        <div className="flex justify-between items-end">
                            <div className="text-xs font-bold text-slate-400 uppercase">True Cost (5yr)</div>
                            <div className="text-2xl font-black text-slate-800">
                                ${Math.round(totalCostOfOwnership).toLocaleString()}
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Includes depreciation, fuel, insurance {financeMethod === 'loan' ? 'and interest' : ''}.
                            This is what the car truly costs you.
                        </p>
                    </div>
                </div>
            </div>

             {/* Action Bar */}
             <div className="fixed bottom-6 right-6 z-50">
                <button
                    type="button"
                    onClick={() => onSubstageSubmit({ confirmed: true, target_amount: details.target_amount })}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                    Finalize Plan
                    <CheckCircle2 size={20} />
                </button>
            </div>
        </div>
    );
};


// --- MAIN FORM CONTAINER ---
const VehicleGoalForm = ({ initialValues, onChange, activeSubstage, onSubstageSubmit, needsRecompute }) => {
    // 1. Vision
    if (activeSubstage === 'goal_discovery' || !activeSubstage) {
        return (
            <VehicleVisionForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit}
            />
        );
    }
    
    // 2. Parameters
    if (activeSubstage === 'assumptions' || activeSubstage === 'planning_parameters') {
        return (
            <VehiclePlanningParametersForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit}
            />
        );
    }

    // 3. Gap Analysis
    if (activeSubstage === 'gap_analysis' || activeSubstage === 'feasibility_check') {
        return (
            <VehicleGapFeasibilityForm 
                initialValues={initialValues} 
                onChange={onChange} 
                onSubstageSubmit={onSubstageSubmit}
            />
        );
    }

    return null;
};

export default VehicleGoalForm;
