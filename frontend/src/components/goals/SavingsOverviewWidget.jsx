import { useState, useEffect } from 'react';
import { ArrowUpDown, Database } from 'lucide-react';

const SavingsOverviewWidget = () => {
  const [yearView, setYearView] = useState('current'); // 'current' | 'previous'
  const [realData, setRealData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch real goals data on mount
  useEffect(() => {
    fetchRealData();
  }, []);
  
  const fetchRealData = async () => {
    setLoading(true);
    try {
      // NOTE: getGoalHistory requires a valid goal ObjectId, not a period string
      // For aggregate goal data, we should use wealth summary instead
      // For now, just fetch current goals to display
      const monthlyData = {};
      
      // Always append current month's data from active goals
      const { getGoals } = await import('../../services/goalService');
      const currentGoals = await getGoals();
      if (currentGoals && currentGoals.length > 0) {
        const totalCurrent = currentGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
        const now = new Date();
        const currentMonthKey = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyData[currentMonthKey]) {
          monthlyData[currentMonthKey] = {
            date: now.toLocaleDateString('en-US', { month: 'short' }),
            current: totalCurrent,
            timestamp: now.getTime()
          };
        } else {
          // Update with latest current values
          monthlyData[currentMonthKey].current = totalCurrent;
        }
      }
      
      // Convert to array and sort by timestamp
      const sortedData = Object.values(monthlyData).sort((a, b) => a.timestamp - b.timestamp);
      
      // Calculate "previous" (comparison) values
      const formattedData = sortedData.map((item, idx) => ({
        date: item.date,
        current: item.current,
        previous: idx > 0 ? sortedData[idx - 1].current : item.current * 0.8
      }));
      
      setRealData(formattedData);
    } catch (error) {
      console.error('Failed to fetch goal history:', error);
      // Fallback: try to show at least current goals
      try {
        const { getGoals } = await import('../../services/goalService');
        const currentGoals = await getGoals();
        if (currentGoals && currentGoals.length > 0) {
          const totalCurrent = currentGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
          const now = new Date();
          setRealData([{
            date: now.toLocaleDateString('en-US', { month: 'short' }),
            current: totalCurrent,
            previous: totalCurrent * 0.8
          }]);
        } else {
          setRealData([]);
        }
      } catch (fallbackError) {
        setRealData([]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const chartData = realData;
  const hasRealData = realData.length > 0 && realData[0].current > 0;
  // Display value based on year view selection
  const displayValue = chartData.length > 0 
    ? (yearView === 'current' 
        ? chartData[chartData.length - 1].current 
        : chartData[chartData.length - 1].previous)
    : 0;
  const currentTotal = displayValue;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm h-full relative overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 z-30 relative">
            <h3 className="font-bold text-slate-900 text-base">Investment Overview</h3>
            <div className="flex flex-wrap items-center gap-2">
                {/* Year Toggle Button */}
                <button
                  onClick={() => setYearView(prev => prev === 'current' ? 'previous' : 'current')}
                  className="px-2.5 py-1 bg-slate-100/80 hover:bg-slate-200/50 rounded-lg text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all"
                >
                  {yearView === 'current' ? 'This year' : 'Last year'}
                  <ArrowUpDown size={10} className="opacity-50" />
                </button>
            </div>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-3xl">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 font-medium">Loading...</span>
            </div>
          </div>
        )}
        
        {!loading && !hasRealData && (
          <div className="absolute left-0 right-0 bottom-0 top-24 flex items-center justify-center bg-white z-20 rounded-b-3xl">
            <div className="text-center px-6">
              <Database size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600 mb-1">No Investment Data</p>
              <p className="text-[10px] text-slate-400">Create goals to track your investments</p>
            </div>
          </div>
        )}

        <div className="flex gap-8 mb-2 relative z-10">
            <div>
                <div className="text-2xl font-bold text-slate-900 mb-0.5">${currentTotal.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invested</div>
            </div>
        </div>

        {/* 
           Mock Chart Visual - Simplified SVG Wave 
           Restored to occupy more space and sit cleaner at the bottom
        */}
        <div className="absolute bottom-0 left-0 right-0 h-32 w-full pointer-events-none">
             <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7077d4" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#7077d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Current Year Line */}
                <path d="M0,30 C15,28 25,35 45,15 C65,0 75,20 100,10 L100,45 L0,45 Z" fill="url(#chartGradient)" />
                <path d="M0,30 C15,28 25,35 45,15 C65,0 75,20 100,10" fill="none" stroke="#7077d4" strokeWidth="0.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                
                {/* Previous Year Dotted Line */}
                <path d="M0,35 C20,30 40,38 60,25 C80,15 90,28 100,20" fill="none" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="2 2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
             </svg>
        </div>
    </div>
  );
};

export default SavingsOverviewWidget;
