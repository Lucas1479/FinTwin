import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addDays, getDate, getDay, startOfMonth, endOfMonth } from 'date-fns';

const CashFlowProjectionChart = ({ flows }) => {
  // 1. Generate next 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  // 2. Calculate daily flows
  let runningBalance = 0;
  
  const data = days.map(date => {
    const dayOfMonth = getDate(date);
    const dayOfWeek = getDay(date) || 7; // 1-7 (Mon-Sun)
    
    let dailyChange = 0;
    const events = [];

    flows.forEach(flow => {
      let amount = 0;
      let isHit = false;

      // Logic: Determine if flow happens today
      if (flow.timing_mode === 'Daily_Spread') {
        // Annualize then daily
        const annual = flow.amount * (flow.frequency === 'Weekly' ? 52 : 12); // Simplified
        amount = annual / 365;
        isHit = true;
      } else if (flow.timing_mode === 'Specific_Date') {
        if (flow.frequency === 'Monthly' && flow.anchor_date === dayOfMonth) {
            amount = flow.amount;
            isHit = true;
            events.push(flow.name);
        } else if (flow.frequency === 'Weekly' && flow.anchor_date === dayOfWeek) {
            amount = flow.amount;
            isHit = true;
            events.push(flow.name);
        }
      }

      // Add or Subtract
      if (isHit) {
        if (flow.type === 'Income') {
            dailyChange += amount;
        } else {
            dailyChange -= amount;
        }
      }
    });

    runningBalance += dailyChange;

    return {
      date: format(date, 'MMM d'),
      fullDate: format(date, 'yyyy-MM-dd'),
      balance: Math.round(runningBalance),
      dailyChange: Math.round(dailyChange),
      events: events.slice(0, 3).join(', ') + (events.length > 3 ? '...' : '')
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-xl text-xs">
          <p className="font-bold text-slate-700 mb-1">{label}</p>
          <p className={`font-bold text-lg ${data.balance >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
            ${data.balance}
          </p>
          <p className="text-slate-400 mt-1">Net Change: {data.dailyChange > 0 ? '+' : ''}{data.dailyChange}</p>
          {data.events && (
            <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-slate-500 font-medium">Events:</p>
                <p className="text-slate-400">{data.events}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[300px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">30-Day Cash Flow Projection</h3>
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            Projected Surplus: ${data[data.length - 1].balance}
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            interval={6}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#6366f1" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CashFlowProjectionChart;

