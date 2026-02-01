import React, { useState, useEffect } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, Plus, DollarSign, 
  Repeat, ShoppingBag, Briefcase, Zap, 
  TrendingUp, Home, Car, Layers, Target, Activity,
  ArrowUpRight, ChevronRight, Filter, Wallet, CreditCard, ArrowDownRight,
  Trash2
} from 'lucide-react';
import { getCashFlows, deleteCashFlow } from '../../services/cashFlowService';
import { Loader2 } from 'lucide-react';
import CashFlowProjectionChart from '../../components/wealth/CashFlowProjectionChart';
import CashFlowFormModal from '../../components/wealth/CashFlowFormModal';
import IncomeStructureCard from '../../components/wealth/IncomeStructureCard';
import IncomeDetailModal from '../../components/wealth/IncomeDetailModal';
import InfoTooltip from '../../components/common/InfoTooltip';
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  eachDayOfInterval, getDate, getDay, format, differenceInDays
} from 'date-fns';

// ============ DESIGN SYSTEM CONSTANTS ============
const CARD_BASE = "bg-white rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md";
const BTN_ICON = "p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors";
const SECTION_TITLE = "text-base font-bold text-slate-900 flex items-center gap-2";

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

// ============ HELPER: FORMAT CURRENCY WITH SPLIT ============
const formatCurrencySplit = (value) => {
  const formatted = new Intl.NumberFormat('en-NZ', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Math.abs(value));
  const [integer, decimal] = formatted.split('.');
  const sign = value < 0 ? '-' : '';
  return { sign, integer, decimal };
};

const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { 
  style: 'currency', 
  currency: 'NZD' 
}).format(val);

// ============ HELPER: GET ICON FOR CATEGORY ============
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

