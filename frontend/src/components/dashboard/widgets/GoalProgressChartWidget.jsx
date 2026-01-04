import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Target, TrendingUp } from 'lucide-react';

const GoalProgressChartWidget = ({ goals = [] }) => {
  // 1. Generate high-quality mock historical progress data (using absolute values)
  const chartData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Define 4 main goals to track
    const activeGoals = goals.length >= 3 
      ? goals.slice(0, 4).map(g => ({
          title: g.title || g.goal_name,
          target: g.target_amount || 100000,
          basePct: Math.random() * 40 + 10 // Start between 10-50%
        }))
      : [
          { title: 'First Home', target: 150000, basePct: 25 },
          { title: 'Retirement', target: 500000, basePct: 10 },
          { title: 'Education', target: 120000, basePct: 45 },
          { title: 'New Car', target: 45000, basePct: 60 }
        ];

    return months.map((month, mIdx) => {
      const entry = { name: month, _percentages: {} };
      activeGoals.forEach((goal) => {
        const growth = (mIdx * (1 + Math.random() * 2)); // 1-3% growth per month
        const currentPct = Math.min(100, goal.basePct + growth);
        const absoluteValue = Math.round((currentPct / 100) * goal.target);
        
        entry[goal.title] = absoluteValue;
        entry._percentages[goal.title] = currentPct.toFixed(1);
      });
      return entry;
    });
  }, [goals]);

  // 2. Identify active goals for the Legend/Lines
  const goalNames = useMemo(() => {
    return Object.keys(chartData[0]).filter(key => key !== 'name' && key !== '_percentages');
  }, [chartData]);

  const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#10b981'];

  // 3. Find global min/max for intelligent Y-axis scaling
  const allValues = chartData.flatMap(d => goalNames.map(name => d[name]));
  const minVal = Math.max(0, Math.floor(Math.min(...allValues) / 10) * 10 - 10);
  const maxVal = Math.min(100, Math.ceil(Math.max(...allValues) / 10) * 10 + 10);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 border border-slate-100 flex flex-col h-[400px]">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20">
              <Target size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Completion Velocity</h2>
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Goal Progress Trajectory (0-100%)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
           <TrendingUp size={12} className="text-emerald-500" />
           <span className="text-[10px] font-black text-emerald-600 uppercase">+4.2% Growth</span>
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc', opacity: 0.4 }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              itemStyle={{ fontSize: '11px', fontWeight: '900', padding: '2px 0' }}
              labelStyle={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}
              formatter={(value, name, props) => {
                const percentage = props.payload._percentages[name];
                return [
                  <span key={name}>
                    <span className="text-slate-900">${value.toLocaleString()}</span>
                    <span className="ml-2 text-slate-400 font-bold">({percentage}%)</span>
                  </span>,
                  name
                ];
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#64748b' }}
            />
            {goalNames.map((name, idx) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="goals"
                fill={COLORS[idx % COLORS.length]}
                radius={idx === goalNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                barSize={32}
                animationDuration={1500}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GoalProgressChartWidget;

