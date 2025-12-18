import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, DollarSign, Repeat, Clock } from 'lucide-react';
import { createCashFlow, updateCashFlow, deleteCashFlow } from '../../services/cashFlowService';

const FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Yearly'];

const CATEGORIES = {
  Income: ['Salary', 'Side Hustle', 'Investment', 'Other'],
  Expense: ['Housing', 'Living', 'Transport', 'Utilities', 'Insurance', 'Entertainment', 'Health', 'Tech', 'Other'],
  Subscription: ['Entertainment', 'Productivity', 'Tech', 'Health', 'Other']
};

const CashFlowFormModal = ({ isOpen, onClose, onRefresh, itemToEdit = null, defaultType = 'Income' }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: defaultType,
    category: '',
    frequency: 'Monthly',
    timing_mode: 'Specific_Date', // Specific_Date vs Daily_Spread
    anchor_date: 1, // 1-31 or 1-7
    start_date: '', // YYYY-MM-DD for fortnightly reference
    is_variable: false
  });

  // Init Form on Open
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({
          name: itemToEdit.name,
          amount: itemToEdit.amount,
          type: itemToEdit.type,
          category: itemToEdit.category,
          frequency: itemToEdit.frequency,
          timing_mode: itemToEdit.timing_mode || 'Specific_Date',
          anchor_date: itemToEdit.anchor_date || 1,
          start_date: itemToEdit.start_date ? itemToEdit.start_date.split('T')[0] : '',
          is_variable: itemToEdit.is_variable
        });
      } else {
        setFormData({
          name: '',
          amount: '',
          type: defaultType,
          category: CATEGORIES[defaultType][0],
          frequency: 'Monthly',
          timing_mode: 'Specific_Date',
          anchor_date: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_variable: false
        });
      }
    }
  }, [isOpen, itemToEdit, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        anchor_date: Number(formData.anchor_date)
      };

      if (itemToEdit) {
        await updateCashFlow(itemToEdit._id, payload);
      } else {
        await createCashFlow(payload);
      }

      onRefresh();
      onClose();
    } catch (error) {
      console.error("Failed to save flow:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this item?")) return;
    setLoading(true);
    try {
      await deleteCashFlow(itemToEdit._id);
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Helper to render timing inputs
  const renderTimingInputs = () => {
    const { frequency, timing_mode } = formData;

    // Daily Spread Option (Good for Groceries/Fuel)
    if (timing_mode === 'Daily_Spread') {
      return (
        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-start gap-3">
          <Clock className="text-indigo-500 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-indigo-700">Daily Spread Mode</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              This amount is smoothed out over the period. Useful for budgets like Groceries or Fuel where spending happens continuously.
            </p>
          </div>
        </div>
      );
    }

    // Specific Date Logic
    if (frequency === 'Weekly') {
      return (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Occurs On</label>
          <div className="flex gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFormData({...formData, anchor_date: idx + 1})}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${formData.anchor_date === idx + 1 ? 'bg-indigo-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (frequency === 'Monthly') {
      return (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Day of Month</label>
          <div className="flex items-center gap-3">
             <div className="relative">
                <input 
                  type="number" 
                  min="1" max="31"
                  value={formData.anchor_date}
                  onChange={(e) => setFormData({...formData, anchor_date: e.target.value})}
                  className="w-20 pl-4 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">th</span>
             </div>
             <p className="text-xs text-slate-400">of every month</p>
          </div>
        </div>
      );
    }

    if (frequency === 'Fortnightly') {
      return (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Start Date (Reference)</label>
          <input 
            type="date" 
            value={formData.start_date}
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1.5 ml-1">System will project every 14 days from this date.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {itemToEdit ? 'Edit Item' : `Add ${formData.type}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure amount and timing</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Type Selector (only if creating) */}
          {!itemToEdit && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['Income', 'Expense', 'Subscription'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({...formData, type: t, category: CATEGORIES[t][0]})}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Salary, Rent, Netflix"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
             
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {CATEGORIES[formData.type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={14} /> Timing & Frequency
            </h4>
            
            <div className="space-y-6">
               <div className="flex gap-4">
                  <div className="flex-1">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Frequency</label>
                     <select 
                       value={formData.frequency}
                       onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                       className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                     >
                       {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                  </div>
                  
                  {/* Mode Toggle: Discrete vs Continuous */}
                  {formData.frequency !== 'One-Off' && (
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mode</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg h-[42px]">
                         <button 
                           type="button"
                           onClick={() => setFormData({...formData, timing_mode: 'Specific_Date'})}
                           className={`flex-1 rounded-md text-[10px] font-bold leading-tight px-1 transition-all ${formData.timing_mode === 'Specific_Date' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                         >
                           Specific Date
                         </button>
                         <button 
                           type="button"
                           onClick={() => setFormData({...formData, timing_mode: 'Daily_Spread'})}
                           className={`flex-1 rounded-md text-[10px] font-bold leading-tight px-1 transition-all ${formData.timing_mode === 'Daily_Spread' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                         >
                           Spread Evenly
                         </button>
                      </div>
                    </div>
                  )}
               </div>

               {/* Dynamic Timing Inputs */}
               {renderTimingInputs()}

               {/* Variable Toggle */}
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.is_variable ? 'bg-indigo-600' : 'bg-slate-200'}`} onClick={() => setFormData({...formData, is_variable: !formData.is_variable})}>
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${formData.is_variable ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">Variable Amount (Estimate)</span>
               </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            {itemToEdit ? (
                <button type="button" onClick={handleDelete} className="text-sm font-bold text-rose-500 hover:text-rose-700">Delete</button>
            ) : (
                <div></div>
            )}
            
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-indigo-200 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Save Rule
            </button>
        </div>

      </div>
    </div>
  );
};

export default CashFlowFormModal;

