import React, { useState, useEffect, useMemo } from 'react';
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
import { TrendingUp, Sparkles, Database } from 'lucide-react';

const GoalProgressChartWidget = ({ goals = [] }) => {
  const [dataMode, setDataMode] = useState('demo'); // 'demo' | 'real'
  const [realChartData, setRealChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch real goal history when switching to real mode or when goals change
  useEffect(() => {
    if (dataMode === 'real') {
      fetchRealGoalHistory();
    }
  }, [dataMode, goals]);
  
  const fetchRealGoalHistory = async () => {
    setLoading(true);
    try {
      // NOTE: getGoalHistory requires a valid goal ObjectId, not a period string
      // For aggregate goal data across all goals, we need a different API
      // For now, just use current goals data
      const monthlyData = {};
      
      // Always append current month's data from active goals
      if (goals && goals.length > 0) {
        const now = new Date();
        const currentMonthKey = now.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyData[currentMonthKey]) {
          monthlyData[currentMonthKey] = {
            name: currentMonthKey,
            _percentages: {},
            timestamp: now.getTime()
          };
        }
        
        // Add/update current goals data
        goals.forEach(goal => {
          const goalName = goal.title || goal.goal_name || 'Unnamed Goal';
          const currentAmount = goal.current_amount || 0;
          const targetAmount = goal.target_amount || 1;
          const progressPct = (currentAmount / targetAmount) * 100;
          
          monthlyData[currentMonthKey][goalName] = currentAmount;
          monthlyData[currentMonthKey]._percentages[goalName] = progressPct.toFixed(1);
        });
      }
      
      // Convert to array and sort by timestamp
      const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ timestamp, ...rest }) => rest); // Remove timestamp from final data
      
      setRealChartData(sortedData);
    } catch (error) {
      console.error('Failed to fetch goal history:', error);
      // Fallback: show at least current month with active goals
      if (goals && goals.length > 0) {
        const now = new Date();
        const currentMonth = {
          name: now.toLocaleDateString('en-US', { month: 'short' }),
          _percentages: {}
        };
        
        goals.forEach(goal => {
          const goalName = goal.title || goal.goal_name || 'Unnamed Goal';
          const currentAmount = goal.current_amount || 0;
          const targetAmount = goal.target_amount || 1;
          const progressPct = (currentAmount / targetAmount) * 100;
          
          currentMonth[goalName] = currentAmount;
          currentMonth._percentages[goalName] = progressPct.toFixed(1);
        });
        
        setRealChartData([currentMonth]);
      } else {
        setRealChartData([]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 1. Generate high-quality mock historical progress data (using absolute values)
  const mockChartData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Define 3 main goals to track
    const activeGoals = goals.length >= 3 
      ? goals.slice(0, 3).map(g => ({
          title: g.title || g.goal_name,
          target: g.target_amount || 100000,
          basePct: Math.random() * 40 + 10 // Start between 10-50%
        }))
      : [
          { title: 'First Home', target: 150000, basePct: 25 },
          { title: 'Retirement', target: 500000, basePct: 10 },
          { title: 'Education', target: 120000, basePct: 45 }
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
  
  // Select data source based on mode
  const chartData = dataMode === 'real' ? realChartData : mockChartData;
  const hasRealData = realChartData.length > 0;

  // 2. Identify active goals for the Legend/Lines
  const goalNames = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return Object.keys(chartData[0]).filter(key => key !== 'name' && key !== '_percentages');
  }, [chartData]);

  // Use the first three colors from FundingFlowWidget palette
  const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc'];

  // 3. Find global min/max for intelligent Y-axis scaling
  const allValues = chartData.length > 0 ? chartData.flatMap(d => goalNames.map(name => d[name] || 0)) : [0];
  const minVal = Math.max(0, Math.floor(Math.min(...allValues) / 10) * 10 - 10);
  const maxVal = Math.min(100, Math.ceil(Math.max(...allValues) / 10) * 10 + 10);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 border border-slate-100 flex flex-col h-[400px] relative">
      <div className="flex justify-between items-start mb-8 z-30 relative">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight">Completion Velocity</h2>
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Goal Progress Trajectory (0-100%)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setDataMode('demo')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                dataMode === 'demo'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles size={10} />
              Demo
            </button>
            <button
              onClick={() => setDataMode('real')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                dataMode === 'real'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database size={10} />
              Real
              {!hasRealData && dataMode === 'real' && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded">
                  No Data
                </span>
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600 uppercase">+4.2% Growth</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute left-8 right-8 top-32 bottom-8 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Loading history...</span>
          </div>
        </div>
      )}
      
      {dataMode === 'real' && !loading && !hasRealData && (
        <div className="absolute left-8 right-8 top-32 bottom-8 flex items-center justify-center bg-slate-50 z-20 rounded-2xl">
          <div className="text-center px-6">
            <Database size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600 mb-1">No Historical Data</p>
            <p className="text-[10px] text-slate-400">Goal snapshots will be created automatically</p>
          </div>
        </div>
      )}

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
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #f1f5f9', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)'
              }}
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
              wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
              formatter={(value) => <span className="text-slate-500 hover:text-indigo-600 transition-colors">{value}</span>}
            />
            {goalNames.map((name, idx) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="goals"
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.9}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1}
                radius={idx === goalNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
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

