import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Upload, Check, ScanLine, DollarSign, Calendar, Building, Tag, 
  Percent, ArrowRight, Trash2, TrendingUp, Sparkles, ArrowRightLeft,
  Briefcase, Home, Car, CreditCard, Shield, Banknote, HelpCircle, AlertCircle
} from 'lucide-react';
import { createAsset, updateAsset, deleteAsset } from '../../services/wealthService';
import { createPassiveIncome } from '../../services/cashFlowService';

// Category Definitions
const CATEGORIES = {
  Asset: {
    'Cash & Banking': ['Cash_Bank', 'Cash_TermDeposit', 'Cash_Physical'],
    'Investments': ['KiwiSaver', 'Invest_ManagedFund', 'Invest_Shares'],
    'Physical Assets': ['Property', 'Vehicle', 'Other_Asset']
  },
  Liability: {
    'Loans': ['Mortgage', 'Loan_Personal', 'Loan_Student'],
    'Credit': ['Credit_Card', 'Other_Liability']
  }
};

const CATEGORY_LABELS = {
  Cash_Bank: 'Bank Account',
  Cash_TermDeposit: 'Term Deposit',
  Cash_Physical: 'Cash on Hand',
  Invest_Shares: 'Shares / ETF',
  Invest_ManagedFund: 'Managed Fund',
  KiwiSaver: 'KiwiSaver',
  Property: 'Real Estate',
  Vehicle: 'Vehicle',
  Other_Asset: 'Other Asset',
  Mortgage: 'Home Loan',
  Loan_Personal: 'Personal Loan',
  Loan_Student: 'Student Loan',
  Credit_Card: 'Credit Card',
  Other_Liability: 'Other Debt'
};

const CASH_CATEGORIES = ['Cash_Bank', 'Cash_Physical', 'Cash_TermDeposit'];

