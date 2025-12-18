import React, { useState, useEffect } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, Plus, DollarSign, 
  CreditCard, Repeat, ShoppingBag, Briefcase, Zap, 
  TrendingUp, Home, Car, Smartphone, Coffee, Layers,
  Calendar
} from 'lucide-react';
import { getCashFlows } from '../../services/cashFlowService';
import { Loader2 } from 'lucide-react';
import CashFlowProjectionChart from '../../components/wealth/CashFlowProjectionChart';
import CashFlowFormModal from '../../components/wealth/CashFlowFormModal';

const TO_ANNUAL = {
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Yearly': 1,
  'One-Off': 0
};

const FREQUENCY_LABELS = {
  'Weekly': '/ week',
  'Fortnightly': '/ fortnight',
  'Monthly': '/ month',
  'Yearly': '/ year',
};

const WealthCashflow = () => {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [allFlows, setAllFlows] = useState([]);
  const [viewMode, setViewMode] = useState('Weekly');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('Income');
  const [editingFlow, setEditingFlow] = useState(null);

  const fetchFlows = async () => {
    try {
      const flows = await getCashFlows();
      setAllFlows(flows);
      setIncomes(flows.filter(f => f.type === 'Income'));
      setExpenses(flows.filter(f => f.type === 'Expense'));
      setSubscriptions(flows.filter(f => f.type === 'Subscription'));
    } catch (err) {
      console.error("Failed to fetch cash flows", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleAdd = (type) => {
    setEditingFlow(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleEdit = (flow) => {
    setEditingFlow(flow);
    setIsModalOpen(true);
  };

  // Helper to get Icon
  const getIconForCategory = (category) => {
    switch (category) {
      case 'Housing': return Home;
      case 'Living': return ShoppingBag;
      case 'Transport': return Car;
      case 'Bills': 
      case 'Utilities': return Zap;
      case 'Salary': return Briefcase;
      case 'Side Hustle': return Zap;
      case 'Investment': return TrendingUp;
      case 'Insurance': return Layers;
      default: return DollarSign;
    }
  };

  // --- Normalization Logic ---
  // 1. Convert any amount to Annual
  const toAnnual = (amount, frequency) => {
    return amount * (TO_ANNUAL[frequency] || 0);
  };

  // 2. Convert Annual to Target View Mode
  const fromAnnual = (annualAmount, targetMode) => {
    const divider = TO_ANNUAL[targetMode] || 1;
    if (divider === 0) return 0;
    return annualAmount / divider;
  };

  // 3. Helper: Item -> View Amount
  const getViewAmount = (item) => {
    const annual = toAnnual(item.amount, item.frequency);
    return fromAnnual(annual, viewMode);
  };

  // Calculations (Normalized to View Mode)
  const totalIncome = incomes.reduce((sum, item) => sum + getViewAmount(item), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + getViewAmount(item), 0);
  const totalSubs = subscriptions.reduce((sum, item) => sum + getViewAmount(item), 0);
  const totalOutflow = totalExpenses + totalSubs;
  const netFlow = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* 1. Header & KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Net Flow Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:col-span-2 flex flex-col relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-50 to-transparent opacity-50"></div>
          
          {/* Header Row: Title + Toggle */}
          <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">Net Cash Flow</h3>
            
            {/* Frequency Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['Weekly', 'Fortnightly', 'Monthly', 'Yearly'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${viewMode === mode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {mode === 'Fortnightly' ? 'F/N' : mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(netFlow)}</span>
            <span className={`text-sm font-medium px-2 py-1 rounded-lg ${savingsRate >= 20 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
              +{savingsRate.toFixed(1)}% Savings Rate
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-2 relative z-10">
            You are saving <span className="font-bold text-slate-700">{formatCurrency(netFlow)}</span> {FREQUENCY_LABELS[viewMode]}.
            <br className="hidden sm:block"/>
            This surplus is available for your goals and investments.
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 h-3 bg-slate-100 rounded-full overflow-hidden flex relative z-10">
            <div className="h-full bg-indigo-500" style={{ width: `${Math.min((totalOutflow / totalIncome) * 100, 100)}%` }}></div>
            <div className="h-full bg-emerald-400" style={{ width: `${Math.max(savingsRate, 0)}%` }}></div>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 uppercase tracking-wide relative z-10">
            <span>Expenses ({totalIncome > 0 ? ((totalOutflow / totalIncome) * 100).toFixed(0) : 0}%)</span>
            <span>Savings ({savingsRate.toFixed(0)}%)</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Income</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncome)}</p>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{FREQUENCY_LABELS[viewMode]}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <ArrowUpCircle size={20} />
            </div>
          </div>
          <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalOutflow)}</p>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{FREQUENCY_LABELS[viewMode]}</p>
            </div>
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <ArrowDownCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Projection Chart */}
      <CashFlowProjectionChart flows={allFlows} />

      {/* 3. Lists (Income / Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Income Streams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              Income Streams
            </h3>
            <button 
              onClick={() => handleAdd('Income')}
              className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus size={16} /> Add Income
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[100px]">
            {incomes.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">No income streams added yet.</div>
            ) : incomes.map((item) => {
              const Icon = getIconForCategory(item.category);
              const displayAmount = getViewAmount(item);
              
              return (
                <div 
                  key={item._id} 
                  onClick={() => handleEdit(item)}
                  className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.frequency}</span>
                        {item.timing_mode === 'Daily_Spread' && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Spread</span>}
                        {item.is_variable && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Variable</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(displayAmount)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{FREQUENCY_LABELS[viewMode]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses & Subscriptions */}
        <div className="space-y-6">
          
          {/* Major Expenses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                Budgets & Expenses
              </h3>
              <button 
                onClick={() => handleAdd('Expense')}
                className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus size={16} /> Add Expense
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[100px]">
              {expenses.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">No expenses added yet.</div>
              ) : expenses.map((item) => {
                const Icon = getIconForCategory(item.category);
                const displayAmount = getViewAmount(item);

                return (
                  <div 
                    key={item._id} 
                    onClick={() => handleEdit(item)}
                    className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.frequency}</span>
                          {item.timing_mode === 'Daily_Spread' && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Spread</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(displayAmount)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{FREQUENCY_LABELS[viewMode]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subscriptions Tracker */}
          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
             {/* Decorative circles */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-800 rounded-full opacity-50 blur-2xl"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-800 rounded-full opacity-50 blur-2xl"></div>

             <div className="flex justify-between items-start mb-6 relative z-10">
               <div>
                 <h4 className="text-lg font-bold flex items-center gap-2">
                   <Repeat size={18} className="text-indigo-300"/> Subscription Tracker
                 </h4>
                 <p className="text-indigo-200 text-xs mt-1">Monthly recurring payments</p>
               </div>
               <div className="text-right">
                 <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalSubs)}</div>
                 <div className="text-xs text-indigo-300 font-medium">{FREQUENCY_LABELS[viewMode]}</div>
               </div>
             </div>

             <div className="space-y-3 relative z-10">
               {subscriptions.map(sub => {
                 const displayAmount = getViewAmount(sub);
                 return (
                   <div 
                     key={sub._id} 
                     onClick={() => handleEdit(sub)}
                     className="flex items-center justify-between bg-indigo-800/50 p-3 rounded-xl border border-indigo-700/50 hover:bg-indigo-800 cursor-pointer transition-colors"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                         {sub.name.charAt(0)}
                       </div>
                       <div className="flex flex-col">
                          <span className="font-medium text-sm">{sub.name}</span>
                          {sub.anchor_date && <span className="text-[10px] text-indigo-400">Bills on {sub.anchor_date}th</span>}
                       </div>
                     </div>
                     <span className="font-bold text-sm">{formatCurrency(displayAmount)}</span>
                   </div>
                 );
               })}
               
               <button 
                 onClick={() => handleAdd('Subscription')}
                 className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-800 transition-colors flex items-center justify-center gap-2"
               >
                 <Plus size={14} /> Add Subscription
               </button>
             </div>
          </div>

        </div>
      </div>

      {/* Global Form Modal */}
      <CashFlowFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={fetchFlows}
        itemToEdit={editingFlow}
        defaultType={modalType}
      />

    </div>
  );
};

export default WealthCashflow;
