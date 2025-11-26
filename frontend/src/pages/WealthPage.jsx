import MainLayout from '../components/layout/MainLayout';
import { Briefcase } from 'lucide-react';

const WealthPage = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pt-8 animate-fade-in">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-brand-50 text-primary rounded-2xl flex items-center justify-center mb-6">
            <Briefcase size={32} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">My Wealth</h1>
          
          <div className="prose prose-slate max-w-none">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Positioning: Past / Present</h3>
              <p className="text-slate-600">
                This is the source of truth for all financial calculations. Here you can input and manage all your assets and liabilities.
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Core Features</h3>
            <ul className="space-y-3 text-slate-600 list-disc pl-5">
              <li><strong>Balance Sheet Entry</strong>: Manage properties, cash, investment accounts, and various liabilities.</li>
              <li><strong>Liquidity Management</strong>: Monitor the health of your cash flow.</li>
              <li><strong>Data Source</strong>: Data here will directly drive AI predictions and recommendations.</li>
            </ul>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-center">
            <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-full text-xs font-bold uppercase tracking-widest">Work In Progress</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default WealthPage;