const AssetFormModal = ({ isOpen, onClose, onRefresh, assetToEdit = null, onOpenConversion }) => {
  const [recordType, setRecordType] = useState('Asset');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Passive Income Prompt State
  const [showPassiveIncomePrompt, setShowPassiveIncomePrompt] = useState(false);
  const [pendingAsset, setPendingAsset] = useState(null); 
  const [calculatedInterest, setCalculatedInterest] = useState({ monthly: 0, yearly: 0 });
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    currency: 'NZD',
    is_liquid: false,
    details: {}
  });

  const fileInputRef = useRef(null);

  // Reset or Populate on Open
  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        // Edit Mode
        setRecordType(assetToEdit.record_type);
        setSelectedCategory(assetToEdit.category);
        setStep(2);
        setFormData({
          name: assetToEdit.name,
          value: assetToEdit.value,
          currency: assetToEdit.currency || 'NZD',
          is_liquid: assetToEdit.is_liquid ?? false,
          details: assetToEdit.asset_details || {}
        });
      } else {
        // Create Mode
        setStep(1);
        setRecordType('Asset');
        setSelectedCategory('');
        setFormData({ name: '', value: '', currency: 'NZD', is_liquid: false, details: {} });
      }
      setOcrSuccess(false);
      setShowPassiveIncomePrompt(false);
    }
  }, [isOpen, assetToEdit]);

  // Determine default liquid status when category changes
  useEffect(() => {
    if (!assetToEdit && selectedCategory) {
       const liquidDefaults = ['Cash_Bank', 'Cash_Physical', 'Invest_Shares'];
       setFormData(prev => ({
         ...prev,
         is_liquid: liquidDefaults.includes(selectedCategory)
       }));
    }
  }, [selectedCategory, assetToEdit]);

  const estimatedReturn = useMemo(() => {
    const val = Number(formData.value) || 0;
    const rate = Number(formData.details.interest_rate) || 0;
    if (val > 0 && rate > 0) {
      return (val * (rate / 100));
    }
    return 0;
  }, [formData.value, formData.details.interest_rate]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate OCR Process
    setTimeout(() => {
      setIsUploading(false);
      setOcrSuccess(true);
      const mockValue = Math.floor(Math.random() * 50000) + 1000;
      setFormData(prev => ({
        ...prev,
        name: file.name.split('.')[0] || 'New Asset',
        value: mockValue,
        details: { ...prev.details, provider: 'Extracted Provider', interest_rate: 4.5 }
      }));
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        record_type: recordType,
        category: selectedCategory,
        name: formData.name,
        value: Number(formData.value),
        currency: formData.currency,
        is_liquid: formData.is_liquid,
        asset_details: formData.details
      };

      let createdAsset = null;

      if (assetToEdit) {
        await updateAsset(assetToEdit._id, payload);
        onRefresh();
        onClose();
      } else {
        createdAsset = await createAsset(payload);
        
        // Check if asset has interest rate and should prompt for passive income
        const interestRate = formData.details.interest_rate;
        const assetValue = Number(formData.value);
        const hasInterest = interestRate && interestRate > 0 && assetValue > 0;
        const isInterestBearingCategory = ['Cash_Bank', 'Cash_TermDeposit'].includes(selectedCategory);
        
        if (hasInterest && isInterestBearingCategory) {
          const yearlyInterest = assetValue * (interestRate / 100);
          const monthlyInterest = yearlyInterest / 12;
          
          setCalculatedInterest({ monthly: monthlyInterest, yearly: yearlyInterest });
          setPendingAsset({ ...createdAsset, ...payload, _id: createdAsset._id });
          setShowPassiveIncomePrompt(true);
        } else {
          onRefresh();
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to save asset:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreatePassiveIncome = async () => {
    if (!pendingAsset) return;
    setLoading(true);
    
    try {
      await createPassiveIncome({
        sourceAssetId: pendingAsset._id,
        name: `${pendingAsset.name} Interest`,
        amount: calculatedInterest.monthly,
        frequency: 'Monthly',
      });
      
      onRefresh();
      setShowPassiveIncomePrompt(false);
      setPendingAsset(null);
      onClose();
    } catch (error) {
      console.error("Failed to create passive income:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSkipPassiveIncome = () => {
    setShowPassiveIncomePrompt(false);
    setPendingAsset(null);
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setLoading(true);
    try {
      await deleteAsset(assetToEdit._id);
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConversion = () => {
    if (!assetToEdit || assetToEdit.record_type !== 'Asset') return;
    const isCash = CASH_CATEGORIES.includes(assetToEdit.category);
    onClose();
    onOpenConversion?.(assetToEdit, isCash ? 'cash-to-asset' : 'asset-to-cash');
  };

  const updateDetail = (field, value) => {
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, [field]: value }
    }));
  };

  // --- Render Helpers ---

  const renderCategoryIcon = (category) => {
      const props = { size: 20, className: "text-indigo-600" };
      if (category?.includes('Cash')) return <Banknote {...props} />;
      if (category?.includes('Invest')) return <TrendingUp {...props} />;
      if (category === 'Property') return <Home {...props} />;
      if (category === 'Vehicle') return <Car {...props} />;
      if (category === 'Mortgage') return <Home {...props} className="text-rose-500" />;
      if (category?.includes('Loan') || category?.includes('Card')) return <CreditCard {...props} className="text-rose-500" />;
      return <Briefcase {...props} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
             {selectedCategory && (
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${recordType === 'Liability' ? 'bg-rose-50' : 'bg-indigo-50'}`}>
                    {renderCategoryIcon(selectedCategory)}
                 </div>
             )}
             <div>
                <h2 className="text-xl font-bold text-slate-900">
                {assetToEdit ? 'Edit Details' : (step === 1 ? 'New Entry' : CATEGORY_LABELS[selectedCategory])}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                    {assetToEdit && (
                         <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${recordType === 'Liability' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {recordType}
                         </span>
                    )}
                    <p className="text-sm text-slate-500">
                    {assetToEdit ? 'Update your portfolio item' : (step === 1 ? 'Select a category to begin' : 'Fill in the details below')}
                    </p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* PASSIVE INCOME PROMPT */}
          {showPassiveIncomePrompt && pendingAsset ? (
            <div className="max-w-md mx-auto space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
               {/* ... (Keep existing Passive Income Prompt logic but simplified for brevity in this rewrite) ... */}
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Asset Created!</h3>
                <p className="text-slate-500 text-sm">
                  <span className="font-bold text-slate-700">{pendingAsset.name}</span> has been added.
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-left">
                  <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-500" />
                      Passive Income Detected
                  </h4>
                  <p className="text-sm text-indigo-700 mb-3">
                      Based on the interest rate, we estimate:
                  </p>
                  <div className="bg-white rounded-xl p-4 border border-indigo-100 flex justify-between items-center">
                        <span className="text-sm text-slate-500">Monthly Income</span>
                        <span className="text-lg font-bold text-emerald-600">+${calculatedInterest.monthly.toFixed(2)}</span>
                  </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSkipPassiveIncome} className="flex-1 px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Skip</button>
                <button onClick={handleCreatePassiveIncome} className="flex-1 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Add to Cash Flow</button>
              </div>
            </div>
          ) : (
             <>
                {/* STEP 1: Category Selection */}
                {step === 1 && !assetToEdit && (
                    <div className="space-y-8 max-w-4xl mx-auto">
                        <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto">
                            {['Asset', 'Liability'].map(type => (
                                <button 
                                key={type}
                                onClick={() => setRecordType(type)}
                                className={`px-10 py-2.5 rounded-lg text-sm font-bold transition-all ${recordType === type 
                                    ? (type === 'Asset' ? 'bg-white text-indigo-600 shadow-sm' : 'bg-white text-rose-600 shadow-sm') 
                                    : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                {type}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(CATEGORIES[recordType]).map(([group, types]) => (
                                <div key={group} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">{group}</h3>
                                    <div className="space-y-2">
                                    {types.map(type => (
                                        <button
                                        key={type}
                                        onClick={() => { setSelectedCategory(type); setStep(2); }}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between group shadow-sm"
                                        >
                                        <span className="font-medium text-slate-700 group-hover:text-indigo-700">{CATEGORY_LABELS[type]}</span>
                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: Form */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Two Column Layout for better density */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            
                            {/* LEFT COLUMN: Identity & Core Info */}
                            <div className="md:col-span-7 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                                        <Tag size={14} /> Basic Information
                                    </h4>
                                    
                                    <InputField 
                                        label="Name / Title" 
                                        placeholder={`e.g. My ${CATEGORY_LABELS[selectedCategory]}`}
                                        value={formData.name}
                                        onChange={v => setFormData({...formData, name: v})}
                                        required
                                        autoFocus
                                    />

                                    {/* Dynamic Fields based on Category - Identity Group */}
                                    {['Cash_Bank', 'Cash_TermDeposit'].includes(selectedCategory) && (
                                        <InputField label="Bank Name" placeholder="e.g. ANZ, ASB" 
                                            icon={Building}
                                            value={formData.details.bank_name} onChange={v => updateDetail('bank_name', v)} />
                                    )}
                                    {['KiwiSaver', 'Invest_ManagedFund'].includes(selectedCategory) && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Provider" placeholder="e.g. Simplicity" icon={Building}
                                                    value={formData.details.provider} onChange={v => updateDetail('provider', v)} />
                                                <InputField label="Fund Name" placeholder="e.g. Growth" 
                                                    value={formData.details.fund_name} onChange={v => updateDetail('fund_name', v)} />
                                            </div>
                                            <SelectField label="Risk Profile" 
                                                options={['Defensive', 'Conservative', 'Balanced', 'Growth', 'Aggressive']}
                                                value={formData.details.risk_level} onChange={v => updateDetail('risk_level', v)} />
                                        </>
                                    )}
                                    {selectedCategory === 'Property' && (
                                        <InputField label="Address" placeholder="Full property address" icon={Home}
                                            value={formData.details.address} onChange={v => updateDetail('address', v)} />
                                    )}
                                    {selectedCategory === 'Mortgage' && (
                                        <InputField label="Lender" placeholder="e.g. Westpac" icon={Building}
                                            value={formData.details.lender} onChange={v => updateDetail('lender', v)} />
                                    )}
                                </div>
                                
                                {/* Additional Metadata Section */}
                                <div className="space-y-4 pt-2">
                                     <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                                        <Calendar size={14} /> Key Dates
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedCategory === 'Cash_TermDeposit' && (
                                            <>
                                                <InputField label="Term (Months)" type="number" placeholder="12"
                                                    value={formData.details.term_months} onChange={v => updateDetail('term_months', v)} />
                                                <InputField label="Maturity Date" type="date" 
                                                    value={formData.details.maturity_date ? formData.details.maturity_date.split('T')[0] : ''} onChange={v => updateDetail('maturity_date', v)} />
                                            </>
                                        )}
                                        {selectedCategory === 'Mortgage' && (
                                             <InputField label="Fixed Rate Until" type="date" 
                                                value={formData.details.fixed_until ? formData.details.fixed_until.split('T')[0] : ''} onChange={v => updateDetail('fixed_until', v)} />
                                        )}
                                        {selectedCategory === 'Property' && (
                                            <InputField label="Purchase Year" type="number" placeholder="YYYY"
                                                value={formData.details.purchase_year} onChange={v => updateDetail('purchase_year', v)} />
                                        )}
                                        {/* Fallback for others */}
                                        {!['Cash_TermDeposit', 'Mortgage', 'Property'].includes(selectedCategory) && (
                                            <div className="col-span-2 text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                No specific dates required for this category.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Financials */}
                            <div className="md:col-span-5 space-y-6">
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-5">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <DollarSign size={14} /> Valuation & Returns
                                    </h4>
                                    
                                    <InputField 
                                        label="Current Value (NZD)" 
                                        type="number" 
                                        placeholder="0.00" 
                                        icon={DollarSign}
                                        value={formData.value}
                                        onChange={v => setFormData({...formData, value: v})}
                                        required
                                        className="text-lg font-bold text-slate-700"
                                    />
                                    
                                    {/* Interest / Return Rate */}
                                    {(['Cash_Bank', 'Cash_TermDeposit', 'Mortgage', 'Loan_Personal', 'Loan_Student'].includes(selectedCategory)) && (
                                        <div className="relative">
                                            <InputField label="Interest Rate (%)" type="number" placeholder="0.00" 
                                                icon={Percent}
                                                value={formData.details.interest_rate} onChange={v => updateDetail('interest_rate', v)} />
                                            
                                            {/* Estimated Return Badge */}
                                            {estimatedReturn > 0 && recordType === 'Asset' && (
                                                <div className="mt-3 bg-emerald-100/50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3">
                                                    <TrendingUp size={16} className="text-emerald-600 mt-0.5" />
                                                    <div>
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide block">Est. Annual Return</span>
                                                        <span className="text-sm font-bold text-emerald-800">
                                                            +${estimatedReturn.toLocaleString('en-NZ', {maximumFractionDigits: 0})}
                                                            <span className="text-xs font-normal text-emerald-600 ml-1">/ yr</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedCategory === 'Property' && (
                                         <InputField label="Original Purchase Price" type="number" prefix="$"
                                            value={formData.details.purchase_price} onChange={v => updateDetail('purchase_price', v)} />
                                    )}
                                </div>

                                {/* Liquidity Toggle */}
                                {recordType === 'Asset' && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 block">Liquid Asset</label>
                                            <span className="text-xs text-slate-500">Can be accessed easily?</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({...prev, is_liquid: !prev.is_liquid}))}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_liquid ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_liquid ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                )}
             </>
          )}
        </div>

        {/* Footer */}
        {step === 2 && !showPassiveIncomePrompt && (
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
             <div className="flex items-center gap-3">
              {assetToEdit ? (
                <>
                  {assetToEdit.record_type === 'Asset' && (
                    <button
                      type="button"
                      onClick={handleOpenConversion}
                      className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                    >
                      <ArrowRightLeft size={16} /> Convert Asset
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="text-sm font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setStep(1); setOcrSuccess(false); }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800"
                >
                  Back
                </button>
              )}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all disabled:opacity-50 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
              {assetToEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// UI Components
const InputField = ({ label, type = "text", placeholder, value, onChange, icon: Icon, prefix, required, className, autoFocus }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />}
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{prefix}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-3 transition-all outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 ${Icon || prefix ? 'pl-10' : 'pl-4'} pr-4 ${className}`}
      />
    </div>
  </div>
);

const SelectField = ({ label, options, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-3 pl-4 pr-10 appearance-none outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
      >
        <option value="" disabled>Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ArrowRight size={14} className="rotate-90" />
      </div>
    </div>
  </div>
);

const Loader = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default AssetFormModal;