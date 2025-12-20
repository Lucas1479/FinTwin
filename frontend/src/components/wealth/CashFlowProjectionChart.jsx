import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addDays, getDate, getDay } from 'date-fns';

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

  const finalBalance = data[data.length - 1]?.balance || 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-3 shadow-xl rounded-xl text-xs border border-slate-800">
          <p className="font-bold text-slate-300 mb-1.5">{label}</p>
          <p className={`font-bold text-lg ${item.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${new Intl.NumberFormat('en-NZ').format(item.balance)}
          </p>
          <p className={`text-slate-400 mt-1 ${item.dailyChange > 0 ? 'text-emerald-400' : item.dailyChange < 0 ? 'text-rose-400' : ''}`}>
            Daily: {item.dailyChange > 0 ? '+' : ''}{item.dailyChange}
          </p>
          {item.events && (
            <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Events</p>
                <p className="text-slate-200 font-medium mt-0.5">{item.events}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[220px] w-full">
      {/* Projected Surplus Badge */}
      <div className="flex justify-end mb-2">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
          finalBalance >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
        }`}>
          30-Day Projected: {finalBalance >= 0 ? '+' : ''}${new Intl.NumberFormat('en-NZ').format(finalBalance)}
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalancePositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 500 }} 
            interval={6}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 500 }} 
            tickFormatter={(value) => `${value >= 0 ? '' : '-'}$${Math.abs(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#6366f1" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorBalancePositive)" 
            dot={false}
            activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CashFlowProjectionChart;
