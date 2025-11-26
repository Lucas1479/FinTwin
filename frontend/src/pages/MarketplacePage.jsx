import MainLayout from '../components/layout/MainLayout';
import { ShoppingBag } from 'lucide-react';

const MarketplacePage = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pt-8 animate-fade-in">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
            <ShoppingBag size={32} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Marketplace</h1>
          
          <div className="prose prose-slate max-w-none">
            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Positioning: External Data</h3>
              <p className="text-slate-600">
                A place for decision-making or verification. Provides neutral, objective market data and product comparisons.
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Core Features</h3>
            <ul className="space-y-3 text-slate-600 list-disc pl-5">
              <li><strong>Product Comparator</strong>: Horizontal comparison of financial products (e.g., term deposits, mortgage rates).</li>
              <li><strong>Historical Performance</strong>: Query historical data for assets like funds and stocks.</li>
              <li><strong>KiwiSaver/Fund Screening</strong>: Filter the most suitable KiwiSaver providers based on your risk preference.</li>
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

export default MarketplacePage;
