import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import InfoTooltip from '../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry

const COLORS = {
  active: '#10b981',    // Emerald 500 (Active/Salary)
  passive: '#6366f1',   // Indigo 500 (Passive/Interest/Side Hustle)
};

const TO_ANNUAL = {
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Yearly': 1,
  'One-Off': 0
};

const IncomeStructureCard = ({ flows, viewMode = 'Monthly', onOpenDetail }) => {
  const data = useMemo(() => {
    let active = 0;
    let passive = 0;
    
    // 1. Helper: Convert amount to Annual first
    const getAnnualAmount = (amount, freq) => amount * (TO_ANNUAL[freq] || 0);

    // 2. Helper: Convert Annual to Target View Mode
    const getTargetAmount = (annualAmount) => {
        const divider = TO_ANNUAL[viewMode] || 1;
        return divider === 0 ? 0 : annualAmount / divider;
    };

    flows.forEach(f => {
      if (f.type !== 'Income') return;
      
      const annual = getAnnualAmount(f.amount, f.frequency);
      const targetAmount = getTargetAmount(annual);
      
      // Define Passive Income Criteria - EXPANDED
      // Now includes Side Hustle, Business, Royalties, Rent
      const passiveCategories = [
          'Investment', 'Interest', 'Dividends', 
          'Side Hustle', 'Business', 'Royalties', 'Rent'
      ];
      
      const isPassive = f.is_passive_income || passiveCategories.includes(f.category);
      
      if (isPassive) {
        passive += targetAmount;
      } else {
        active += targetAmount;
      }
    });

    const total = active + passive || 1; 

    return [
      { name: 'Active', value: active, fill: COLORS.active, percent: ((active / total) * 100).toFixed(0) },
      { name: 'Passive', value: passive, fill: COLORS.passive, percent: ((passive / total) * 100).toFixed(0) },
    ].filter(item => item.value > 0);
  }, [flows, viewMode]);

  const totalIncome = data.reduce((sum, item) => sum + item.value, 0);

  const formatTotal = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
           <div className="flex items-center gap-2">
               <h3 className="text-base font-bold text-slate-900">Income Mix</h3>
               <InfoTooltip 
                   content="Your path to Financial Independence. Aim to increase the Passive share."
                   anchor={HELP_ANCHORS.CASHFLOW.FI_RATIO} 
               />
           </div>
           <p className="text-xs text-slate-400 mt-0.5">Active vs Passive</p>
        </div>
        <button 
          onClick={onOpenDetail}
          className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer"
        >
          <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </button>
      </div>

      <div className="flex items-center h-[180px]"> 
        {/* Legend List (Left) - Vertically Distributed */}
        <div className="flex-1 flex flex-col justify-center space-y-5">
          {data.length > 0 ? data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }}></div>
              <div>
                <p className="text-sm font-bold text-slate-700 leading-none mb-1">{item.name}</p>
                <p className="text-xs text-slate-400 leading-none">{item.percent}% of total</p>
              </div>
            </div>
          )) : (
            <p className="text-xs text-slate-400 italic">No income data</p>
          )}
        </div>

        {/* Pie Chart (Right) - Matching Overview Liquidity Size */}
        <div className="w-44 h-44 relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                cornerRadius={6}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total</span>
            <span className="text-base font-bold text-slate-900">
               {formatTotal(totalIncome)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStructureCard;
