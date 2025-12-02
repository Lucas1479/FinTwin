import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Target } from 'lucide-react';

const GoalsPage = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pt-8 animate-fade-in">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <Target size={32} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">My Goals</h1>
          
          <div className="prose prose-slate max-w-none">
            <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Positioning: Future</h3>
              <p className="text-slate-600">
                This is the core business module of FinTwin. Define your financial goals here and let AI assist you in achieving them.
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Core Features</h3>
            <ul className="space-y-3 text-slate-600 list-disc pl-5">
              <li><strong>AI Goal Setting</strong>: Intelligent assistance for setting up goals like home purchase, retirement, and education funds.</li>
              <li><strong>Progress Tracking</strong>: Real-time monitoring of goal completion and visual gap analysis.</li>
              <li><strong>Strategy Adjustment</strong>: Dynamic suggestions for adjustments when market conditions or life circumstances change.</li>
            </ul>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center gap-4 flex-col sm:flex-row">
            <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-full text-xs font-bold uppercase tracking-widest">
              Work In Progress
            </span>
            <Link
              to="/goals/new"
              className="btn-primary-rounded text-sm font-semibold px-5 py-2"
            >
              Create your first goal
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoalsPage;
