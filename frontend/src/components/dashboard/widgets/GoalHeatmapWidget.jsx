import { useState, useMemo } from 'react';
import InfoTooltip from '../../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../../constants/helpAnchors'; // Import Registry

const GoalHeatmapWidget = ({ assets = [], goals = [] }) => {
  const [viewMode, setViewMode] = useState('target');
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
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

      const worstAspect = (group, width, height) => {
        if (group.length === 0) return Infinity;
        const groupTotal = group.reduce((sum, d) => sum + d.totalValue, 0);
        if (groupTotal <= 0) return Infinity;
        return group.reduce((worst, item) => {
          const area = (item.totalValue / groupTotal) * (width * height);
          if (area <= 0) return worst;
          const rectW = Math.max(1e-6, area / height);
          const rectH = Math.max(1e-6, area / width);
          const ratio = rectW > rectH ? rectW / rectH : rectH / rectW;
          return Math.max(worst, ratio);
        }, 1);
      };

      const splitW = (firstValue / total) * w;
      const splitH = (firstValue / total) * h;

      const horizontalWorst = Math.max(
        worstAspect(firstGroup, splitW, h),
        worstAspect(secondGroup, w - splitW, h)
      );
      const verticalWorst = Math.max(
        worstAspect(firstGroup, w, splitH),
        worstAspect(secondGroup, w, h - splitH)
      );

      if (horizontalWorst <= verticalWorst) {
        split(firstGroup, x, y, splitW, h);
        split(secondGroup, x + splitW, y, w - splitW, h);
      } else {
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

    const hasRealAssets = assets && assets.length > 0;
    const sourceGoals = goals && goals.length > 0 ? goals : mockGoals;
    const sourceAssets = hasRealAssets ? assets : mockAssets;

    const assetTypeFromCategory = (category = '') => {
      const normalized = String(category).toLowerCase();
      if (normalized.includes('cash') || normalized.includes('bank') || normalized.includes('term')) return 'liquidity';
      if (normalized.includes('bond') || normalized.includes('defensive')) return 'defensive';
      return 'growth';
    };

    const goalLinkedAssets = sourceAssets
      .filter(asset => !asset.record_type || asset.record_type === 'Asset')
      .reduce((map, asset) => {
        const linkedGoalId = asset.asset_details?.linked_goal_id;
        if (!linkedGoalId) return map;
        const key = String(linkedGoalId);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(asset);
        return map;
      }, new Map());

    const data = sourceGoals.map((goal, idx) => {
      const plan = goal.plan;
      const portfolio = plan?.selected_portfolio;
      const goalId = String(goal._id || goal.id || '');
      const linkedAssets = goalLinkedAssets.get(goalId) || [];

      let assignedAssets = [];
      let displayTotalValue = 0;

      if (viewMode === 'invested' && (linkedAssets.length > 0 || !hasRealAssets)) {
        if (linkedAssets.length > 0) {
          assignedAssets = linkedAssets.map(asset => {
            const perfValue = Number(asset.performance ?? asset.asset_details?.performance ?? 0) || 0;
            return {
              name: asset.name,
              value: asset.value || 0,
              category: asset.category,
              type: assetTypeFromCategory(asset.category),
              performance: perfValue.toFixed(1),
              weight_pct: asset.asset_details?.weight_pct
            };
          });
        } else {
          // Mock fallback when no real assets exist
          assignedAssets = sourceAssets.slice(idx % sourceAssets.length, (idx % sourceAssets.length) + 2).map(asset => ({
            name: asset.name,
            value: asset.value * (0.4 + (idx * 0.1)),
            category: asset.category,
            type: assetTypeFromCategory(asset.category),
            performance: (Math.random() * 12 - 3).toFixed(1)
          }));
        }

        displayTotalValue = assignedAssets.reduce((sum, a) => sum + a.value, 0);
      } else {
        if (portfolio?.products?.length > 0) {
          assignedAssets = portfolio.products.map(item => {
            const product = item.product_id || item;
            if (!product) return null;

            const estimatedValue = (goal.target_amount || 100000) * (item.weight_pct / 100);
            
            let assetType = 'growth';
            if (product.allocation) {
              const { growth = 0, defensive = 0, cash = 0 } = product.allocation;
              if (defensive > growth && defensive > cash) assetType = 'defensive';
              else if (cash > growth && cash > defensive) assetType = 'liquidity';
            }

            const displayName = product.name || product.product_name || product.code || `Asset ${item.weight_pct}%`;

            return {
              name: displayName,
              value: estimatedValue,
              category: product.category || 'Fund',
              type: assetType,
              performance: (product.metrics?.returns?.y1 != null) 
                ? product.metrics.returns.y1.toFixed(1)
                : ((product.returns?.['1y'] != null) 
                    ? product.returns['1y'].toFixed(1) 
                    : (Math.random() * 8 + 2).toFixed(1)),
              weight_pct: item.weight_pct
            };
          }).filter(Boolean);
        } else {
          assignedAssets = sourceAssets.slice(idx % sourceAssets.length, (idx % sourceAssets.length) + 2).map(asset => ({
            name: asset.name,
            value: asset.value * (0.4 + (idx * 0.1)),
            category: asset.category,
            type: assetTypeFromCategory(asset.category),
            performance: (Math.random() * 12 - 3).toFixed(1)
          }));
        }

        displayTotalValue = goal.target_amount || assignedAssets.reduce((sum, a) => sum + a.value, 0);
      }

      const layoutValue = displayTotalValue > 0 ? displayTotalValue : 1;

      return {
        id: goal._id || `g-${idx}`,
        title: goal.goal_name || goal.title || 'Unnamed Goal',
        category: goal.category || 'General',
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        due_date: goal.due_date,
        status: goal.status,
        totalValue: layoutValue,
        displayValue: displayTotalValue,
        items: assignedAssets
      };
    });

    // Calculate proportionality based on totalValue (100x100 space)
    return calculateLayout(data, 100, 100);
  }, [assets, goals, viewMode]);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 overflow-hidden border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight">Strategy Heatmap</h2>
            <InfoTooltip 
                content="Visualizes your wealth distribution by Goal. Larger blocks mean higher current value."
                anchor={HELP_ANCHORS.DASHBOARD.HEATMAP} 
            />
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Proportional Asset-to-Goal Allocation
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
           <button
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm transition-colors ${viewMode === 'target' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
             onClick={() => setViewMode('target')}
           >
             Target Value
           </button>
           <button
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm transition-colors ${viewMode === 'invested' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
             onClick={() => setViewMode('invested')}
           >
             Invested Value
           </button>
        </div>
      </div>

      {/* TreeMap Container - Absolutely Positioned to fill entire area strictly */}
      <div className="relative bg-slate-100 p-[1px] rounded-3xl overflow-hidden border border-slate-200 h-[600px] w-full shadow-inner">
        {treemapData.map((goal, gIdx) => {
          const theme = GOAL_THEMES[gIdx % GOAL_THEMES.length];
          const assetLayout = calculateLayout(
            goal.items.map((item, index) => ({
              ...item,
              totalValue: item.value,
              _idx: index
            })),
            100,
            100
          );
          
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
              <div className="flex justify-between items-center px-3 h-14 border-b border-slate-100 bg-white relative z-10 group/goal">
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
                    ${(goal.displayValue / 1000).toFixed(0)}k
                  </span>
                )}
                {area > 600 && (
                  <div className="absolute left-2 right-2 top-full mt-2 opacity-0 group-hover/goal:opacity-100 transition-opacity pointer-events-none">
                    <div className="rounded-xl border border-slate-200 bg-white/95 shadow-lg p-2 text-[10px] text-slate-600">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-slate-500 uppercase">Target</span>
                        <span className="font-black text-slate-800">{formatCurrency(goal.target_amount)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-slate-500 uppercase">Invested</span>
                        <span className="font-black text-slate-800">{formatCurrency(goal.current_amount ?? goal.displayValue)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-slate-500 uppercase">Due</span>
                        <span className="font-black text-slate-800">{formatDate(goal.due_date)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inner Assets Grid - Squarified layout for asset tiles */}
              <div className="relative flex-1 bg-slate-50/30 p-[1px] overflow-hidden">
                {assetLayout.map((item, iIdx) => {
                  const perf = parseFloat(item.performance);
                  const isPositive = perf >= 0;
                  
                  // Calculate dynamic depth based on performance
                  const absPerf = Math.min(Math.abs(perf), 10);
                  const intensity = Math.max(0.2, absPerf / 10); // 0.2 to 1.0 for better visibility
                  
                  // Professional Color Strategy: Use Asset Type for Hue, Performance for Opacity
                  // Growth (Deep Indigo), Defensive (Mid Lavender), Liquidity (Soft Indigo)
                  const COLORS = {
                    growth: [49, 46, 129],    // #312e81 - Deep Indigo
                    defensive: [79, 70, 229], // #4f46e5 - Main Indigo
                    liquidity: [129, 140, 248] // #818cf8 - Light Indigo
                  };
                  
                  const rgb = COLORS[item.type] || COLORS.growth;
                  const opacity = 0.3 + intensity * 0.6; // [0.3 - 0.9]
                  const bgColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
                  
                  // High contrast text logic
                  const textColor = opacity > 0.5 ? 'text-white' : 'text-slate-900';
                  const labelColor = opacity > 0.5 ? 'text-white/70' : 'text-slate-500';
                  
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
                      key={item._idx ?? iIdx}
                      style={{ 
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.w}%`,
                        height: `${item.h}%`,
                        backgroundColor: bgColor
                      }}
                      className="absolute flex flex-col justify-center items-center text-center transition-all duration-300 hover:brightness-110 cursor-pointer p-1 group/asset"
                    >
                      {goal.w > 12 && (
                        <span className={`font-black ${labelColor} uppercase truncate w-full px-1.5 ${labelSize} group-hover/asset:opacity-0 transition-opacity`} title={item.name}>
                          {item.name}
                        </span>
                      )}
                      <span className={`font-black ${textColor} ${perfSize} group-hover/asset:opacity-0 transition-opacity`}>
                        {isPositive ? '+' : ''}{item.performance}%
                      </span>
                      <div className="absolute inset-0 opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none">
                        <div className="absolute inset-0 bg-slate-900/60"></div>
                        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center px-2">
                          <div className="text-[9px] font-black text-white uppercase truncate w-full">
                            {item.name}
                          </div>
                          <div className="text-[9px] font-bold text-white/90">
                            {formatCurrency(item.value)}
                          </div>
                          {item.weight_pct != null && (
                            <div className="text-[8px] font-bold text-white/70">
                              Weight {item.weight_pct}%
                            </div>
                          )}
                        </div>
                      </div>
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
               <div className="w-3 h-3 rounded bg-indigo-900"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-indigo-600"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defensive</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-indigo-400"></div>
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
