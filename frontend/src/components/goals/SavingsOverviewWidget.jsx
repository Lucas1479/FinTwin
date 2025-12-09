import { ArrowUpDown } from 'lucide-react';

// MOCK DATA for chart - in future this will be passed via props
const MOCK_CHART_DATA = [
    { date: 'Jan', current: 15000, previous: 12000 },
    { date: 'Feb', current: 18000, previous: 14000 },
    { date: 'Mar', current: 26300, previous: 18000 },
    { date: 'Apr', current: 27500, previous: 22000 },
    { date: 'May', current: 31000, previous: 25000 },
    { date: 'Jun', current: 35000, previous: 28000 },
];

const SavingsOverviewWidget = ({ data = MOCK_CHART_DATA }) => {
  const currentTotal = data[data.length - 1].current;
  const currentDate = new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm h-full relative overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 z-10 relative">
            <h3 className="font-bold text-slate-900 text-base">Savings overview</h3>
            <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span> This year
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Last year
                </span>
                <div className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1 border border-slate-100 ml-1 uppercase tracking-wider">
                    This year <ArrowUpDown size={10} />
                </div>
            </div>
        </div>

        <div className="flex gap-8 mb-2 relative z-10">
            <div>
                <div className="text-2xl font-bold text-slate-900 mb-0.5">${currentTotal.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Saved</div>
            </div>
            <div>
                <div className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md text-[10px] font-bold mb-0.5 border border-brand-100">
                    {currentDate}
                </div>
                <div className="font-bold text-slate-900 text-sm">${(currentTotal * 0.75).toLocaleString()}</div>
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
