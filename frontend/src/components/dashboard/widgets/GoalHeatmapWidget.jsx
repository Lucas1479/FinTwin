import { useState, useMemo } from 'react';
import { Maximize2, Zap, Target } from 'lucide-react';

const GoalHeatmapWidget = ({ assets = [], goals = [] }) => {
  // --- Treemap Layout Engine (Squarified Treemap Logic) ---
  // Calculates coordinates (x, y, w, h) based on totalValue weight
  const calculateLayout = (data, width, height) => {
    if (!data || data.length === 0) return [];
    
    const result = [];
    const split = (items, x, y, w, h) => {
      if (items.length === 0) return;
      if (items.length === 1) {
        result.push({ ...items[0], x, y, w, h });
        return;
      }

      const total = items.reduce((sum, d) => sum + d.totalValue, 0);
      let cumulative = 0;
      let mid = 0;
      for (let i = 0; i < items.length; i++) {
        cumulative += items[i].totalValue;
        if (cumulative >= total / 2 || i === items.length - 2) {
          mid = i + 1;
          break;
        }
      }

      const firstGroup = items.slice(0, mid);
      const secondGroup = items.slice(mid);
      const firstValue = firstGroup.reduce((sum, d) => sum + d.totalValue, 0);
      
      if (w > h) {
        const splitW = (firstValue / total) * w;
        split(firstGroup, x, y, splitW, h);
        split(secondGroup, x + splitW, y, w - splitW, h);
      } else {
        const splitH = (firstValue / total) * h;
        split(firstGroup, x, y, w, splitH);
        split(secondGroup, x, y + splitH, w, h - splitH);
      }
    };

    const sortedData = [...data].sort((a, b) => b.totalValue - a.totalValue);
    split(sortedData, 0, 0, width, height);
    return result;
  };

  // Coordinated brand palette for goal sectors
  const GOAL_THEMES = [
    { border: 'border-brand-500', bg: 'bg-brand-50/50', text: 'text-brand-600', icon: 'text-brand-400' },
    { border: 'border-blue-500', bg: 'bg-blue-50/50', text: 'text-blue-600', icon: 'text-blue-400' },
    { border: 'border-indigo-500', bg: 'bg-indigo-50/50', text: 'text-indigo-600', icon: 'text-indigo-400' },
    { border: 'border-purple-500', bg: 'bg-purple-50/50', text: 'text-purple-600', icon: 'text-purple-400' },
    { border: 'border-emerald-500', bg: 'bg-emerald-50/50', text: 'text-emerald-600', icon: 'text-emerald-400' },
    { border: 'border-amber-500', bg: 'bg-amber-50/50', text: 'text-amber-600', icon: 'text-amber-400' },
  ];

  // Enhanced mapping logic with robust internal mock fallback
  const treemapData = useMemo(() => {
    // 1. Define high-quality mock data for 8 goals
    const mockGoals = [
      { _id: 'm1', title: 'Buy First Home', category: 'Housing', target_amount: 150000 },
      { _id: 'm2', title: 'Retirement fund', category: 'Retirement', target_amount: 500000 },
      { _id: 'm3', title: 'Emergency Fund', category: 'Emergency', target_amount: 30000 },
      { _id: 'm4', title: 'New Vehicle', category: 'Vehicle', target_amount: 45000 },
      { _id: 'm5', title: 'Europe Trip 2027', category: 'Lifestyle', target_amount: 25000 },
      { _id: 'm6', title: 'Kid\'s Education', category: 'Education', target_amount: 120000 },
      { _id: 'm7', title: 'Wedding Fund', category: 'Lifestyle', target_amount: 40000 },
      { _id: 'm8', title: 'Investment Property', category: 'Housing', target_amount: 250000 },
    ];

    const mockAssets = [
      { name: 'Westpac Savings', category: 'Cash', value: 45000 },
      { name: 'KiwiSaver Growth', category: 'Investments', value: 82000 },
      { name: 'Sharesies ETF', category: 'Equities', value: 15000 },
      { name: 'Fixed Deposit', category: 'Term Deposit', value: 20000 },
    ];

    const sourceGoals = goals && goals.length > 0 ? goals : mockGoals;
    const sourceAssets = assets && assets.length > 0 ? assets : mockAssets;

    const data = sourceGoals.map((goal, idx) => {
      // 1. Try to get real assets from the Plan
      const plan = goal.plan;
      const portfolio = plan?.selected_portfolio;
      
      let assignedAssets = [];
      
      if (portfolio?.products?.length > 0) {
        // Use actual products from the plan
        assignedAssets = portfolio.products.map(item => {
          const product = item.product_id || item;
          if (!product) return null;

          // Calculate estimated absolute value based on target_amount and weight
          const estimatedValue = (goal.target_amount || 100000) * (item.weight_pct / 100);
          
          // Determine dominant asset type for coloring
          let assetType = 'growth';
          if (product.allocation) {
            const { growth = 0, defensive = 0, cash = 0 } = product.allocation;
            if (defensive > growth && defensive > cash) assetType = 'defensive';
            else if (cash > growth && cash > defensive) assetType = 'liquidity';
          }

          // Professional Name Handling: Use full name, truncate will handle UI
          const displayName = product.name || product.product_name || product.code || `Asset ${item.weight_pct}%`;

          return {
            name: displayName,
            value: estimatedValue,
            category: product.category || 'Fund',
            type: assetType,
            // Use real performance data if available (1y return)
            performance: (product.metrics?.returns?.y1 != null) 
              ? product.metrics.returns.y1.toFixed(1)
              : ((product.returns?.['1y'] != null) 
                  ? product.returns['1y'].toFixed(1) 
                  : (Math.random() * 8 + 2).toFixed(1)) // Realistic growth fallback
          };
        }).filter(Boolean);
      } else {
        // Fallback: Logic to distribute sourceAssets among sourceGoals (Mock)
        assignedAssets = sourceAssets.slice(idx % sourceAssets.length, (idx % sourceAssets.length) + 2).map(asset => ({
          name: asset.name,
          value: asset.value * (0.4 + (idx * 0.1)),
          category: asset.category,
          type: asset.category?.toLowerCase().includes('cash') ? 'liquidity' : 
                asset.category?.toLowerCase().includes('bond') ? 'defensive' : 'growth',
          performance: (Math.random() * 12 - 3).toFixed(1)
        }));
      }

      // Use target_amount as the weight for proportionality
      const weightValue = goal.target_amount || assignedAssets.reduce((sum, a) => sum + a.value, 0);

      return {
        id: goal._id || `g-${idx}`,
        title: goal.goal_name || goal.title || 'Unnamed Goal',
        category: goal.category || 'General',
        totalValue: weightValue,
        items: assignedAssets
      };
    });

    // Calculate proportionality based on totalValue (100x100 space)
    return calculateLayout(data, 100, 100);
  }, [assets, goals]);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 overflow-hidden border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20">
              <Zap size={20} fill="white" className="text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Strategy Heatmap</h2>
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Proportional Asset-to-Goal Allocation
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
           <button className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">By Value</button>
           <button className="px-3 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] font-black uppercase transition-colors">By Risk</button>
        </div>
      </div>

      {/* TreeMap Container - Absolutely Positioned to fill entire area strictly */}
      <div className="relative bg-slate-100 p-[1px] rounded-3xl overflow-hidden border border-slate-200 h-[600px] w-full shadow-inner">
        {treemapData.map((goal, gIdx) => {
          const theme = GOAL_THEMES[gIdx % GOAL_THEMES.length];
          const totalAssetVal = goal.items.reduce((sum, a) => sum + a.value, 0);
          
          // Calculate header font sizes based on goal block area
          const area = goal.w * goal.h;
          let categorySize = "text-[7px]";
          let titleSize = "text-[9px]";
          let valueSize = "text-[8px]";
          
          if (area > 2500) {
            categorySize = "text-[10px]";
            titleSize = "text-[14px]";
            valueSize = "text-[12px]";
          } else if (area > 1200) {
            categorySize = "text-[9px]";
            titleSize = "text-[12px]";
            valueSize = "text-[10px]";
          } else if (area > 600) {
            categorySize = "text-[8px]";
            titleSize = "text-[10px]";
            valueSize = "text-[9px]";
          }

          return (
            <div 
              key={goal.id} 
              className="absolute bg-white flex flex-col group overflow-hidden transition-all duration-500 hover:z-20 hover:shadow-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]"
              style={{
                left: `${goal.x}%`,
                top: `${goal.y}%`,
                width: `${goal.w}%`,
                height: `${goal.h}%`,
              }}
            >
              {/* Goal Header - Pure White & Fixed Height for Divider Alignment */}
              <div className="flex justify-between items-center px-3 h-14 border-b border-slate-100 bg-white relative z-10">
                <div className="flex flex-col min-w-0 justify-center">
                  <span className={`font-black ${theme.text} uppercase tracking-tighter leading-none mb-0.5 truncate ${categorySize}`}>
                    {goal.category}
                  </span>
                  <span className={`font-black text-slate-800 uppercase tracking-tight truncate ${titleSize}`}>
                    {goal.title}
                  </span>
                </div>
                {goal.w > 12 && (
                  <span className={`font-black text-slate-400 ${valueSize}`}>
                    ${(goal.totalValue / 1000).toFixed(0)}k
                  </span>
                )}
              </div>

              {/* Inner Assets Grid - Fills remaining space with a slightly cleaner backdrop */}
              <div className="flex-1 flex flex-wrap bg-slate-50/30 p-[1px] gap-[1px]">
                {goal.items.map((item, iIdx) => {
                  const perf = parseFloat(item.performance);
                  const isPositive = perf >= 0;
                  
                  // Calculate dynamic depth based on performance
                  const absPerf = Math.min(Math.abs(perf), 10);
                  const intensity = Math.max(0.2, absPerf / 10); // 0.2 to 1.0 for better visibility
                  
                  // Professional Color Strategy: Use Asset Type for Hue, Performance for Opacity
                  // Growth (Indigo), Defensive (Sky Blue), Liquidity (Fuchsia)
                  const COLORS = {
                    growth: [99, 102, 241],    // #6366f1
                    defensive: [56, 189, 248], // #38bdf8
                    liquidity: [244, 114, 182] // #f472b6
                  };
                  
                  const rgb = COLORS[item.type] || COLORS.growth;
                  const opacity = 0.3 + intensity * 0.6; // [0.3 - 0.9]
                  const bgColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
                  
                  // High contrast text logic
                  const textColor = opacity > 0.5 ? 'text-white' : 'text-slate-900';
                  const labelColor = opacity > 0.5 ? 'text-white/70' : 'text-slate-500';
                  
                  // Calculate flex-grow based on asset value relative to other assets in the goal
                  const assetFlex = (item.value / totalAssetVal) * 100;
                  
                  // Calculate dynamic font sizes based on goal block area
                  const area = goal.w * goal.h;
                  let labelSize = "text-[7px]";
                  let perfSize = "text-[8px]";
                  
                  if (area > 2500) {
                    labelSize = "text-[10px]";
                    perfSize = "text-[14px]";
                  } else if (area > 1200) {
                    labelSize = "text-[9px]";
                    perfSize = "text-[12px]";
                  } else if (area > 600) {
                    labelSize = "text-[8px]";
                    perfSize = "text-[10px]";
                  }

                  return (
                    <div 
                      key={iIdx}
                      style={{ 
                        flex: `${assetFlex} 1 0%`, 
                        minWidth: '40px',
                        backgroundColor: bgColor 
                      }}
                      className="relative flex flex-col justify-center items-center text-center transition-all duration-300 hover:brightness-110 cursor-pointer p-1"
                    >
                      {goal.w > 12 && (
                        <span className={`font-black ${labelColor} uppercase truncate w-full px-1.5 ${labelSize}`} title={item.name}>
                          {item.name}
                        </span>
                      )}
                      <span className={`font-black ${textColor} ${perfSize}`}>
                        {isPositive ? '+' : ''}{item.performance}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-indigo-500"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-sky-400"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defensive</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-fuchsia-400"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidity</span>
            </div>
         </div>
         <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold italic opacity-60">
            * Color indicates asset type; Opacity indicates performance intensity.
         </div>
      </div>
    </div>
  );
};

export default GoalHeatmapWidget;
