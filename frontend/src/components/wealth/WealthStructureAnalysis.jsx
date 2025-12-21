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

  // 2. Liquidity Analysis Data
  const liquidityData = useMemo(() => {
    let liquid = 0; // Cash, Shares
    let semi = 0;   // Managed Funds (can sell but takes days)
    let locked = 0; // Property, KiwiSaver, Term Deposits

    assets.forEach(asset => {
      const t = asset.type;
      if (t === 'Cash' || t === 'Invest_Shares') liquid += asset.value;
      else if (t === 'Invest_ManagedFund') semi += asset.value;
      else locked += asset.value;
    });

    return [
      { name: 'Liquid (Cash/Shares)', value: liquid, fill: LIQUIDITY_COLORS.Liquid },
      { name: 'Semi-Liquid (Funds)', value: semi, fill: LIQUIDITY_COLORS.Semi },
      { name: 'Locked (Prop/Kiwi)', value: locked, fill: LIQUIDITY_COLORS.Locked },
    ];
  }, [assets]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Asset Allocation Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Asset Allocation</h3>
            <p className="text-sm text-gray-500">Breakdown by asset class</p>
          </div>
          <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
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
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="ml-4 space-y-2 max-h-60 overflow-y-auto pr-2 min-w-[120px]">
            {allocationData.map((entry, index) => (
              <div key={index} className="flex items-center text-sm">
                <span 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-600 truncate max-w-[100px]">{entry.name}</span>
                <span className="ml-auto font-medium text-gray-900 pl-2">
                  {((entry.value / (assets.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liquidity Analysis Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Liquidity Profile</h3>
            <p className="text-sm text-gray-500">Accessibility of your wealth</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
              High
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
              Med
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-slate-500 mr-1"></span>
              Low
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={liquidityData}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(val) => val.split(' ')[0]} // Only show first word
              />
              <Tooltip cursor={{fill: '#f9fafb'}} content={<CustomTooltip />} />
              <Bar dataKey="value" barSize={32} radius={[0, 4, 4, 0]}>
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

