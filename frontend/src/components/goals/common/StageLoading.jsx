const StageLoading = ({ text = 'AI is structuring your plan...' }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-pulse">
    <div className="w-16 h-16 bg-slate-200 rounded-full" />
    <div className="h-4 w-48 bg-slate-200 rounded" />
    <p className="text-slate-400 text-sm">{text}</p>
  </div>
);

export default StageLoading;

