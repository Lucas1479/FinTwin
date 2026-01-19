import React, { useMemo } from 'react';
import { X, Info, CreditCard, Home, GraduationCap, Car, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import InfoTooltip from '../common/InfoTooltip';
import { HELP_ANCHORS } from '../../constants/helpAnchors';

const DebtDetailModal = ({ isOpen, onClose, liabilities, summary }) => {
  if (!isOpen) return null;

  // --- Logic: Group Liabilities ---
  const debtData = useMemo(() => {
    const categories = {
      mortgage: { id: 'mortgage', name: 'Mortgages', desc: 'Secured Housing Debt', items: [], value: 0, color: '#4f46e5', icon: Home },
      vehicle: { id: 'vehicle', name: 'Vehicle Loans', desc: 'Depreciating Asset Debt', items: [], value: 0, color: '#8b5cf6', icon: Car },
      student: { id: 'student', name: 'Student Loans', desc: 'Government / Education', items: [], value: 0, color: '#0ea5e9', icon: GraduationCap },
      personal: { id: 'personal', name: 'Personal / CC', desc: 'High Interest / Unsecured', items: [], value: 0, color: '#f43f5e', icon: CreditCard },
      other: { id: 'other', name: 'Other Debts', desc: 'Miscellaneous', items: [], value: 0, color: '#64748b', icon: AlertTriangle },
    };

    liabilities.forEach(l => {
      const c = l.category || '';
      if (c.includes('Mortgage')) {
        categories.mortgage.items.push(l);
        categories.mortgage.value += l.value;
      } else if (c.includes('Vehicle') || c.includes('Car')) {
        categories.vehicle.items.push(l);
        categories.vehicle.value += l.value;
      } else if (c.includes('Student')) {
        categories.student.items.push(l);
        categories.student.value += l.value;
      } else if (c.includes('Credit') || c.includes('Personal') || c.includes('Loan')) {
        categories.personal.items.push(l);
        categories.personal.value += l.value;
      } else {
        categories.other.items.push(l);
        categories.other.value += l.value;
      }
    });

    return Object.values(categories).filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [liabilities]);

  const totalDebt = summary.totalLiabilities || 1;
  const gearingRatio = ((totalDebt / (summary.totalAssets || 1)) * 100).toFixed(1);
  const chartData = debtData.map(d => ({ name: d.name, value: d.value, fill: d.color }));

  // Health Check Logic
  const getHealthStatus = (ratio) => {
    if (ratio < 30) return { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ShieldCheck, desc: 'Conservative leverage. You have strong equity.' };
    if (ratio < 60) return { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle, desc: 'Balanced leverage. Typical for homeowners.' };
    return { label: 'High', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertTriangle, desc: 'High leverage. Monitor interest sensitivity.' };
  };

  const health = getHealthStatus(Number(gearingRatio));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Debt Structure</h2>
            <p className="text-sm text-slate-500 mt-0.5">Analysis of liabilities & leverage</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* 1. Health Card */}
          <div className={`rounded-2xl p-6 border ${health.bg} border-slate-100 flex items-start gap-4`}>
             <div className={`p-3 rounded-full bg-white shadow-sm ${health.color}`}>
                <health.icon size={24} />
             </div>
             <div>
                <h3 className={`text-base font-bold ${health.color}`}>Gearing Ratio: {gearingRatio}% ({health.label})</h3>
                <p className="text-sm text-slate-600 mt-1">{health.desc}</p>
             </div>
          </div>

          {/* 2. Visualization (Donut Chart) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    cornerRadius={4}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Debt</span>
                <span className="text-xl font-bold text-slate-900">${(totalDebt / 1000).toFixed(0)}k</span>
              </div>
            </div>

            {/* Legend / Breakdown */}
            <div className="space-y-4">
               {debtData.map((item) => (
                 <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                       <div>
                          <p className="text-sm font-bold text-slate-700">{item.name}</p>
                          <p className="text-xs text-slate-400">{((item.value / totalDebt) * 100).toFixed(1)}%</p>
                       </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${(item.value / 1000).toFixed(1)}k</span>
                 </div>
               ))}
            </div>
          </div>

          {/* 3. Detailed List */}
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <Info size={16} className="text-slate-400" /> Liability Details
            </h3>
            {debtData.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{group.name}</h4>
                  <div className="bg-slate-50 rounded-xl overflow-hidden divide-y divide-slate-100 border border-slate-100">
                    {group.items.map(asset => (
                      <div key={asset._id} className="flex justify-between items-center px-4 py-3 hover:bg-white transition-colors">
                        <span className="text-sm text-slate-700 font-medium">{asset.name}</span>
                        <div className="text-right">
                            <span className="block text-sm font-bold text-slate-900">${new Intl.NumberFormat('en-NZ').format(asset.value)}</span>
                            {asset.interest_rate && <span className="text-[10px] text-slate-400 font-medium">@ {asset.interest_rate}% p.a.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DebtDetailModal;
