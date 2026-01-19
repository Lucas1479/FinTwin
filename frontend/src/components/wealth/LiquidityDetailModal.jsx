import React, { useMemo } from 'react';
import { X, Info, TrendingUp, Lock, Wallet, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import InfoTooltip from '../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry

const LiquidityDetailModal = ({ isOpen, onClose, assets }) => {
  if (!isOpen) return null;

  // --- Logic: Group Assets by Tier ---
  const tierData = useMemo(() => {
    const tiers = {
      t1: { id: 't1', name: 'Liquid Cash', desc: 'Immediate Access (T+0)', assets: [], value: 0, color: '#6366f1', icon: Wallet },
      t2: { id: 't2', name: 'Semi-Liquid', desc: 'Marketable Securities (T+3)', assets: [], value: 0, color: '#8b5cf6', icon: TrendingUp },
      t3: { id: 't3', name: 'Fixed Assets', desc: 'Illiquid / Hard to Sell', assets: [], value: 0, color: '#d8b4fe', icon: ArrowRight },
      t4: { id: 't4', name: 'Locked', desc: 'Restricted Access', assets: [], value: 0, color: '#cbd5e1', icon: Lock },
    };

    assets.forEach(asset => {
      const c = asset.category;
      if (['Cash_Bank', 'Cash_Physical'].includes(c)) {
        tiers.t1.assets.push(asset);
        tiers.t1.value += asset.value;
      } else if (['Invest_Shares', 'Invest_ManagedFund'].includes(c)) {
        tiers.t2.assets.push(asset);
        tiers.t2.value += asset.value;
      } else if (['KiwiSaver', 'Cash_TermDeposit'].includes(c)) {
        tiers.t4.assets.push(asset);
        tiers.t4.value += asset.value;
      } else {
        tiers.t3.assets.push(asset);
        tiers.t3.value += asset.value;
      }
    });

    return Object.values(tiers);
  }, [assets]);

  const chartData = tierData.map(t => ({ name: t.name, value: t.value, fill: t.color, desc: t.desc }));
  const totalWealth = assets.reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Liquidity Deep Dive</h2>
            <p className="text-sm text-slate-500 mt-0.5">Breakdown of asset accessibility</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* 1. Visualization (Tier Chart) */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info size={16} className="text-slate-400" /> Tier Distribution
                </h3>
                <InfoTooltip 
                    content="Understand how easily you can convert assets to cash. Balance is key."
                    anchor={HELP_ANCHORS.WEALTH.LIQUIDITY_TIERS} 
                />
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barSize={24} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-lg">
                            <div className="font-bold">{payload[0].payload.name}</div>
                            <div className="opacity-80">${new Intl.NumberFormat('en-NZ').format(payload[0].value)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1000}>
                     {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Detailed List */}
          <div className="space-y-6">
            {tierData.map((tier) => (
              tier.assets.length > 0 && (
                <div key={tier.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tier.color}20`, color: tier.color }}>
                      <tier.icon size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{tier.name}</h4>
                      <p className="text-xs text-slate-500">{tier.desc} • {((tier.value / totalWealth) * 100).toFixed(0)}% of total</p>
                    </div>
                    <div className="ml-auto font-bold text-slate-900">
                      ${new Intl.NumberFormat('en-NZ').format(tier.value)}
                    </div>
                  </div>

                  {/* Asset Items */}
                  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                    {tier.assets.map(asset => (
                      <div key={asset._id} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                        <span className="text-sm text-slate-600 font-medium">{asset.name}</span>
                        <span className="text-sm font-bold text-slate-900">${new Intl.NumberFormat('en-NZ').format(asset.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LiquidityDetailModal;

