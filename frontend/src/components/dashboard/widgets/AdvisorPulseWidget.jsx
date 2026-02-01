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
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">Advisor Pulse</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-Powered Reasoning</p>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {displayInsights.map((insight, i) => {
          const isWarning = insight.type === 'warning';
          const isSuccess = insight.type === 'success';
          
          return (
            <div 
              key={i} 
              className="group relative p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100/80 transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    isWarning ? 'bg-amber-100/50 text-amber-600' : 
                    isSuccess ? 'bg-emerald-100/50 text-emerald-600' : 
                    'bg-indigo-100/50 text-indigo-600'
                  }`}>
                    {isWarning ? <AlertTriangle size={12} strokeWidth={3} /> : 
                     isSuccess ? <CheckCircle2 size={12} strokeWidth={3} /> : 
                     <Zap size={12} strokeWidth={3} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
                    {insight.title}
                  </span>
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-all duration-300" />
              </div>
              
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                {insight.content}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  isWarning ? 'text-amber-600' : 
                  isSuccess ? 'text-emerald-600' : 
                  'text-indigo-600'
                }`}>
                  {insight.type}
                </span>
                <span className="text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  {insight.action} →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdvisorPulseWidget;

