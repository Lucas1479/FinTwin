import { Brain } from 'lucide-react';

const StageLoading = ({ text = 'AI is structuring your plan...', subtext = 'Analyzing your information and generating guidance' }) => (
  <div className="animate-fade-in">
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Brain className="absolute inset-0 m-auto text-indigo-600" size={24} />
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900 mb-1">{text}</div>
          <div className="text-sm text-slate-500">{subtext}</div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default StageLoading;

