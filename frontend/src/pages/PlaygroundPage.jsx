import MainLayout from '../components/layout/MainLayout';
import { Gamepad2 } from 'lucide-react';

const PlaygroundPage = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pt-8 animate-fade-in">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
            <Gamepad2 size={32} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Playground</h1>
          
          <div className="prose prose-slate max-w-none">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Positioning: Experimental Field</h3>
              <p className="text-slate-600">
                Your financial laboratory. Conduct various hypothetical tests here without affecting your actual plan.
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Core Features</h3>
            <ul className="space-y-3 text-slate-600 list-disc pl-5">
              <li><strong>Scenario Simulation (A/B Test)</strong>: Compare long-term impacts of different decisions (e.g., "Buy now" vs "Rent and invest").</li>
              <li><strong>Standalone Calculators</strong>: A collection of tools including mortgage, compound interest, and retirement calculators.</li>
              <li><strong>What-if Stress Testing</strong>: Simulate the impact of extreme market conditions (e.g., economic crisis, unemployment) on your finances.</li>
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

export default PlaygroundPage;
