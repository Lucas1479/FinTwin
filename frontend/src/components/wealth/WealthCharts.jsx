import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Mock History Generator based on current Net Worth
const generateHistory = (currentNetWorth) => {
    const data = [];
    let value = currentNetWorth * 0.9; // Start 10% lower 6 months ago
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    months.forEach((month, index) => {
        // Add some random growth + steady increase
        const growth = value * (0.01 + Math.random() * 0.02); 
        value += growth;
        if (index === months.length - 1) value = currentNetWorth; // Ensure last point matches

        data.push({
            name: month,
            netWorth: Math.round(value),
            assets: Math.round(value * 1.4), // Mock Asset/Liability split
            liabilities: Math.round(value * 0.4)
        });
    });
    return data;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function WealthCharts({ summary, assets }) {
  const historyData = useMemo(() => generateHistory(summary?.netWorth || 0), [summary?.netWorth]);
  
  // Aggregate Assets by Category for Pie Chart
  const allocationData = useMemo(() => {
    if (!assets) return [];
    const map = {};
    assets.forEach(a => {
        const cat = a.category.replace('Invest_', '').replace('Cash_', '').replace('_', ' ');
        map[cat] = (map[cat] || 0) + a.value;
    });
    return Object.keys(map).map(key => ({ name: key, value: map[key] })).sort((a,b) => b.value - a.value);
  }, [assets]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left: Net Worth Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Net Worth Trend</h3>
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 12}} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 12}} 
                            tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="netWorth" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorNw)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Right: Allocation */}
        <div className="lg:col-span-1 bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Asset Allocation</h3>
            <div className="flex-1 w-full min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {allocationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            formatter={(value, entry, index) => <span className="text-xs font-semibold text-slate-600 ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mb-8">
                     <span className="text-xs text-slate-400 font-medium block">Total</span>
                     <span className="text-sm font-bold text-slate-900">${(summary?.totalAssets / 1000).toFixed(0)}k</span>
                </div>
            </div>
        </div>
    </div>
  );
}
