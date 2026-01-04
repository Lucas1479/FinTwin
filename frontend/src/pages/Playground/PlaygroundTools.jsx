import React, { useMemo, useState } from 'react';
import { X, Home, DollarSign, TrendingUp, Plus, Calculator, Shield, PiggyBank, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const ACCENTS = {
  indigo: {
    chip: 'bg-indigo-100 text-indigo-700',
    bg: 'bg-gradient-to-br from-indigo-50 via-white to-violet-50',
    iconBg: 'bg-indigo-100 text-indigo-600',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    border: 'border-indigo-100',
  },
  violet: {
    chip: 'bg-violet-100 text-violet-700',
    bg: 'bg-gradient-to-br from-violet-50 via-white to-indigo-50',
    iconBg: 'bg-violet-100 text-violet-600',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    border: 'border-violet-100',
  },
  emerald: {
    chip: 'bg-emerald-100 text-emerald-700',
    bg: 'bg-gradient-to-br from-emerald-50 via-white to-indigo-50',
    iconBg: 'bg-emerald-100 text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    border: 'border-emerald-100',
  },
  rose: {
    chip: 'bg-rose-100 text-rose-700',
    bg: 'bg-gradient-to-br from-rose-50 via-white to-indigo-50',
    iconBg: 'bg-rose-100 text-rose-600',
    button: 'bg-rose-500 hover:bg-rose-600 text-white',
    border: 'border-rose-100',
  },
  purple: {
    chip: 'bg-primary/10 text-primary',
    bg: 'bg-slate-50/50',
    iconBg: 'bg-primary text-white',
    button: 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20',
    border: 'border-slate-200',
    text: 'text-primary',
    accent: 'primary',
  },
};

const NZ_FINANCIAL_DEFAULTS = {
  ocr: 5.50, // Official Cash Rate
  floating_margin: 2.45,
  fixed_1y: 6.89,
  fixed_2y: 6.49,
  stress_buffer: 1.50,
};

const TOOL_META = {
  mortgage: { id: 'mortgage', name: 'Mortgage Calculator', desc: 'Principal & Interest, LVR, Stress Test', icon: Home, accent: 'purple' },
  savings: { id: 'savings', name: 'Savings & DCA', desc: 'Goal tracking, compound growth curves', icon: PiggyBank, accent: 'violet' },
  debt: { id: 'debt', name: 'Debt Accelerator', desc: 'Payoff time, interest savings, snowball', icon: DollarSign, accent: 'rose' },
  investment: { id: 'investment', name: 'Investment ROI (CAGR)', desc: 'Annualized returns, total gain', icon: TrendingUp, accent: 'emerald' },
  inflation: { id: 'inflation', name: 'Inflation Adjuster', desc: 'Future vs Present value, real returns', icon: Shield, accent: 'purple' },
};

// ============================================
// CALCULATOR MODAL COMPONENT
// ============================================
export const CalculatorModal = ({ isOpen, onClose, calculatorType, onAddToScenario }) => {
  if (!isOpen) return null;
  const meta = TOOL_META[calculatorType] || TOOL_META.mortgage;
  const accent = ACCENTS[meta.accent] || ACCENTS.indigo;
  const Icon = meta.icon || Calculator;

  const renderBody = () => {
    switch (calculatorType) {
      case 'savings':
        return <SavingsCalculator accent={accent} onAddToScenario={onAddToScenario} onClose={onClose} />;
      case 'debt':
        return <DebtAccelerator accent={accent} />;
      case 'investment':
        return <InvestmentReturnCalculator accent={accent} />;
      case 'inflation':
        return <InflationAdjuster accent={accent} />;
      case 'mortgage':
      default:
        return <MortgageCalculator accent={accent} onAddToScenario={onAddToScenario} onClose={onClose} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b border-slate-100 rounded-t-3xl ${accent.bg} z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accent.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Playground · Tools</p>
                <h2 className="text-xl font-bold text-slate-900">{meta.name}</h2>
                <p className="text-xs text-slate-500 font-medium">{meta.desc}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-colors shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">{renderBody()}</div>
      </div>
    </div>
  );
};

// ============================================
// TOOL A: MORTGAGE CALCULATOR (PRO)
// ============================================
const MortgageCalculator = ({ accent, onAddToScenario, onClose }) => {
  const [price, setPrice] = useState(950000);
  const [deposit, setDeposit] = useState(190000);
  const [rate, setRate] = useState(NZ_FINANCIAL_DEFAULTS.fixed_2y);
  const [termYears, setTermYears] = useState(30);
  const [frequency, setFrequency] = useState('fortnightly');
  const [extra, setExtra] = useState(0);
  const [repaymentType, setRepaymentType] = useState('pi'); // pi | io | reducing
  const [rateMode, setRateMode] = useState('simple'); // simple | ocr
  const [ocrMargin, setOcrMargin] = useState(NZ_FINANCIAL_DEFAULTS.floating_margin);

  const depositPct = price > 0 ? (deposit / price) * 100 : 0;
  const loanAmount = Math.max(0, price - deposit);
  const currentEffectiveRate = rateMode === 'ocr' ? NZ_FINANCIAL_DEFAULTS.ocr + ocrMargin : rate;
  
  const perYear = { monthly: 12, fortnightly: 26, weekly: 52 }[frequency];
  const periodRate = currentEffectiveRate / 100 / perYear;
  const totalPeriods = termYears * perYear;

  const basePayment = useMemo(() => {
    if (repaymentType === 'io') return (loanAmount * (currentEffectiveRate / 100)) / perYear;
    if (repaymentType === 'reducing') {
      const principalPart = loanAmount / totalPeriods;
      const interestPart = loanAmount * periodRate;
      return principalPart + interestPart;
    }
    return periodRate === 0
      ? loanAmount / totalPeriods
      : (loanAmount * periodRate * Math.pow(1 + periodRate, totalPeriods)) /
        (Math.pow(1 + periodRate, totalPeriods) - 1);
  }, [loanAmount, periodRate, totalPeriods, repaymentType, currentEffectiveRate, perYear]);

  const stressRate = currentEffectiveRate + NZ_FINANCIAL_DEFAULTS.stress_buffer;
  const stressPeriodRate = stressRate / 100 / perYear;
  const stressPayment = (loanAmount * stressPeriodRate * Math.pow(1 + stressPeriodRate, totalPeriods)) /
                        (Math.pow(1 + stressPeriodRate, totalPeriods) - 1);

  const schedulePreview = useMemo(() => {
    const rows = [];
    let balance = loanAmount;
    for (let i = 1; i <= Math.min(totalPeriods, 12); i++) {
      const interest = balance * periodRate;
      let principal = 0;
      if (repaymentType === 'io') principal = extra;
      else if (repaymentType === 'reducing') principal = (loanAmount / totalPeriods) + extra;
      else principal = Math.max(0, (basePayment + extra) - interest);
      
      balance = Math.max(0, balance - principal);
      rows.push({ period: i, interest, principal, balance });
      if (balance <= 0) break;
    }
    return rows;
  }, [loanAmount, periodRate, basePayment, extra, totalPeriods, repaymentType]);

  const totalInterest = useMemo(() => {
    if (repaymentType === 'io') return loanAmount * (currentEffectiveRate / 100) * termYears;
    if (repaymentType === 'reducing') {
      return (totalPeriods * (loanAmount * periodRate + (loanAmount / totalPeriods) * periodRate)) / 2;
    }
    return (basePayment * totalPeriods) - loanAmount;
  }, [basePayment, totalPeriods, loanAmount, repaymentType, currentEffectiveRate, termYears, periodRate]);

  return (
    <div className="space-y-4">
      {/* 1. Compact Header Selector */}
      <div className="flex justify-between items-center bg-slate-100 p-1 rounded-xl">
        <div className="flex gap-1 flex-1">
          {['pi', 'io', 'reducing'].map((t) => (
            <button
              key={t}
              onClick={() => setRepaymentType(t)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${repaymentType === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'pi' ? 'P&I' : t === 'io' ? 'Interest Only' : 'Reducing'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Inputs - High Density */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputBlock label="Property Price" value={price} onChange={setPrice} prefix="$" />
              <InputBlock label="Cash Deposit" value={deposit} onChange={setDeposit} prefix="$" />
            </div>

            <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate Mode</label>
                  <button 
                    onClick={() => setRateMode(rateMode === 'simple' ? 'ocr' : 'simple')}
                    className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10"
                  >
                    {rateMode === 'simple' ? 'Fixed/Float' : 'OCR + Margin'}
                  </button>
                </div>
                {rateMode === 'simple' ? (
                  <SliderBlock label="Interest Rate" value={rate} onChange={setRate} min={1} max={12} step={0.05} suffix="%" />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">OCR</p>
                      <p className="text-xs font-black text-slate-900">{NZ_FINANCIAL_DEFAULTS.ocr}%</p>
                    </div>
                    <InputBlock label="Margin" value={ocrMargin} onChange={setOcrMargin} step={0.05} suffix="%" />
                  </div>
                )}
              </div>
              <SliderBlock label="Loan Term" value={termYears} onChange={setTermYears} min={1} max={30} step={1} suffix="y" />
            </div>

            <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
              <SelectBlock label="Frequency" value={frequency} onChange={setFrequency} options={[{value:'monthly',label:'Monthly'},{value:'fortnightly',label:'Fortnightly'},{value:'weekly',label:'Weekly'}]} />
              <InputBlock label="Extra / Period" value={extra} onChange={setExtra} prefix="$" />
            </div>
          </div>

          {/* Amortization - Integrated and Compact */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-primary" /> Preview (First 12)
            </h4>
            <div className="grid grid-cols-4 gap-2 text-[9px] font-bold text-slate-400 uppercase mb-2 px-1">
              <span>Period</span>
              <span>Interest</span>
              <span>Principal</span>
              <span>Balance</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {schedulePreview.map((row) => (
                <div key={row.period} className="grid grid-cols-4 gap-2 text-[10px] py-1.5 border-t border-slate-200/40 px-1 hover:bg-white/50 rounded-lg transition-colors">
                  <span className="text-slate-400">#{row.period}</span>
                  <span className="text-slate-600">${Math.round(row.interest).toLocaleString()}</span>
                  <span className="text-primary font-bold">${Math.round(row.principal).toLocaleString()}</span>
                  <span className="text-slate-900 font-bold">${Math.round(row.balance).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Real-time Stats - Very High Density */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="bg-primary text-white p-6 rounded-2xl shadow-xl shadow-primary/20 relative overflow-hidden">
             <div className="absolute -right-8 -top-8 opacity-10 rotate-12">
               <Calculator size={120} />
             </div>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Repayment Amount</p>
             <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black tracking-tighter">${Math.round(basePayment).toLocaleString()}</span>
                <span className="text-xs font-medium opacity-60">/ {frequency.replace('ly', '')}</span>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                   <p className="text-[9px] font-bold uppercase opacity-50 mb-0.5">Stress Test</p>
                   <p className="text-sm font-black">${Math.round(stressPayment).toLocaleString()}</p>
                   <p className="text-[8px] opacity-40">at {stressRate.toFixed(1)}%</p>
                </div>
                <div>
                   <p className="text-[9px] font-bold uppercase opacity-50 mb-0.5">LVR Status</p>
                   <p className={`text-sm font-black ${depositPct < 20 ? 'text-amber-300' : 'text-emerald-300'}`}>{depositPct.toFixed(1)}%</p>
                   <p className="text-[8px] opacity-40">{depositPct < 20 ? 'Low Equity' : 'Standard'}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricSmall label="Loan Principal" value={`$${Math.round(loanAmount).toLocaleString()}`} />
            <MetricSmall label="Total Interest" value={`$${Math.round(totalInterest).toLocaleString()}`} />
            <MetricSmall label="Total Cost" value={`$${Math.round(loanAmount + totalInterest).toLocaleString()}`} />
            <MetricSmall label="Deposit %" value={`${depositPct.toFixed(1)}%`} />
          </div>

          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                Cancel
             </button>
             {onAddToScenario && (
               <button onClick={() => onAddToScenario({ type: 'mortgage', loanAmount })} className="flex-[2] py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">
                  Confirm
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricSmall = ({ label, value, sub, subColor }) => (
  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-black text-slate-900">{value}</p>
    {sub && <p className={`text-[8px] font-bold mt-0.5 ${subColor}`}>{sub}</p>}
  </div>
);

const SummaryStat = ({ label, value, badge, badgeColor, emphasis, color = 'slate', icon }) => {
  const colors = {
    violet: 'text-violet-700',
    rose: 'text-rose-600',
    slate: 'text-slate-900',
  };
  
  const badgeColors = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between h-full group hover:border-violet-200 transition-colors`}>
      <div>
        <div className="flex items-center gap-1.5 mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        </div>
        <p className={`text-lg font-black tracking-tight ${emphasis ? 'text-violet-700' : colors[color]}`}>{value}</p>
      </div>
      {badge && (
        <span className={`inline-flex mt-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border w-fit ${badgeColors[badgeColor] || badgeColors.violet}`}>
          {badge}
        </span>
      )}
    </div>
  );
};

// ============================================
// TOOL B: SAVINGS / DCA
// ============================================
const SavingsCalculator = ({ accent, onAddToScenario, onClose }) => {
  const [goal, setGoal] = useState(500000);
  const [current, setCurrent] = useState(20000);
  const [monthly, setMonthly] = useState(1500);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState(7);

  const months = years * 12;
  const monthlyRate = rate / 100 / 12;
  
  // Future Value calculation (Compound Interest)
  const futureValue = current * Math.pow(1 + monthlyRate, months) + monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  
  // Required monthly contribution to reach goal
  const requiredMonthly =
    monthlyRate === 0
      ? Math.max(0, (goal - current) / months)
      : ((goal - current * Math.pow(1 + monthlyRate, months)) * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1) / (1 + monthlyRate);
  
  const gap = Math.max(0, goal - futureValue);

  const chartData = [];
  for (let y = 1; y <= years; y += 2) {
    const m = y * 12;
    const fv = current * Math.pow(1 + monthlyRate, m) + monthly * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
    chartData.push({ year: `Yr ${y}`, value: Math.round(fv) });
  }

  const handleAdd = () => {
    if (!onAddToScenario) return;
    onAddToScenario({
      type: 'savings_plan',
      monthlyContribution: Math.round(monthly),
      expectedReturn: rate,
      horizonYears: years,
      target: goal,
    });
    onClose?.();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputBlock label="Target Amount" value={goal} onChange={setGoal} prefix="$" min={10000} step={1000} />
        <InputBlock label="Current Savings" value={current} onChange={setCurrent} prefix="$" min={0} step={500} />
        <InputBlock label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" min={0} step={100} />
        <SliderBlock label="Expected Annual Return" value={rate} onChange={setRate} min={2} max={12} step={0.1} suffix="%" />
        <SliderBlock label="Investment Horizon" value={years} onChange={setYears} min={1} max={40} step={1} suffix="y" />
      </div>

      <div className={`rounded-2xl p-5 border ${accent.border} ${accent.bg}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Projected Value" value={`$${Math.round(futureValue).toLocaleString()}`} emphasis />
          <Stat label="Gap to Goal" value={gap > 0 ? `$${Math.round(gap).toLocaleString()}` : 'Reached'} badge={gap > 0 ? 'Need more' : 'Target Met'} />
          <Stat label="Required / Month" value={`$${Math.round(requiredMonthly).toLocaleString()}`} />
          <Stat label="Total Invested" value={`$${Math.round(current + monthly * months).toLocaleString()}`} />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <p className="text-sm font-bold text-slate-700">Compound Growth Projection</p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {onAddToScenario && (
        <button onClick={handleAdd} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors ${accent.button}`}>
          <Plus className="w-5 h-5" />
          Add Savings Plan
        </button>
      )}
    </div>
  );
};

// ============================================
// TOOL C: DEBT ACCELERATOR
// ============================================
const DebtAccelerator = ({ accent }) => {
  const [balance, setBalance] = useState(25000);
  const [rate, setRate] = useState(12);
  const [minPayment, setMinPayment] = useState(600);
  const [extra, setExtra] = useState(300);

  const calcPayoff = (extraPay = 0) => {
    let month = 0;
    let b = balance;
    let interestAcc = 0;
    const monthlyRate = rate / 100 / 12;
    while (b > 0 && month < 600) {
      const interest = b * monthlyRate;
      const principal = Math.max(0, minPayment + extraPay - interest);
      b = Math.max(0, b - principal);
      interestAcc += interest;
      month += 1;
      if (b === 0) break;
    }
    return { months: month, interest: interestAcc };
  };

  const base = calcPayoff(0);
  const accel = calcPayoff(extra);
  const monthsSaved = base.months - accel.months;
  const interestSaved = base.interest - accel.interest;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputBlock label="Debt Balance" value={balance} onChange={setBalance} prefix="$" min={0} step={500} />
        <SliderBlock label="Interest Rate" value={rate} onChange={setRate} min={1} max={28} step={0.1} suffix="%" />
        <InputBlock label="Minimum Payment" value={minPayment} onChange={setMinPayment} prefix="$" min={0} step={50} />
        <InputBlock label="Extra Payment" value={extra} onChange={setExtra} prefix="$" min={0} step={50} />
      </div>

      <div className={`rounded-2xl p-5 border ${accent.border} ${accent.bg}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Baseline Payoff" value={`${base.months} months`} />
          <Stat label="Accelerated Payoff" value={`${accel.months} months`} emphasis />
          <Stat label="Time Saved" value={`${monthsSaved} months`} badge={monthsSaved > 0 ? 'Faster' : 'No saving'} />
          <Stat label="Interest Saved" value={`$${Math.round(interestSaved).toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// TOOL D: INVESTMENT RETURN / CAGR
// ============================================
const InvestmentReturnCalculator = ({ accent }) => {
  const [initial, setInitial] = useState(100000);
  const [finalVal, setFinalVal] = useState(180000);
  const [years, setYears] = useState(5);
  const [contrib, setContrib] = useState(0);

  const totalInvested = initial + contrib * years;
  const cagr = Math.pow((finalVal + contrib * years) / Math.max(1, initial + contrib * years), 1 / Math.max(1, years)) - 1;
  const annualized = (cagr * 100).toFixed(2);
  const gain = finalVal + contrib * years - totalInvested;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputBlock label="Initial Principal" value={initial} onChange={setInitial} prefix="$" min={0} step={1000} />
        <InputBlock label="Final Value" value={finalVal} onChange={setFinalVal} prefix="$" min={0} step={1000} />
        <SliderBlock label="Years Held" value={years} onChange={setYears} min={1} max={40} step={1} suffix="y" />
        <InputBlock label="Annual Addition" value={contrib} onChange={setContrib} prefix="$" min={0} step={500} />
      </div>

      <div className={`rounded-2xl p-5 border ${accent.border} ${accent.bg}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="CAGR (Annualized)" value={`${annualized}%`} emphasis />
          <Stat label="Total Invested" value={`$${Math.round(totalInvested).toLocaleString()}`} />
          <Stat label="Total Gain" value={`$${Math.round(gain).toLocaleString()}`} />
          <Stat label="Final Portfolio" value={`$${Math.round(finalVal + contrib * years).toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// TOOL E: INFLATION / REAL RETURN
// ============================================
const InflationAdjuster = ({ accent }) => {
  const [amountToday, setAmountToday] = useState(100000);
  const [years, setYears] = useState(10);
  const [inflation, setInflation] = useState(2.5);
  const [nominalReturn, setNominalReturn] = useState(6.5);

  const futureValue = amountToday * Math.pow(1 + inflation / 100, years);
  const realReturn = ((1 + nominalReturn / 100) / (1 + inflation / 100) - 1) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputBlock label="Present Value" value={amountToday} onChange={setAmountToday} prefix="$" min={0} step={1000} />
        <SliderBlock label="Number of Years" value={years} onChange={setYears} min={1} max={50} step={1} suffix="y" />
        <SliderBlock label="Annual Inflation" value={inflation} onChange={setInflation} min={0} max={10} step={0.1} suffix="%" />
        <SliderBlock label="Nominal Return" value={nominalReturn} onChange={setNominalReturn} min={0} max={15} step={0.1} suffix="%" />
      </div>

      <div className={`rounded-2xl p-5 border ${accent.border} ${accent.bg}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Future Equivalent" value={`$${Math.round(futureValue).toLocaleString()}`} emphasis />
          <Stat label="Real Return Rate" value={`${realReturn.toFixed(2)}%`} badge={realReturn >= 0 ? 'Positive' : 'Negative'} />
          <Stat label="Required for Purchasing Power" value={`${inflation.toFixed(1)}%+`} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// REUSABLE UI BLOCKS
// ============================================
const InputBlock = ({ label, value, onChange, prefix, suffix, min, max, step }) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-black text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary focus:bg-white transition-all outline-none text-xs"
        style={{ paddingLeft: prefix ? 32 : undefined, paddingRight: suffix ? 36 : undefined }}
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{suffix}</span>}
    </div>
  </div>
);

const SliderBlock = ({ label, value, onChange, min, max, step, suffix }) => (
  <div className="space-y-2 group">
    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest ml-1">
      <span className="text-slate-400 group-focus-within:text-primary transition-colors">{label}</span>
      <span className="text-primary font-black">{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
    />
  </div>
);

const SelectBlock = ({ label, value, onChange, options }) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-black text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary focus:bg-white transition-all outline-none appearance-none text-xs"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Stat = ({ label, value, badge, emphasis }) => (
  <div className="bg-white/80 rounded-xl border border-slate-100 p-3 shadow-sm">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`text-lg font-black ${emphasis ? 'text-primary' : 'text-slate-900'}`}>{value}</p>
    {badge && <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/5 text-primary">{badge}</span>}
  </div>
);

// ============================================
// MAIN TOOLS BUTTON COMPONENT
// ============================================
const PlaygroundTools = ({ onAddToScenario }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState(null);

  const tools = [
    TOOL_META.mortgage,
    TOOL_META.savings,
    TOOL_META.debt,
    TOOL_META.investment,
    TOOL_META.inflation,
  ];

  return (
    <>
      {/* Floating Tools Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="bg-primary hover:bg-primary-hover text-white p-4 rounded-full shadow-2xl flex items-center gap-3 font-bold transition-all hover:scale-105 shadow-primary/20"
        >
          <Calculator className="w-6 h-6" />
          <span className="pr-2">Tools</span>
        </button>

        {/* Tools Menu */}
        {showMenu && (
          <div className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80">
            <h3 className="font-bold text-slate-900 mb-3 px-2">Financial Toolbox</h3>
            <div className="space-y-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const accent = ACCENTS[tool.accent];
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveCalculator(tool.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{tool.name}</p>
                        <p className="text-sm text-slate-600">{tool.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={activeCalculator !== null}
        onClose={() => setActiveCalculator(null)}
        calculatorType={activeCalculator}
        onAddToScenario={onAddToScenario}
      />
    </>
  );
};

export default PlaygroundTools;