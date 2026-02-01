import { useState, useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
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
  // --- Treemap Layout Engine (Standard Squarified Treemap) ---
  // Improved algorithm to maintain aspect ratio closer to 1 (squares)
  const calculateLayout = (data, containerW, containerH) => {
    if (!data || data.length === 0) return [];
    
    // Normalize values to avoid zero-division and handle sort
    const totalValue = data.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    if (totalValue <= 0) return [];

    // Map items to have 'area' property relative to container size
    const totalArea = containerW * containerH;
    const items = data.map(d => ({
      ...d,
      value: d.totalValue, // Store original value for reference
      area: (d.totalValue / totalValue) * totalArea
    })).sort((a, b) => b.area - a.area); // Descending sort is critical for Squarified algorithm

    const result = [];
    let x = 0, y = 0, w = containerW, h = containerH;

    const getAspectRatio = (w, h) => Math.max(w / h, h / w);

    // Calculate worst aspect ratio for a row of items within a given side length
    const worst = (row, s) => {
      if (row.length === 0) return Infinity;
      const rowArea = row.reduce((sum, d) => sum + d.area, 0);
      const rowSide = rowArea / s; // Thickness of the row
      let maxAR = 0;
      for (const item of row) {
        const itemLength = item.area / rowSide;
        const ar = getAspectRatio(rowSide, itemLength);
        if (ar > maxAR) maxAR = ar;
      }
      return maxAR;
    };

    const layoutRow = (row) => {
      const rowArea = row.reduce((sum, d) => sum + d.area, 0);
      
      // Determine orientation based on shortest side of remaining space
      if (w < h) {
        // Shortest side is Width -> Create Horizontal Row (stacking vertically)
        const rowHeight = rowArea / w;
        let currentX = x;
        for (const item of row) {
          const itemWidth = item.area / rowHeight;
          result.push({ ...item, x: currentX, y: y, w: itemWidth, h: rowHeight });
          currentX += itemWidth;
        }
        y += rowHeight;
        h -= rowHeight;
      } else {
        // Shortest side is Height -> Create Vertical Column (stacking horizontally)
        const rowWidth = rowArea / h;
        let currentY = y;
        for (const item of row) {
          const itemHeight = item.area / rowWidth;
          result.push({ ...item, x: x, y: currentY, w: rowWidth, h: itemHeight });
          currentY += itemHeight;
        }
        x += rowWidth;
        w -= rowWidth;
      }
    };

    let currentRow = [];
    for (const item of items) {
      if (currentRow.length === 0) {
        currentRow.push(item);
        continue;
      }

      // We layout along the shortest side of the remaining rectangle
      const side = Math.min(w, h);
      const currentWorst = worst(currentRow, side);
      const newWorst = worst([...currentRow, item], side);

      if (newWorst <= currentWorst) {
        currentRow.push(item);
      } else {
        layoutRow(currentRow);
        currentRow = [item];
      }
    }
    
    if (currentRow.length > 0) {
      layoutRow(currentRow);
    }

    return result;
  };

  // Define the visual aspect ratio of the widget (Width / Height)
  // Assuming the widget is roughly 2.2x wider than it is tall (e.g. 1320px x 600px)
  const CONTAINER_ASPECT = 2.2;
  const LOGICAL_WIDTH = 100 * CONTAINER_ASPECT;
  const LOGICAL_HEIGHT = 100;

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
    // 1. Define high-quality mock data for 6 goals
    const mockGoals = [
      { _id: 'm1', title: 'Buy First Home', category: 'Housing', target_amount: 150000 },
      { _id: 'm2', title: 'Retirement fund', category: 'Retirement', target_amount: 500000 },
      { _id: 'm3', title: 'Emergency Fund', category: 'Emergency', target_amount: 30000 },
      { _id: 'm4', title: 'New Vehicle', category: 'Vehicle', target_amount: 45000 },
      { _id: 'm5', title: 'Europe Trip 2027', category: 'Lifestyle', target_amount: 25000 },
      { _id: 'm6', title: 'Kid\'s Education', category: 'Education', target_amount: 120000 },
    ];

    const mockAssets = [
      { name: 'Westpac Savings', category: 'Cash', value: 45000 },
      { name: 'KiwiSaver Growth', category: 'Investments', value: 82000 },
      { name: 'Sharesies ETF', category: 'Equities', value: 15000 },
      { name: 'Fixed Deposit', category: 'Term Deposit', value: 20000 },
    ];

    const hasRealGoals = goals && goals.length > 0;
    const hasRealAssets = assets && assets.length > 0;
    const sourceGoals = hasRealGoals ? goals : mockGoals;
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

      if (viewMode === 'invested') {
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
        } else if (!hasRealGoals) {
          // Mock fallback
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
        // Target Value View Mode logic
        if (portfolio?.products?.length > 0) {
          assignedAssets = portfolio.products.map(item => {
            const product = item.product_id || item;
            if (!product) return null;

            const estimatedValue = (goal.target_amount || 0) * (item.weight_pct / 100);
            
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
              performance: (product.metrics?.returns?.y5 != null) 
                ? product.metrics.returns.y5.toFixed(1)
                : ((product.returns?.['5y'] != null) 
                    ? product.returns['5y'].toFixed(1) 
                    : "0.0"),
              weight_pct: item.weight_pct
            };
          }).filter(Boolean);
        } else if (!hasRealGoals) {
          assignedAssets = sourceAssets.slice(idx % sourceAssets.length, (idx % sourceAssets.length) + 2).map(asset => ({
            name: asset.name,
            value: (goal.target_amount || 0) * (0.4 + (idx * 0.1)),
            category: asset.category,
            type: assetTypeFromCategory(asset.category),
            performance: (Math.random() * 12 - 3).toFixed(1)
          }));
        }
        displayTotalValue = goal.target_amount || 0;
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

    return calculateLayout(data, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }, [assets, goals, viewMode]);

  const hasRealGoals = goals && goals.length > 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 text-slate-900 overflow-hidden border border-slate-100 relative group/heatmap">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight">Goal Heatmap</h2>
            {!hasRealGoals && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg animate-pulse">
                <Sparkles size={10} className="text-amber-500" />
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Preview Mode</span>
              </div>
            )}
            <InfoTooltip 
                content="Visualizes your wealth distribution by Goal. Larger blocks mean higher current value. Performance shows 5-year average returns."
                anchor={HELP_ANCHORS.DASHBOARD.HEATMAP} 
            />
          </div>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-widest opacity-60">
            Proportional Asset-to-Goal Allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {/* TreeMap Container - Absolutely Positioned to fill entire area strictly */}
      <div className={`relative bg-slate-100 p-[1px] rounded-3xl overflow-hidden border border-slate-200 h-[600px] w-full shadow-inner transition-all duration-700 ${!hasRealGoals ? 'opacity-70 grayscale-[0.2]' : ''}`}>
        {treemapData.map((goal, gIdx) => {
          const theme = GOAL_THEMES[gIdx % GOAL_THEMES.length];
          const assetLayout = calculateLayout(
            goal.items.map((item, index) => ({
              ...item,
              totalValue: item.value,
              _idx: index
            })),
            goal.w,
            goal.h
          );
          
          // Calculate header font sizes based on goal block area (normalized to 100x100 scale for consistency)
          // We convert logical area back to a percentage-based area score
          const areaScore = (goal.w / CONTAINER_ASPECT) * goal.h;
          
          let categorySize = "text-[7px]";
          let titleSize = "text-[9px]";
          let valueSize = "text-[8px]";
          
          // Use normalized areaScore for consistent text sizing regardless of aspect ratio
          if (areaScore > 2500) {
            categorySize = "text-[10px]";
            titleSize = "text-[14px]";
            valueSize = "text-[12px]";
          } else if (areaScore > 1200) {
            categorySize = "text-[9px]";
            titleSize = "text-[12px]";
            valueSize = "text-[10px]";
          } else if (areaScore > 600) {
            categorySize = "text-[8px]";
            titleSize = "text-[10px]";
            valueSize = "text-[9px]";
          }

          return (
            <div 
              key={goal.id} 
              className="absolute bg-white flex flex-col group overflow-hidden transition-all duration-500 hover:z-20 hover:shadow-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]"
              style={{
                // Critical Fix: Convert logical coordinates back to CSS percentages
                left: `${goal.x / CONTAINER_ASPECT}%`,
                top: `${goal.y}%`,
                width: `${goal.w / CONTAINER_ASPECT}%`,
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
                {goal.w > (12 * CONTAINER_ASPECT) && (
                  <span className={`font-black text-slate-400 ${valueSize}`}>
                    ${(goal.displayValue / 1000).toFixed(0)}k
                  </span>
                )}
                {areaScore > 600 && (
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
                  // Use areaScore for consistent sizing
                  const areaScore = (goal.w / CONTAINER_ASPECT) * goal.h; 
                  
                  let labelSize = "text-[7px]";
                  let perfSize = "text-[8px]";
                  
                  if (areaScore > 2500) {
                    labelSize = "text-[10px]";
                    perfSize = "text-[14px]";
                  } else if (areaScore > 1200) {
                    labelSize = "text-[9px]";
                    perfSize = "text-[12px]";
                  } else if (areaScore > 600) {
                    labelSize = "text-[8px]";
                    perfSize = "text-[10px]";
                  }

                  return (
                    <div 
                      key={item._idx ?? iIdx}
                      style={{ 
                        // Critical Fix: Inner items are relative to the Goal parent
                        // So we divide by the Goal's logical dimensions to get the percentage WITHIN the goal
                        left: `${(item.x / goal.w) * 100}%`,
                        top: `${(item.y / goal.h) * 100}%`,
                        width: `${(item.w / goal.w) * 100}%`,
                        height: `${(item.h / goal.h) * 100}%`,
                        backgroundColor: bgColor
                      }}
                      className="absolute flex flex-col justify-center items-center text-center transition-all duration-300 hover:brightness-110 cursor-pointer p-1 group/asset border border-white/20"
                    >
                      {goal.w > (12 * CONTAINER_ASPECT) && (
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
            * Color indicates asset type; Opacity indicates 5-year return intensity.
         </div>
      </div>
    </div>
  );
};

export default GoalHeatmapWidget;
