import React, { useMemo } from 'react';
import { X, CheckCircle, TrendingUp, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';

const COLORS = {
  active: '#10b981',    // Emerald 500
  passive: '#6366f1',   // Indigo 500
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-xl border border-slate-800">
        <p className="font-bold mb-1 text-slate-300">{payload[0].payload.name}</p>
        <p className="font-medium text-white">
          ${new Intl.NumberFormat('en-NZ').format(payload[0].value)} / yr
        </p>
      </div>
    );
  }
  return null;
};

const IncomeDetailModal = ({ isOpen, onClose, flows }) => {
  const { chartData, groupedFlows, totals } = useMemo(() => {
    let activeTotal = 0;
    let passiveTotal = 0;
    const activeList = [];
    const passiveList = [];

    const toAnnual = (amount, freq) => {
        const map = { 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Yearly': 1, 'One-Off': 0 };
        return amount * (map[freq] || 0);
    };

    flows.forEach(f => {
      if (f.type !== 'Income') return;
      
      const annualAmount = toAnnual(f.amount, f.frequency);
      const isPassive = f.is_passive_income || ['Investment', 'Interest', 'Dividends'].includes(f.category);

      const item = { ...f, annualAmount };
      
      if (isPassive) {
        passiveTotal += annualAmount;
        passiveList.push(item);
      } else {
        activeTotal += annualAmount;
        activeList.push(item);
      }
    });

    return {
      totals: { active: activeTotal, passive: passiveTotal },
      chartData: [
        { name: 'Active', value: activeTotal, color: COLORS.active },
        { name: 'Passive', value: passiveTotal, color: COLORS.passive }
      ],
      groupedFlows: { active: activeList, passive: passiveList }
    };
  }, [flows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Income Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Annualized Active vs Passive Streams</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Chart Section */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }} barSize={30}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Ratio Badge */}
                <div className="flex justify-center mt-2">
                    <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Passive Ratio: <span className="text-indigo-600 font-bold">{totals.active + totals.passive > 0 ? ((totals.passive / (totals.active + totals.passive)) * 100).toFixed(1) : 0}%</span>
                    </span>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-6">
                
                {/* Active Income List */}
                <div>
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Briefcase size={14} /> Active Income
                    </h4>
                    <div className="space-y-2">
                        {groupedFlows.active.length > 0 ? groupedFlows.active.map(item => (
                            <div key={item._id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                        {item.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                        <p className="text-[10px] text-slate-400">{item.frequency}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900">
                                        ${new Intl.NumberFormat('en-NZ').format(item.annualAmount)}
                                    </p>
                                    <p className="text-[10px] text-slate-400">/ yr</p>
                                </div>
                            </div>
                        )) : <p className="text-xs text-slate-400 italic pl-2">No active income sources.</p>}
                    </div>
                </div>

                {/* Passive Income List */}
                <div>
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <TrendingUp size={14} /> Passive Income
                    </h4>
                    <div className="space-y-2">
                        {groupedFlows.passive.length > 0 ? groupedFlows.passive.map(item => (
                            <div key={item._id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                        {item.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                            {item.is_passive_income && <CheckCircle size={10} className="text-indigo-500" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400">{item.frequency}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900">
                                        ${new Intl.NumberFormat('en-NZ').format(item.annualAmount)}
                                    </p>
                                    <p className="text-[10px] text-slate-400">/ yr</p>
                                </div>
                            </div>
                        )) : <p className="text-xs text-slate-400 italic pl-2">No passive income sources.</p>}
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default IncomeDetailModal;

