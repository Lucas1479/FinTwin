import React, { useMemo } from 'react';
import { X, Info, Target, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, ComposedChart } from 'recharts';
import InfoTooltip from '../common/InfoTooltip';

const AllocationGoalsDetailModal = ({ isOpen, onClose, goals }) => {
  if (!isOpen) return null;

  // --- Logic: Process Goals ---
  const { processedGoals, summary } = useMemo(() => {
    if (!goals || goals.length === 0) return { processedGoals: [], summary: { totalCurrent: 0, totalTarget: 0 } };

    const validGoals = goals
      .filter(g => g.target_amount > 0)
      .map(g => {
        const current = g.current_amount || 0;
        const target = g.target_amount || 1;
        const percent = Math.min((current / target) * 100, 100);
        return {
          id: g._id || Math.random(),
          name: g.goal_name || g.title || 'Unnamed Goal',
          category: g.category || 'General',
          current,
          target,
          percent,
          dueDate: g.due_date ? new Date(g.due_date).toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No Date'
        };
      })
      .sort((a, b) => b.percent - a.percent); // Sort by completion %

    const totalCurrent = validGoals.reduce((sum, g) => sum + g.current, 0);
    const totalTarget = validGoals.reduce((sum, g) => sum + g.target, 0);

    return { processedGoals: validGoals, summary: { totalCurrent, totalTarget } };
  }, [goals]);

  const chartData = processedGoals.slice(0, 6).map(g => ({ // Top 6 for chart
    name: g.name.length > 10 ? g.name.substring(0, 10) + '...' : g.name,
    Current: g.current,
    Target: g.target,
    fullData: g
  }));

  const overallProgress = summary.totalTarget > 0 
    ? ((summary.totalCurrent / summary.totalTarget) * 100).toFixed(1) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Funding Alignment</h2>
            <p className="text-sm text-slate-500 mt-0.5">Wealth allocation and progress towards your financial targets</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* 1. Summary Hero Card (Light Theme - Refined) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            {/* Background Decorator (Subtle) */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            
            {/* Left: Progress Circle */}
            <div className="relative z-10 flex flex-col items-center justify-center w-32 shrink-0">
               <div className="relative h-24 w-24">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                   <circle 
                      cx="48" cy="48" r="40" fill="none" stroke="#4f46e5" 
                      strokeWidth="8" 
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(overallProgress, 100) / 100)}`}
                      strokeLinecap="round"
                   />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-slate-900">{overallProgress}%</span>
                 </div>
               </div>
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Funded</div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-24 bg-slate-100"></div>

            {/* Right: Metrics Grid */}
            <div className="flex-1 grid grid-cols-2 gap-y-6 gap-x-8 w-full z-10">
               <div>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Goal Target</p>
                 <p className="text-xl font-bold text-slate-900">${(summary.totalTarget / 1000).toFixed(0)}k</p>
               </div>
               <div>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Currently Saved</p>
                 <p className="text-emerald-600 text-xl font-bold">${(summary.totalCurrent / 1000).toFixed(0)}k</p>
               </div>
               <div>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Funding Gap</p>
                 <p className="text-indigo-600 text-xl font-bold">${((summary.totalTarget - summary.totalCurrent) / 1000).toFixed(0)}k</p>
               </div>
               <div>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Active Goals</p>
                 <p className="text-slate-900 text-xl font-bold">{processedGoals.length}</p>
               </div>
            </div>
          </div>

          {/* 2. Visualization (Composed Chart - Target as Background) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
             <h3 className="text-sm font-bold text-slate-900 mb-6">Top Goals vs Targets</h3>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={chartData} barGap={0} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   
                   {/* Dual X-Axis Trick for Overlapping Bars */}
                   <XAxis dataKey="name" xAxisId="0" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                   <XAxis dataKey="name" xAxisId="1" hide />
                   
                   <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                   
                   <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     formatter={(value) => [`$${new Intl.NumberFormat('en-NZ').format(value)}`, undefined]}
                   />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                   
                   {/* Target acts as the background track (Full height) - Darker shade #e2e8f0 */}
                   <Bar dataKey="Target" xAxisId="1" fill="#e2e8f0" radius={[6, 6, 6, 6]} barSize={24} />
                   
                   {/* Current overlays on top (Actual value) */}
                   <Bar dataKey="Current" xAxisId="0" fill="#4f46e5" radius={[6, 6, 6, 6]} barSize={24} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* 3. Detailed List */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <Info size={16} className="text-slate-400" /> Goal Breakdown
            </h3>
            <div className="space-y-3">
              {processedGoals.map((goal) => (
                <div key={goal.id} className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md mb-2 inline-block">
                        {goal.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{goal.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        ${(goal.current / 1000).toFixed(1)}k <span className="text-slate-400 font-normal">/ ${(goal.target / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1 mt-1">
                        <Calendar size={10} /> Due {goal.dueDate}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                        goal.percent >= 100 ? 'bg-emerald-500' : 
                        goal.percent >= 50 ? 'bg-indigo-600' : 
                        'bg-amber-500'
                      }`} 
                      style={{ width: `${goal.percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                     <span className="text-[10px] font-bold text-slate-500">{goal.percent.toFixed(0)}% Complete</span>
                     <span className="text-[10px] font-medium text-slate-400">
                       ${new Intl.NumberFormat('en-NZ').format(Math.max(0, goal.target - goal.current))} remaining
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AllocationGoalsDetailModal;
