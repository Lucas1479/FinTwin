import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Info } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#64748b'];
const LIQUIDITY_COLORS = {
  Liquid: '#10b981', // Emerald
  Semi: '#f59e0b',   // Amber
  Locked: '#64748b'  // Slate
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
        <p className="text-sm font-medium text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-indigo-600">
          ${new Intl.NumberFormat('en-NZ').format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const WealthStructureAnalysis = ({ assets, liabilities }) => {
  // 1. Asset Allocation Data
  const allocationData = useMemo(() => {
    const categories = {};
    assets.forEach(asset => {
      const type = asset.type || 'Other';
      // Clean up type string for display
      const label = type.replace('Invest_', '').replace('Physical_', '');
      categories[label] = (categories[label] || 0) + asset.value;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  // 2. Liquidity Analysis Data (Industry Standard Tiers)
  const liquidityData = useMemo(() => {
    let t1 = 0; // Liquid Cash (T+0)
    let t2 = 0; // Semi-Liquid / Marketable (T+3)
    let t3 = 0; // Fixed / Illiquid (Months/Years)
    let t4 = 0; // Locked / Restricted (Conditional)

    assets.forEach(asset => {
      const c = asset.category;
      
      // Tier 1: Cash
      if (['Cash_Bank', 'Cash_Physical'].includes(c)) {
        t1 += asset.value;
      }
      // Tier 2: Marketable Securities
      else if (['Invest_Shares', 'Invest_ManagedFund'].includes(c)) {
        t2 += asset.value;
      }
      // Tier 4: Locked (Check first as TermDeposit is distinct from Cash)
      else if (['KiwiSaver', 'Cash_TermDeposit'].includes(c)) {
        t4 += asset.value;
      }
      // Tier 3: Fixed Assets (Default)
      else {
        t3 += asset.value;
      }
    });

    const data = [
      { name: 'Liquid Cash', subtitle: 'Tier 1', value: t1, fill: '#6366f1' },       // Indigo-500
      { name: 'Marketable', subtitle: 'Tier 2', value: t2, fill: '#8b5cf6' },        // Violet-500
      { name: 'Fixed Assets', subtitle: 'Tier 3', value: t3, fill: '#d8b4fe' },      // Purple-300
      { name: 'Restricted', subtitle: 'Tier 4', value: t4, fill: '#cbd5e1' },       // Slate-300
    ];

    // Removed filter to show all tiers for clarity
    return data;
  }, [assets]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Asset Allocation Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Asset Allocation</h3>
            <p className="text-sm text-slate-500">Breakdown by asset class</p>
          </div>
          <button className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
            <Info size={18} />
          </button>
        </div>
        
        <div className="h-64 flex items-center">
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
                stroke="none"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="ml-4 space-y-3 max-h-60 overflow-y-auto pr-2 min-w-[140px]">
            {allocationData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2">
                   <span 
                     className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" 
                     style={{ backgroundColor: COLORS[index % COLORS.length] }}
                   />
                   <span className="text-slate-600 truncate max-w-[90px] group-hover:text-slate-900 transition-colors">
                     {entry.name}
                   </span>
                </div>
                <span className="font-bold text-slate-700">
                  {((entry.value / (assets.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liquidity Analysis Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Liquidity Profile (Tier View)</h3>
            <p className="text-sm text-slate-500">Accessibility hierarchy (Tier 1-4)</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={liquidityData}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              barSize={32}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}} 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{data.subtitle}</p>
                        <p className="text-sm font-bold text-slate-900">{data.name}</p>
                        <p className="text-sm text-indigo-600 font-medium">
                          ${new Intl.NumberFormat('en-NZ').format(data.value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={1000}>
                {liquidityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WealthStructureAnalysis;

