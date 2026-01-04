import { Zap, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

const AdvisorPulseWidget = ({ insights = [] }) => {
  // Mock insights if none provided
  const displayInsights = insights.length > 0 ? insights : [
    { 
      type: 'opportunity', 
      title: 'Contribution Boost', 
      content: 'Increase monthly contribution by $200 to achieve your Travel goal before Christmas 2026.',
      action: 'Apply Now' 
    },
    { 
      type: 'warning', 
      title: 'PIR Mismatch', 
      content: 'Your current PIR is 28%, but based on last year\'s income, you might qualify for 17.5%.',
      action: 'Review Tax' 
    },
    { 
      type: 'success', 
      title: 'Goal Milestone', 
      content: 'You just crossed 50% of your Education fund target. Keep up the consistent pace!',
      action: 'View Milestone' 
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">Advisor Pulse</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-Powered Reasoning</p>
        </div>
      </div>

      <div className="space-y-4">
        {displayInsights.map((insight, i) => {
          const isWarning = insight.type === 'warning';
          const isSuccess = insight.type === 'success';
          return (
            <div 
              key={i} 
              className={`p-5 rounded-[1.8rem] border transition-all hover:scale-[1.02] cursor-pointer group
                ${isWarning ? 'bg-amber-50/50 border-amber-100 hover:border-amber-200' : 
                  isSuccess ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200' : 
                  'bg-slate-50/50 border-slate-100 hover:border-brand-100'}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isWarning ? <AlertTriangle size={14} className="text-amber-600" /> : 
                   isSuccess ? <CheckCircle2 size={14} className="text-emerald-600" /> : 
                   <Zap size={14} className="text-purple-600" />}
                  <span className={`text-[10px] font-black uppercase tracking-wider
                    ${isWarning ? 'text-amber-600' : isSuccess ? 'text-emerald-600' : 'text-purple-600'}
                  `}>
                    {insight.title}
                  </span>
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                {insight.content}
              </p>
              <button 
                className={`mt-4 text-[10px] font-black px-4 py-2 rounded-xl transition-all
                  ${isWarning ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 
                    isSuccess ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 
                    'bg-slate-900 text-white shadow-lg shadow-slate-900/20 group-hover:bg-brand-600'}
                `}
              >
                {insight.action}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdvisorPulseWidget;