// ============ SUB-COMPONENT: SEGMENTED CONTROL ============
const SegmentedControl = ({ options, value, onChange }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl">
    {options.map((opt) => (
      <InfoTooltip 
        key={opt.value} 
        content={opt.tooltip}
        aiPrompt={opt.aiPrompt} // Keep legacy prompt if needed
        anchor={opt.anchor} // Pass new anchor
      >
        <button
          onClick={() => onChange(opt.value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all
            ${value === opt.value 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
            }
          `}
        >
          {opt.icon && <opt.icon size={12} />}
          {opt.label}
        </button>
      </InfoTooltip>
    ))}
  </div>
);

// ============ SUB-COMPONENT: FLOW ITEM ============
const FlowItem = ({ item, colorScheme, onEdit, onDelete, displayAmount, frequencyLabel }) => {
  const Icon = getIconForCategory(item.category);
  const schemes = {
    emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
    rose: { bar: 'bg-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600' },
    indigo: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  };
  const s = schemes[colorScheme] || schemes.indigo;

  return (
    <div 
      className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-all group relative overflow-hidden"
    >
      <div 
        className="flex items-center gap-4 flex-1"
        onClick={() => onEdit(item)}
      >
        {/* Vertical Indicator Bar */}
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${s.bar} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
        
        {/* Icon */}
        <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center ${s.iconText} group-hover:scale-105 transition-transform`}>
          <Icon size={18} />
        </div>
        
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.frequency}</span>
            {item.timing_mode === 'Daily_Spread' && (
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">Spread</span>
            )}
            {item.is_variable && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Variable</span>
            )}
            {item.anchor_date && (
               <span className="text-[10px] font-medium text-slate-400">
                 Day {item.anchor_date}
               </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right" onClick={() => onEdit(item)}>
          <div className="font-bold text-slate-900 text-base">{formatCurrency(displayAmount)}</div>
          <div className="text-[10px] text-slate-400 font-medium">{frequencyLabel}</div>
        </div>
        
        {/* Delete Button - Global Style */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete ${item.name}?`)) {
              onDelete(item._id);
            }
          }}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============ SUB-COMPONENT: EMPTY STATE ============
const EmptyState = ({ icon: Icon, title, actionLabel, onAction, colorClass = "text-indigo-600" }) => (
    <div className="p-10 text-center flex flex-col items-center justify-center min-h-[200px] group/empty">
        <div className={`w-14 h-14 bg-indigo-50/50 rounded-2xl flex items-center justify-center mb-4 group-hover/empty:scale-110 group-hover/empty:rotate-3 transition-all duration-500`}>
            <Plus size={20} className={colorClass} strokeWidth={3} />
        </div>
        <h4 className="text-sm font-black text-slate-900 mb-1">{title}</h4>
        <p className="text-[11px] font-bold text-slate-400 max-w-[200px] mx-auto mb-5 leading-relaxed">
          Track your flows to get a clear picture of your financial health.
        </p>
        <button 
            onClick={onAction} 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all duration-300 shadow-sm hover:shadow-indigo-100 transform hover:-translate-y-0.5"
        >
            <Plus size={12} strokeWidth={3} />
            <span>{actionLabel}</span>
        </button>
    </div>
);

// ============ MAIN COMPONENT ============
const WealthCashflow = () => {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [allFlows, setAllFlows] = useState([]);
  const [viewMode, setViewMode] = useState('Weekly');
  const [calcMode, setCalcMode] = useState('Planning');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('Income');
  const [editingFlow, setEditingFlow] = useState(null);
  const [isIncomeDetailOpen, setIsIncomeDetailOpen] = useState(false);

  const fetchFlows = async () => {
    try {
      const flows = await getCashFlows();
      setAllFlows(flows);
      setIncomes(flows.filter(f => f.type === 'Income'));
      setExpenses(flows.filter(f => f.type === 'Expense'));
      setSubscriptions(flows.filter(f => f.type === 'Subscription'));
      setInvestments(flows.filter(f => f.type === 'Investment'));
    } catch (err) {
      console.error("Failed to fetch cash flows", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const handleEdit = (flow) => { setEditingFlow(flow); setIsModalOpen(true); };

  const handleAdd = (type) => {
    setEditingFlow(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await deleteCashFlow(id);
      await fetchFlows();
    } catch (err) {
      console.error("Failed to delete cash flow", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculation Logic ---
  const toAnnual = (amount, frequency) => amount * (TO_ANNUAL[frequency] || 0);
  const fromAnnual = (annualAmount, targetMode) => {
    const divider = TO_ANNUAL[targetMode] || 1;
    return divider === 0 ? 0 : annualAmount / divider;
  };

  const getAverageAmount = (item) => fromAnnual(toAnnual(item.amount, item.frequency), viewMode);

  const getActualAmount = (item) => {
    const today = new Date();
    let periodStart, periodEnd;

    if (viewMode === 'Weekly') {
      periodStart = startOfWeek(today, { weekStartsOn: 1 });
      periodEnd = endOfWeek(today, { weekStartsOn: 1 });
    } else if (viewMode === 'Fortnightly') {
      periodStart = startOfWeek(today, { weekStartsOn: 1 });
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 13);
    } else if (viewMode === 'Monthly') {
      periodStart = startOfMonth(today);
      periodEnd = endOfMonth(today);
    } else {
      periodStart = new Date(today.getFullYear(), 0, 1);
      periodEnd = new Date(today.getFullYear(), 11, 31);
    }

    const daysInPeriod = differenceInDays(periodEnd, periodStart) + 1;

    if (item.timing_mode === 'Daily_Spread') {
      return (toAnnual(item.amount, item.frequency) / 365) * daysInPeriod;
    }

    let totalHits = 0;
    eachDayOfInterval({ start: periodStart, end: periodEnd }).forEach(day => {
      const dayOfMonth = getDate(day);
      const dayOfWeek = getDay(day) || 7;
      if (item.frequency === 'Monthly' && item.anchor_date === dayOfMonth) totalHits++;
      else if (item.frequency === 'Weekly' && item.anchor_date === dayOfWeek) totalHits++;
    });
    return item.amount * totalHits;
  };

  const getDisplayAmount = (item) => calcMode === 'Planning' ? getAverageAmount(item) : getActualAmount(item);

  const totalIncome = incomes.reduce((sum, item) => sum + getDisplayAmount(item), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + getDisplayAmount(item), 0);
  const totalSubs = subscriptions.reduce((sum, item) => sum + getDisplayAmount(item), 0);
  const totalInvestments = investments.reduce((sum, item) => sum + getDisplayAmount(item), 0);
  const totalOutflow = totalExpenses + totalSubs + totalInvestments;
  const netFlow = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const { sign, integer, decimal } = formatCurrencySplit(netFlow);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* ============ ROW 1: HERO KPI & INCOME MIX ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Net Flow Card (2/3 width) */}
        <div className={`${CARD_BASE} p-8 lg:col-span-2 relative overflow-hidden flex flex-col justify-between`}>
          {/* Background Decoration */}
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none opacity-40"></div>
          
          {/* Header with Toggles */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">Net Cash Flow</h3>
                  <div className="mt-1.5">
                    <InfoTooltip 
                        content="Your calculated surplus after expenses and investments. A positive number means you are building wealth."
                        anchor={HELP_ANCHORS.CASHFLOW.METRICS} 
                    />
                  </div>
              </div>
              <SegmentedControl 
                options={[
                   { 
                     value: 'Planning', 
                     label: 'Plan', 
                     icon: Target,
                     tooltip: 'Projected average based on your cash flow rules',
                     anchor: HELP_ANCHORS.CASHFLOW.FORECAST
                   },
                   { 
                     value: 'Actual', 
                     label: 'Actual', 
                     icon: Activity,
                     tooltip: 'Real transactions based on specific dates in this period',
                     anchor: HELP_ANCHORS.CASHFLOW.ACTUAL
                   }
                ]}
                value={calcMode}
                onChange={setCalcMode}
              />
            </div>
            
            <SegmentedControl 
                options={[
                   { value: 'Weekly', label: 'Weekly' },
                   { value: 'Fortnightly', label: 'Fortnightly' },
                   { value: 'Monthly', label: 'Monthly' },
                   { value: 'Yearly', label: 'Yearly' },
                ]}
                value={viewMode}
                onChange={setViewMode}
            />
          </div>

          {/* Main Content */}
          <div className="relative z-10">
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-4xl font-bold tracking-tight ${netFlow >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {sign}${integer}
                </span>
                <span className="text-2xl font-bold text-slate-300">.{decimal}</span>
                <span className={`ml-4 self-center text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  savingsRate >= 20 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  savingsRate >= 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}% Savings Rate
                </span>
              </div>

              {/* Income / Outflow Summary Row */}
              <div className="flex flex-wrap items-center gap-8 mb-6">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Income</p>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <ArrowUpCircle size={18} />
                       </div>
                       <span className="text-xl font-bold text-slate-700">{formatCurrency(totalIncome)}</span>
                    </div>
                 </div>
                 <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expenses</p>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                          <ArrowDownCircle size={18} />
                       </div>
                       <span className="text-xl font-bold text-slate-700">{formatCurrency(totalExpenses + totalSubs)}</span>
                    </div>
                 </div>
                 <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Investments</p>
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <TrendingUp size={18} />
                       </div>
                       <span className="text-xl font-bold text-slate-700">{formatCurrency(totalInvestments)}</span>
                    </div>
                 </div>
              </div>
              
              {/* Progress Bar (Tri-color) */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex mb-2">
                 {/* Expenses: Rose */}
                 <div className="h-full bg-rose-400" style={{ width: `${Math.min(((totalExpenses + totalSubs) / (totalIncome || 1)) * 100, 100)}%` }}></div>
                 {/* Investments: Indigo */}
                 <div className="h-full bg-indigo-500 border-l-2 border-white" style={{ width: `${Math.min((totalInvestments / (totalIncome || 1)) * 100, 100)}%` }}></div>
                 {/* Surplus: Emerald */}
                 <div className="h-full bg-emerald-400 border-l-2 border-white" style={{ width: `${Math.max(savingsRate, 0)}%` }}></div>
              </div>
              
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex gap-4">
                  <span className="text-rose-500">Living ({totalIncome > 0 ? (((totalExpenses + totalSubs) / totalIncome) * 100).toFixed(0) : 0}%)</span>
                  <span className="text-indigo-500">Invested ({totalIncome > 0 ? ((totalInvestments / totalIncome) * 100).toFixed(0) : 0}%)</span>
                </div>
                <span className="text-emerald-500">Free Surplus ({Math.max(savingsRate, 0).toFixed(0)}%)</span>
              </div>
          </div>
        </div>

        {/* Income Structure (1/3 width) - Moved Here */}
        <div className="lg:col-span-1 h-full">
           <IncomeStructureCard 
              flows={allFlows} 
              viewMode={viewMode}
              onOpenDetail={() => setIsIncomeDetailOpen(true)}
           />
        </div>
      </div>

      {/* ============ ROW 2: PROJECTION CHART (Full Width) ============ */}
      <div className={`${CARD_BASE} p-6`}>
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <div className="flex items-center gap-2">
                <h3 className={SECTION_TITLE}>
                <TrendingUp size={18} className="text-indigo-600" />
                30-Day Cash Projection
                </h3>
                <InfoTooltip 
                    content="Projected daily account balance based on your recurring income and expenses. Use this to spot potential shortfalls."
                    anchor={HELP_ANCHORS.CASHFLOW.FORECAST} 
                />
            </div>
            <p className="text-xs text-slate-400 mt-1 pl-6.5">Forecasted balance based on your rules</p>
          </div>
          <button className={BTN_ICON}>
            <Filter size={16} />
          </button>
        </div>
        {/* Increased height for better visibility */}
        <div className="h-[300px]">
           <CashFlowProjectionChart flows={allFlows} />
        </div>
      </div>

      {/* ============ ROW 3: LISTS GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Income Streams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <h3 className={SECTION_TITLE}>
                <Wallet size={18} className="text-emerald-500" />
                Income Streams
                </h3>
                <InfoTooltip 
                    content="Track both Active (Salary) and Passive (Investments/Royalties) income sources here."
                    anchor={HELP_ANCHORS.CASHFLOW.INCOME_TYPES} 
                />
            </div>
            <button 
              onClick={() => handleAdd('Income')}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className={`${CARD_BASE} overflow-hidden min-h-[240px]`}>
            {incomes.length === 0 ? (
              <EmptyState 
                icon={Plus} 
                title="No Income Streams" 
                actionLabel="Add Income" 
                onAction={() => handleAdd('Income')}
                colorClass="text-indigo-600" 
              />
            ) : incomes.map((item) => (
              <FlowItem 
                key={item._id} 
                item={item} 
                colorScheme="emerald" 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                displayAmount={getDisplayAmount(item)}
                frequencyLabel={FREQUENCY_LABELS[viewMode]}
              />
            ))}
          </div>
          
          {/* Investments (Goals & Portfolio) */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-2">
              <h3 className={SECTION_TITLE}>
                <Target size={18} className="text-indigo-500" />
                Goals & Investments
              </h3>
              <button 
                onClick={() => handleAdd('Investment')}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className={`${CARD_BASE} overflow-hidden min-h-[200px]`}>
               <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-50 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-indigo-900">
                       <span className="text-xs font-bold uppercase tracking-wider">Total Invested</span>
                   </div>
                   <div className="text-indigo-700 font-bold text-sm">
                       {formatCurrency(totalInvestments)} <span className="text-indigo-400 text-[10px] font-medium">{FREQUENCY_LABELS[viewMode]}</span>
                   </div>
               </div>
              {investments.length === 0 ? (
                <EmptyState 
                  icon={Plus} 
                  title="No Investments" 
                  actionLabel="Add Investment" 
                  onAction={() => handleAdd('Investment')} 
                  colorClass="text-indigo-600"
                />
              ) : investments.map((item) => (
                <FlowItem 
                  key={item._id} 
                  item={item} 
                  colorScheme="indigo" 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  displayAmount={getDisplayAmount(item)}
                  frequencyLabel={FREQUENCY_LABELS[viewMode]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Expenses & Subscriptions */}
        <div className="space-y-8">
          
          {/* Expenses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className={SECTION_TITLE}>
                 <CreditCard size={18} className="text-rose-500" />
                 Budgets & Expenses
              </h3>
              <button 
                onClick={() => handleAdd('Expense')}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className={`${CARD_BASE} overflow-hidden min-h-[240px]`}>
            {expenses.length === 0 ? (
              <EmptyState 
                icon={Plus} 
                title="No Expenses" 
                actionLabel="Add Expense" 
                onAction={() => handleAdd('Expense')} 
                colorClass="text-indigo-600"
              />
            ) : expenses.map((item) => (
                <FlowItem 
                  key={item._id} 
                  item={item} 
                  colorScheme="rose" 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  displayAmount={getDisplayAmount(item)}
                  frequencyLabel={FREQUENCY_LABELS[viewMode]}
                />
              ))}
            </div>
          </div>

          {/* Subscriptions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className={SECTION_TITLE}>
                   <Repeat size={18} className="text-indigo-500" />
                   Subscriptions
                </h3>
                <button 
                    onClick={() => handleAdd('Subscription')}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                    <Plus size={14} /> Add
                </button>
            </div>

            <div className={`${CARD_BASE} overflow-hidden min-h-[240px]`}>
               {/* Summary Header inside Card */}
               <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-50 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-indigo-900">
                       <span className="text-xs font-bold uppercase tracking-wider">Recurring Total</span>
                   </div>
                   <div className="text-indigo-700 font-bold text-sm">
                       {formatCurrency(totalSubs)} <span className="text-indigo-400 text-[10px] font-medium">{FREQUENCY_LABELS[viewMode]}</span>
                   </div>
               </div>

               {subscriptions.length === 0 ? (
                  <EmptyState 
                    icon={Plus} 
                    title="No Subscriptions" 
                    actionLabel="Add Subscription" 
                    onAction={() => handleAdd('Subscription')} 
                    colorClass="text-indigo-600"
                  />
               ) : subscriptions.map((item) => (
                  <FlowItem 
                    key={item._id} 
                    item={item} 
                    colorScheme="indigo" 
                    onEdit={handleEdit} 
                    onDelete={handleDelete}
                    displayAmount={getDisplayAmount(item)}
                    frequencyLabel={FREQUENCY_LABELS[viewMode]}
                  />
               ))}
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
      
      {/* Income Detail Modal */}
      <IncomeDetailModal
        isOpen={isIncomeDetailOpen}
        onClose={() => setIsIncomeDetailOpen(false)}
        flows={allFlows}
      />
    </div>
  );
};

export default WealthCashflow;
