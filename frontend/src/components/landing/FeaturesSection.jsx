import { Activity, Layers, Sparkles, ShoppingBag } from 'lucide-react';

const FeaturesSection = () => {
  return (
    <section className="py-32 bg-white relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Intelligence built-in.</h2>
          <p className="text-xl text-slate-500 max-w-2xl">A structured 4-step engine designed to turn raw data into actionable financial strategy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Simple */}
          <div className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Health Check</h3>
            <p className="text-slate-500 leading-relaxed">Automatic analysis of your emergency funds and debt-to-income ratios.</p>
          </div>

          {/* Card 2: Wide */}
          <div className="md:col-span-2 group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 text-slate-900" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Digital Twin Simulation</h3>
              <p className="text-slate-500 leading-relaxed max-w-md">Visualize scenarios. See exactly how delaying a car purchase today affects your retirement 30 years from now.</p>
            </div>
            
            {/* Abstract Decorative Element */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full opacity-50 blur-3xl group-hover:opacity-100 transition-opacity"></div>
            
            <div className="absolute bottom-8 right-8 hidden md:block">
              {/* Mini UI Element */}
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-lg transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
                <div className="flex gap-2 items-end">
                  <div className="w-2 h-8 bg-slate-200 rounded-sm"></div>
                  <div className="w-2 h-12 bg-slate-300 rounded-sm"></div>
                  <div className="w-2 h-16 bg-slate-900 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Wide */}
          <div className="md:col-span-2 group p-8 rounded-3xl bg-slate-900 text-white hover:shadow-2xl hover:shadow-slate-900/20 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Explanation Engine</h3>
              <p className="text-slate-400 leading-relaxed max-w-lg">No more black boxes. Our AI explains "Why" specific assets were chosen for your portfolio in plain English.</p>
            </div>
            <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          </div>

          {/* Card 4: Simple */}
          <div className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Product Mapping</h3>
            <p className="text-slate-500 leading-relaxed">Compare real-world KiwiSaver providers based on your strategy.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
