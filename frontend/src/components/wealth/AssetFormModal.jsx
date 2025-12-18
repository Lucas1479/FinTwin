import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Check, ScanLine, DollarSign, Calendar, Building, Tag, Percent, ArrowRight, Trash2 } from 'lucide-react';
import { createAsset, updateAsset, deleteAsset } from '../../services/wealthService';

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

const AssetFormModal = ({ isOpen, onClose, onRefresh, assetToEdit = null }) => {
  const [recordType, setRecordType] = useState('Asset');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    currency: 'NZD',
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
          details: assetToEdit.asset_details || {}
        });
      } else {
        // Create Mode
        setStep(1);
        setRecordType('Asset');
        setSelectedCategory('');
        setFormData({ name: '', value: '', currency: 'NZD', details: {} });
      }
      setOcrSuccess(false);
    }
  }, [isOpen, assetToEdit]);

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
        is_liquid: ['Cash_Bank', 'Cash_Physical', 'Invest_Shares'].includes(selectedCategory),
        asset_details: formData.details
      };

      if (assetToEdit) {
        await updateAsset(assetToEdit._id, payload);
      } else {
        await createAsset(payload);
      }

      onRefresh();
      onClose();
    } catch (error) {
      console.error("Failed to save asset:", error);
    } finally {
      setLoading(false);
    }
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

  const updateDetail = (field, value) => {
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, [field]: value }
    }));
  };

  // Render Specific Fields based on Category
  const renderSpecificFields = () => {
    switch (selectedCategory) {
      case 'Cash_Bank':
      case 'Cash_TermDeposit':
        return (
          <>
            <InputField label="Bank Name" placeholder="e.g. ANZ" 
              value={formData.details.bank_name} onChange={v => updateDetail('bank_name', v)} />
            <InputField label="Interest Rate (%)" type="number" placeholder="0.0" 
              value={formData.details.interest_rate} onChange={v => updateDetail('interest_rate', v)} />
            {selectedCategory === 'Cash_TermDeposit' && (
              <>
                <InputField label="Term (Months)" type="number" 
                  value={formData.details.term_months} onChange={v => updateDetail('term_months', v)} />
                <InputField label="Maturity Date" type="date" 
                  value={formData.details.maturity_date ? formData.details.maturity_date.split('T')[0] : ''} onChange={v => updateDetail('maturity_date', v)} />
              </>
            )}
          </>
        );
      case 'KiwiSaver':
      case 'Invest_ManagedFund':
        return (
          <>
            <InputField label="Provider" placeholder="e.g. Simplicity" 
              value={formData.details.provider} onChange={v => updateDetail('provider', v)} />
            <InputField label="Fund Name" placeholder="e.g. Growth Fund" 
              value={formData.details.fund_name} onChange={v => updateDetail('fund_name', v)} />
            <SelectField label="Risk Profile" 
              options={['Defensive', 'Conservative', 'Balanced', 'Growth', 'Aggressive']}
              value={formData.details.risk_level} onChange={v => updateDetail('risk_level', v)} />
          </>
        );
      case 'Property':
        return (
          <>
            <InputField label="Address" placeholder="123 Main St" 
              value={formData.details.address} onChange={v => updateDetail('address', v)} />
            <InputField label="Purchase Price" type="number" prefix="$"
              value={formData.details.purchase_price} onChange={v => updateDetail('purchase_price', v)} />
            <InputField label="Purchase Year" type="number" 
              value={formData.details.purchase_year} onChange={v => updateDetail('purchase_year', v)} />
          </>
        );
      case 'Mortgage':
        return (
          <>
            <InputField label="Lender" placeholder="e.g. Westpac" 
              value={formData.details.lender} onChange={v => updateDetail('lender', v)} />
            <InputField label="Interest Rate (%)" type="number" 
              value={formData.details.interest_rate} onChange={v => updateDetail('interest_rate', v)} />
            <InputField label="Fixed Until" type="date" 
              value={formData.details.fixed_until ? formData.details.fixed_until.split('T')[0] : ''} onChange={v => updateDetail('fixed_until', v)} />
          </>
        );
      default:
        return (
          <div className="text-sm text-slate-400 italic col-span-2">
            No specific details required for this category.
          </div>
        );
    }
  };

  return (
    // Clean Dialog without heavy blur
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {assetToEdit ? 'Edit Asset' : (step === 1 ? 'Add New Item' : `Add ${CATEGORY_LABELS[selectedCategory]}`)}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {assetToEdit ? 'Update details below' : (step === 1 ? 'Select the type of asset or liability to add' : 'Fill in the details below')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* STEP 1: Category Selection (Create Mode Only) */}
          {step === 1 && !assetToEdit && (
            <div className="space-y-8">
              {/* Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto">
                <button 
                  onClick={() => setRecordType('Asset')}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${recordType === 'Asset' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Asset
                </button>
                <button 
                  onClick={() => setRecordType('Liability')}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${recordType === 'Liability' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Liability
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(CATEGORIES[recordType]).map(([group, types]) => (
                  <div key={group} className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">{group}</h3>
                    <div className="space-y-2">
                      {types.map(type => (
                        <button
                          key={type}
                          onClick={() => { setSelectedCategory(type); setStep(2); }}
                          className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-100 hover:border-brand-200 transition-all flex items-center justify-between group"
                        >
                          <span className="font-medium text-slate-700 group-hover:text-brand-700">{CATEGORY_LABELS[type]}</span>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Form Details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* OCR Dropzone (Create Mode Only) */}
              {!assetToEdit && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group overflow-hidden
                    ${isUploading ? 'border-brand-300 bg-brand-50' : (ocrSuccess ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50')}
                  `}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center py-4">
                      <ScanLine className="animate-pulse text-brand-500 mb-3" size={32} />
                      <p className="text-sm font-medium text-brand-700">Analyzing document...</p>
                    </div>
                  ) : ocrSuccess ? (
                    <div className="flex flex-col items-center py-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600">
                        <Check size={20} />
                      </div>
                      <p className="text-sm font-bold text-green-700">Data Extracted!</p>
                      <p className="text-xs text-green-600">We filled in what we found.</p>
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Upload size={20} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Auto-fill with AI</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Upload a screenshot of your bank app or statement</p>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="Name" 
                    placeholder={CATEGORY_LABELS[selectedCategory]} 
                    icon={Tag} 
                    value={formData.name}
                    onChange={v => setFormData({...formData, name: v})}
                    required
                  />
                  <InputField 
                    label="Value (NZD)" 
                    type="number" 
                    placeholder="0.00" 
                    icon={DollarSign}
                    value={formData.value}
                    onChange={v => setFormData({...formData, value: v})}
                    required
                  />
                </div>
              </div>

              {/* Specific Fields */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  {renderSpecificFields()}
                </div>
              </div>

            </form>
          )}

        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            
            {/* Left: Back (Create) or Delete (Edit) */}
            <div>
              {assetToEdit ? (
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="text-sm font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setStep(1); setOcrSuccess(false); }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Back
                </button>
              )}
            </div>

            {/* Right: Save */}
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-brand-200 transition-all disabled:opacity-50 flex items-center gap-2"
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

// UI Helpers
const InputField = ({ label, type = "text", placeholder, value, onChange, icon: Icon, prefix, required }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative group">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />}
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{prefix}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-2.5 transition-all outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${Icon || prefix ? 'pl-9' : 'pl-4'} pr-4`}
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
        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-2.5 pl-4 pr-8 appearance-none outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 cursor-pointer"
      >
        <option value="" disabled>Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1"/></svg>
      </div>
    </div>
  </div>
);

const Loader = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default AssetFormModal;

