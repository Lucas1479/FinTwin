import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRightLeft, TrendingUp, Wallet, Calendar, Clock } from 'lucide-react';

const FundingFlowWidget = ({ goals = [], profile }) => {
  const [frequency, setFrequency] = useState('Monthly'); // 'Weekly' or 'Monthly'

  // Extract surplus from profile or fallback
  // In our model, we don't have a direct 'monthlySurplus' field yet, 
  // so we mock it based on NZ average or user's income if available
  const monthlySurplus = 1850; 
  const displaySurplus = frequency === 'Monthly' ? monthlySurplus : Math.round(monthlySurplus / 4.33);

  // Define color palette matching GoalHeatmap and Brand
  const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#6366f1', '#8b5cf6', '#3b82f6'];

  // Mock allocation logic: In reality, this would be defined in user.allocation.goalPriorities
  const flowData = useMemo(() => {
    const mockGoals = [
      { title: 'Buy First Home', weight: 0.45 },
      { title: 'Retirement Fund', weight: 0.25 },
      { title: 'Emergency Fund', weight: 0.20 },
      { title: 'Europe Trip', weight: 0.10 },
    ];

    const sourceGoals = goals.length > 0 
      ? goals.slice(0, 4).map((g, i) => ({ 
          title: g.title || g.goal_name, 
          weight: [0.4, 0.3, 0.2, 0.1][i] || 0.05 
        }))
      : mockGoals;

    return sourceGoals.map((goal, idx) => ({
      name: goal.title,
      value: Math.round(displaySurplus * goal.weight),
      color: COLORS[idx % COLORS.length],
      percentage: Math.round(goal.weight * 100)
    }));
  }, [goals, displaySurplus]);

  const totalAllocated = flowData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 border border-slate-100 flex flex-col h-full min-h-[500px]">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20">
              <ArrowRightLeft size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Funding Flow</h2>
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Surplus Cash Allocation
          </p>
        </div>
        
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => setFrequency('Weekly')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${frequency === 'Weekly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => setFrequency('Monthly')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${frequency === 'Monthly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Main Doughnut Chart */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[240px]">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={flowData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1200}
              cornerRadius={4}
            >
              {flowData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border border-slate-100 shadow-2xl rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                      <p className="text-lg font-black text-slate-900">${payload[0].value.toLocaleString()}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600">{payload[0].payload.percentage}% of Surplus</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Stats */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Surplus</span>
          <span className="text-2xl font-black text-slate-900 leading-none">${displaySurplus.toLocaleString()}</span>
          <span className="text-[9px] font-bold text-slate-400 block mt-1">/ {frequency === 'Monthly' ? 'Month' : 'Week'}</span>
        </div>
      </div>

      {/* Goal List with Micro-bars */}
      <div className="mt-8 space-y-4">
        {flowData.map((item, idx) => (
          <div key={idx} className="group cursor-default">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-900">${item.value}</span>
                <span className="text-[10px] font-black text-slate-400 w-8 text-right">{item.percentage}%</span>
              </div>
            </div>
            {/* Minimalist Progress Bar */}
            <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
               <div 
                 className="h-full rounded-full transition-all duration-1000 ease-out opacity-60 group-hover:opacity-100"
                 style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
               />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
           <Clock size={14} />
           <span className="text-[10px] font-black uppercase tracking-wider">Next Sync: In 2 Days</span>
        </div>
        <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-colors shadow-lg shadow-slate-200">
          Optimize Flow
        </button>
      </div>
    </div>
  );
};

export default FundingFlowWidget;
