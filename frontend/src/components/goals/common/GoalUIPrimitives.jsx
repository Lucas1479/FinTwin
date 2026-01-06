export const MetricBadge = ({ label, value, color = 'text-slate-700' }) => (
  <div className="px-3 lg:px-5 py-1.5 lg:py-2.5 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-100 text-center min-w-[90px] lg:min-w-[110px]">
    <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 lg:mb-1">
      {label}
    </p>
    <p className={`text-sm lg:text-lg font-bold ${color} tracking-tight`}>{value}</p>
  </div>
);

export const LegendRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
    <span className="text-xs font-bold text-slate-900">{value}</span>
  </div>
);

