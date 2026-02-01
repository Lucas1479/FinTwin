import { ArrowUpDown, Clock, TrendingUp, XCircle, CheckCircle2 } from 'lucide-react';

const GoalSummaryWidget = ({ goals = [] }) => {
  const getStatusCount = (statusList) => 
    goals.filter(g => {
      const rawStatus = g.status || 'in_progress';
      // Normalize status to lowercase and handle common variations
      const s = String(rawStatus).toLowerCase().replace(/\s+/g, '_');
      
      const normalizedStatusList = statusList.map(item => 
        item.toLowerCase().replace(/\s+/g, '_')
      );

      // Map 'active' to 'in_progress' and 'finished' to 'completed' for consistency
      let mappedStatus = s;
      if (s === 'active') mappedStatus = 'in_progress';
      if (s === 'finished') mappedStatus = 'completed';

      return normalizedStatusList.includes(mappedStatus);
    }).length;

  const stats = {
    notStarted: getStatusCount(['not_started']),
    inProgress: getStatusCount(['in_progress']),
    canceled: getStatusCount(['canceled']),
    finished: getStatusCount(['completed']),
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
         <h3 className="font-bold text-slate-900 text-base">Total goals</h3>
         <div className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1 border border-slate-100 uppercase tracking-wider">
            This year <ArrowUpDown size={10} />
         </div>
      </div>
      
      <div className="text-3xl font-bold text-slate-900 mb-5">{goals.length}</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-2.5 bg-orange-50/50 rounded-xl border border-orange-100/50">
            <div className="p-1.5 bg-white text-orange-500 rounded-lg shadow-sm">
                <Clock size={14} />
            </div>
            <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Not started</div>
                <div className="font-bold text-slate-900 text-sm leading-none">{stats.notStarted}</div>
            </div>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 bg-green-50/50 rounded-xl border border-green-100/50">
            <div className="p-1.5 bg-white text-green-500 rounded-lg shadow-sm">
                <TrendingUp size={14} />
            </div>
            <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">In progress</div>
                <div className="font-bold text-slate-900 text-sm leading-none">{stats.inProgress}</div>
            </div>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 bg-red-50/50 rounded-xl border border-red-100/50">
            <div className="p-1.5 bg-white text-red-500 rounded-lg shadow-sm">
                <XCircle size={14} />
            </div>
            <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Canceled</div>
                <div className="font-bold text-slate-900 text-sm leading-none">{stats.canceled}</div>
            </div>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 bg-brand-50/50 rounded-xl border border-brand-100/50">
            <div className="p-1.5 bg-white text-brand-500 rounded-lg shadow-sm">
                <CheckCircle2 size={14} />
            </div>
            <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Finished</div>
                <div className="font-bold text-slate-900 text-sm leading-none">{stats.finished}</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GoalSummaryWidget;

