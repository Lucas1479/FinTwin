import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Upload, Check, ScanLine, DollarSign, Calendar, Building, Tag, 
  Percent, ArrowRight, Trash2, TrendingUp, Sparkles, ArrowRightLeft,
  Briefcase, Home, Car, CreditCard, Shield, Banknote, HelpCircle, AlertCircle,
  Zap, Loader2, ArrowLeft, Landmark, PieChart, Coins
} from 'lucide-react';
import { createAsset, updateAsset, deleteAsset } from '../../services/wealthService';
import { createPassiveIncome } from '../../services/cashFlowService';
import productService from '../../services/productService';

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

const CATEGORY_DESCRIPTIONS = {
  Cash_Bank: 'Current or savings accounts',
  Cash_TermDeposit: 'Fixed term investments',
  Cash_Physical: 'Physical cash or gold',
  Invest_Shares: 'Stock market investments',
  Invest_ManagedFund: 'Mutual funds or ETFs',
  KiwiSaver: 'Retirement savings fund',
  Property: 'Residential or commercial',
  Vehicle: 'Cars, boats, or bikes',
  Other_Asset: 'Art, collectibles, etc.',
  Mortgage: 'Property-backed loans',
  Loan_Personal: 'Unsecured personal debt',
  Loan_Student: 'Educational financing',
  Credit_Card: 'Credit line balances',
  Other_Liability: 'Miscellaneous debts'
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
        
        const baseFormData = {
          name: assetToEdit.name,
          value: assetToEdit.value,
          currency: assetToEdit.currency || 'NZD',
          is_liquid: assetToEdit.is_liquid ?? false,
          details: assetToEdit.asset_details || {}
        };
        
        setFormData(baseFormData);
        
        // If asset has source_product_id, fetch product details
        if (assetToEdit.source_product_id) {
          productService.getProductById(assetToEdit.source_product_id)
            .then(product => {
              if (product) {
                setFormData(prev => ({
                  ...prev,
                  details: {
                    ...prev.details,
                    provider: product.provider || prev.details.provider,
                    fund_name: product.name || prev.details.fund_name,
                    risk_level: product.strategy || prev.details.risk_level
                  }
                }));
              }
            })
            .catch(err => {
              console.warn('Failed to fetch product details:', err);
            });
        }
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

  const renderCategoryIcon = (category, size = 20, className = "text-indigo-600") => {
      if (category?.includes('Cash')) return <Banknote size={size} className={className} />;
      if (category?.includes('Invest')) return <TrendingUp size={size} className={className} />;
      if (category === 'Property') return <Home size={size} className={className} />;
      if (category === 'Vehicle') return <Car size={size} className={className} />;
      if (category === 'Mortgage') return <Landmark size={size} className={className} />;
      if (category?.includes('Loan') || category?.includes('Card')) return <CreditCard size={size} className={className} />;
      return <Briefcase size={size} className={className} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-500/20 transition-opacity">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header - Reimagined for Balance */}
        <div className="px-10 pt-8 pb-6 border-b border-slate-100 bg-white sticky top-0 z-10 space-y-6">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {assetToEdit ? 'Edit Details' : (step === 1 ? 'Add New Item' : CATEGORY_LABELS[selectedCategory])}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                {assetToEdit ? 'Update your portfolio item' : (step === 1 ? 'Choose a type to begin tracking your wealth' : `Fill in the details for your ${CATEGORY_LABELS[selectedCategory].toLowerCase()}`)}
                </p>
             </div>
             <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
             </button>
          </div>

          {/* Symmetrical Mode Selector for Step 1 */}
          {step === 1 && !assetToEdit && (
              <div className="flex bg-slate-100 p-1.5 rounded-[18px] shadow-inner w-full max-w-md mx-auto">
                  {['Asset', 'Liability'].map(type => (
                      <button 
                      key={type}
                      onClick={() => setRecordType(type)}
                      className={`flex-1 py-3 rounded-[14px] text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${recordType === type 
                          ? (type === 'Asset' ? 'bg-white text-indigo-600 shadow-md' : 'bg-white text-rose-600 shadow-md') 
                          : 'text-slate-500 hover:text-slate-700'}`}
                      >
                      {type === 'Asset' ? <TrendingUp size={16} /> : <CreditCard size={16} />}
                      {type}
                      </button>
                  ))}
              </div>
          )}

          {/* Breadcrumb for Step 2 */}
          {step === 2 && !assetToEdit && (
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors group w-fit"
              >
                  <div className="p-1 rounded-full bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <span>Back to {recordType}s</span>
              </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          
          {/* PASSIVE INCOME PROMPT */}
          {showPassiveIncomePrompt && pendingAsset ? (
            <div className="max-w-md mx-auto space-y-8 text-center animate-in fade-in slide-in-from-bottom-6 duration-500 py-10">
               <div className="relative">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                    <Check size={48} className="text-emerald-600" />
                  </div>
                  <div className="absolute top-0 right-1/3 animate-bounce">
                    <Sparkles className="text-amber-400" size={24} />
                  </div>
               </div>

              <div>
                <h3 className="text-3xl font-bold text-slate-900 mb-3">Item Created!</h3>
                <p className="text-slate-500 text-lg">
                  <span className="font-bold text-slate-800">{pendingAsset.name}</span> has been added to your portfolio.
                </p>
              </div>

              <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <TrendingUp size={120} />
                  </div>
                  
                  <div className="relative z-10 text-left">
                    <h4 className="font-bold text-indigo-900 text-lg mb-2 flex items-center gap-2">
                        <Coins size={20} className="text-indigo-500" />
                        Smart Recommendation
                    </h4>
                    <p className="text-sm text-indigo-700 leading-relaxed mb-6">
                        We detected an interest rate on this asset. Would you like to automatically track the monthly interest as passive income?
                    </p>
                    
                    <div className="bg-white rounded-[20px] p-5 border border-indigo-100 flex justify-between items-center shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Est. Monthly Return</span>
                            <span className="text-2xl font-black text-emerald-600">+{formatCurrency(calculatedInterest.monthly)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Yearly</span>
                            <span className="text-sm font-bold text-slate-600">{formatCurrency(calculatedInterest.yearly)}</span>
                          </div>
                    </div>
                  </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={handleSkipPassiveIncome} className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Not Now</button>
                <button onClick={handleCreatePassiveIncome} className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                    <Plus size={20} className="hidden sm:block" />
                    Track Income
                </button>
              </div>
            </div>
          ) : (
            <>
                {/* STEP 1: Category Selection */}
                {step === 1 && !assetToEdit && (
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(CATEGORIES[recordType]).map(([group, types]) => (
                                <div key={group} className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        {group}
                                    </h3>
                                    <div className="space-y-3">
                                    {types.map(type => (
                                        <button
                                        key={type}
                                        onClick={() => { setSelectedCategory(type); setStep(2); }}
                                        className="w-full text-left p-4 rounded-[20px] bg-white border border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-center gap-4 group"
                                        >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${recordType === 'Liability' ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                            {renderCategoryIcon(type, 22, "currentColor")}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{CATEGORY_LABELS[type]}</div>
                                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{CATEGORY_DESCRIPTIONS[type]}</div>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
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
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* 1. AI Assistant Section (If creating) */}
                        {!assetToEdit && (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-[24px] p-8 text-center transition-all cursor-pointer group overflow-hidden
                                ${isUploading ? 'border-indigo-300 bg-indigo-50' : (ocrSuccess ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30')}
                                `}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                
                                {isUploading ? (
                                    <div className="flex flex-col items-center py-2">
                                        <div className="relative">
                                            <ScanLine className="text-indigo-500 mb-4 animate-pulse" size={40} />
                                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                                        </div>
                                        <p className="text-sm font-black text-indigo-700 uppercase tracking-widest">Analyzing Statement...</p>
                                    </div>
                                ) : ocrSuccess ? (
                                    <div className="flex flex-col items-center py-2">
                                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                                            <Check size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-emerald-700">Auto-fill Successful!</p>
                                        <p className="text-xs text-emerald-600 font-medium mt-1">We've pre-filled the form with the detected data.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-10">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 group-hover:shadow-indigo-100 transition-all duration-300 mb-3">
                                                <Zap size={28} fill="currentColor" className="opacity-80" />
                                            </div>
                                            <div className="text-xs font-black text-indigo-600 uppercase tracking-wider">AI Auto-Fill</div>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-lg font-bold text-slate-800">Smart Asset Scanner</p>
                                            <p className="text-sm text-slate-500 max-w-[280px] mt-1">Upload a screenshot of your bank app or statement to fill in the details automatically.</p>
                                        </div>
                                        <div className="ml-auto">
                                            <div className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 group-hover:bg-indigo-700 transition-all">
                                                Upload Image
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. Form Fields Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            
                            {/* LEFT COLUMN: Identity & Group Info */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="space-y-6">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">
                                        <Tag size={14} /> Identity & Info
                                    </h4>
                                    
                                    <InputField 
                                        label="Name / Description" 
                                        placeholder={`e.g. My ${CATEGORY_LABELS[selectedCategory]}`}
                                        value={formData.name}
                                        onChange={v => setFormData({...formData, name: v})}
                                        required
                                        autoFocus
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {/* Dynamic Fields based on Category */}
                                        {['Cash_Bank', 'Cash_TermDeposit'].includes(selectedCategory) && (
                                            <InputField label="Bank Name" placeholder="e.g. ANZ, Westpac" 
                                                icon={Landmark}
                                                value={formData.details.bank_name} onChange={v => updateDetail('bank_name', v)} />
                                        )}
                                        {['KiwiSaver', 'Invest_ManagedFund'].includes(selectedCategory) && (
                                            <InputField label="Provider" placeholder="e.g. Simplicity, Milford" icon={Landmark}
                                                value={formData.details.provider} 
                                                onChange={v => updateDetail('provider', v)} 
                                                disabled={assetToEdit?.source_product_id}
                                            />
                                        )}
                                        {['KiwiSaver', 'Invest_ManagedFund'].includes(selectedCategory) && (
                                            <InputField label="Fund Name" placeholder="e.g. Growth Fund" 
                                                value={formData.details.fund_name} 
                                                onChange={v => updateDetail('fund_name', v)}
                                                disabled={assetToEdit?.source_product_id}
                                            />
                                        )}
                                        {['KiwiSaver', 'Invest_ManagedFund'].includes(selectedCategory) && (
                                            <SelectField label="Risk Profile" 
                                                options={['Defensive', 'Conservative', 'Balanced', 'Growth', 'Aggressive']}
                                                value={formData.details.risk_level} 
                                                onChange={v => updateDetail('risk_level', v)}
                                                disabled={assetToEdit?.source_product_id}
                                            />
                                        )}
                                        {selectedCategory === 'Property' && (
                                            <div className="col-span-2">
                                                <InputField label="Property Address" placeholder="Full address" icon={Home}
                                                    value={formData.details.address} onChange={v => updateDetail('address', v)} />
                                            </div>
                                        )}
                                        {selectedCategory === 'Mortgage' && (
                                            <InputField label="Lender" placeholder="e.g. Westpac" icon={Landmark}
                                                value={formData.details.lender} onChange={v => updateDetail('lender', v)} />
                                        )}
                                        {selectedCategory === 'Vehicle' && (
                                            <>
                                                <InputField label="Make & Model" placeholder="e.g. Tesla Model 3" icon={Car}
                                                    value={formData.details.model} onChange={v => updateDetail('model', v)} />
                                                <InputField label="Year" type="number" placeholder="2023"
                                                    value={formData.details.year} onChange={v => updateDetail('year', v)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Dates Section */}
                                <div className="space-y-6 pt-2">
                                     <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">
                                        <Calendar size={14} /> Timeframe
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
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
                                        {!['Cash_TermDeposit', 'Mortgage', 'Property'].includes(selectedCategory) && (
                                            <div className="col-span-2 text-xs text-slate-400 font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 italic">
                                                No specific dates required for this category.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Financials */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-8 shadow-inner">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <PieChart size={14} className="text-indigo-500" /> Valuation & Returns
                                    </h4>
                                    
                                    <InputField 
                                        label="Current Balance / Value" 
                                        type="number" 
                                        placeholder="0.00" 
                                        prefix="$"
                                        value={formData.value}
                                        onChange={v => setFormData({...formData, value: v})}
                                        required
                                        className="text-2xl font-black text-slate-800"
                                    />
                                    
                                    {(['Cash_Bank', 'Cash_TermDeposit', 'Mortgage', 'Loan_Personal', 'Loan_Student'].includes(selectedCategory)) && (
                                        <div className="space-y-5">
                                            <InputField label="Interest Rate (%)" type="number" placeholder="0.00" 
                                                icon={Percent}
                                                value={formData.details.interest_rate} onChange={v => updateDetail('interest_rate', v)} />
                                            
                                            {/* Impact Preview Card */}
                                            {estimatedReturn !== 0 && (
                                                <div className={`rounded-2xl p-5 border flex items-start gap-4 transition-all duration-500 ${recordType === 'Asset' ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' : 'bg-rose-50 border-rose-100 shadow-rose-50'} shadow-lg`}>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${recordType === 'Asset' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {recordType === 'Asset' ? <TrendingUp size={20} /> : <ArrowRightLeft size={20} className="rotate-90" />}
                                                    </div>
                                                    <div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${recordType === 'Asset' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {recordType === 'Asset' ? 'Est. Annual Return' : 'Est. Annual Cost'}
                                                        </span>
                                                        <span className={`text-xl font-black ${recordType === 'Asset' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {recordType === 'Asset' ? '+' : '-'}{formatCurrency(Math.abs(estimatedReturn))}
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

                                {/* Status Options Card */}
                                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm">
                                     <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <Shield size={14} /> Status & Settings
                                    </h4>
                                    
                                    {recordType === 'Asset' && (
                                        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_liquid ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <ArrowRightLeft size={18} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold text-slate-800 block">Liquid Asset</label>
                                                    <span className="text-[10px] font-medium text-slate-500">Accessible within 24 hours</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({...prev, is_liquid: !prev.is_liquid}))}
                                                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${formData.is_liquid ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${formData.is_liquid ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-slate-800 block">Category Label</label>
                                                <span className="text-[10px] font-medium text-slate-500 uppercase">{CATEGORY_LABELS[selectedCategory]}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Locked</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
             </>
          )}
        </div>

        {/* Footer */}
        {step === 2 && !showPassiveIncomePrompt && (
          <div className="px-10 py-6 bg-white border-t border-slate-100 flex justify-between items-center sticky bottom-0">
             <div className="flex items-center gap-4">
              {assetToEdit ? (
                <>
                  <button 
                    type="button"
                    onClick={handleDelete}
                    className="group flex items-center gap-2 px-5 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Delete Item</span>
                  </button>
                  
                  {assetToEdit.record_type === 'Asset' && (
                    <button
                      type="button"
                      onClick={handleOpenConversion}
                      className="flex items-center gap-2 px-5 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all"
                    >
                      <ArrowRightLeft size={18} />
                      <span>Convert Asset</span>
                    </button>
                  )}
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setStep(1); setOcrSuccess(false); }}
                  className="flex items-center gap-2 px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span>Back to Categories</span>
                </button>
              )}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-[20px] font-black text-sm shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all disabled:opacity-50 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              <span>{assetToEdit ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Helper Functions ---
const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { 
  style: 'currency', 
  currency: 'NZD',
  minimumFractionDigits: 0
}).format(val);

// UI Components
const InputField = ({ label, type = "text", placeholder, value, onChange, icon: Icon, prefix, required, className, autoFocus, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
        {disabled && <span className="text-xs normal-case text-slate-400 font-medium ml-1">(LOCKED)</span>}
    </label>
    <div className="relative group">
      {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />}
      {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{prefix}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`w-full bg-slate-100/50 border border-slate-100 text-slate-900 text-sm font-bold rounded-2xl py-3.5 transition-all outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 ${Icon || prefix ? 'pl-12' : 'pl-5'} pr-5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      />
    </div>
  </div>
);

const SelectField = ({ label, options, value, onChange, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
      {disabled && <span className="text-xs normal-case text-slate-400 font-medium ml-1">(LOCKED)</span>}
    </label>
    <div className="relative group">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-slate-100/50 border border-slate-100 text-slate-900 text-sm font-bold rounded-2xl py-3.5 pl-5 pr-12 appearance-none outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 cursor-pointer transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <option value="" disabled>Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
        <ArrowRight size={16} className="rotate-90" />
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