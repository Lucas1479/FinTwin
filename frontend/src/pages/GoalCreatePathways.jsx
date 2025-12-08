import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { MessageSquare, LayoutTemplate, Target } from 'lucide-react';

const GoalCreatePathways = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto pt-8 animate-fade-in">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Target size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Create a new goal
              </h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base">
                Choose how you want to start. You can either talk to the AI or pick from a preset gallery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Pathway A: AI Conversational Intake */}
            <button
              type="button"
              onClick={() => navigate('/goals/new/ai')}
              className="group text-left border border-slate-100 rounded-2xl p-6 hover:border-purple-200 hover:bg-purple-50/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <MessageSquare size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Talk to the AI
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Describe your idea in natural language. The AI will ask follow-up questions and structure it into a plan.
              </p>
              <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">
                Recommended for fuzzy goals
              </span>
            </button>

            {/* Pathway B: Goal Gallery */}
            <button
              type="button"
              onClick={() => navigate('/goals/new/gallery')}
              className="group text-left border border-slate-100 rounded-2xl p-6 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutTemplate size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Choose from gallery
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Start from curated templates like Retirement, Home, or Travel and fine-tune the numbers yourself.
              </p>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Recommended for clear goals
              </span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoalCreatePathways;


