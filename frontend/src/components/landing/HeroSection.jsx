import { ArrowRight, Home, TrendingUp, Plus, CheckCircle } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative z-10 pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* Tagline / Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-primary text-xs font-bold mb-8 animate-fade-in opacity-0 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          AI-Powered Financial Engine v2.0
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 text-slate-900 animate-fade-in delay-100 opacity-0">
          Build wealth,<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-indigo-600">without the guesswork.</span>
        </h1>

        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium animate-fade-in delay-200 opacity-0">
          Create a digital twin of your financial future. Simulate goals, optimize KiwiSaver, and receive independent, data-driven advice.
        </p>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-24 animate-fade-in delay-300 opacity-0 px-4">
          <a href="/register" className="btn-primary-rounded font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1">
            Start Simulation
            <ArrowRight className="w-5 h-5" />
          </a>
          <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 hover:-translate-y-1">
            View Demo
          </button>
        </div>

        {/* The Clean 3D Mockup */}
        <div className="perspective-container max-w-6xl mx-auto animate-fade-in delay-300 opacity-0">
          <div className="tilt-card bg-white rounded-[2rem] p-2 shadow-2xl shadow-indigo-500/10 relative ring-1 ring-slate-100">
            {/* Window Frame */}
            <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 overflow-hidden">
              {/* Browser Header */}
              <div className="h-12 bg-white border-b border-slate-100 flex items-center px-6 gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/50"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/50"></div>
                </div>
                <div className="ml-auto flex gap-3 items-center">
                  <div className="w-32 h-6 bg-slate-50 rounded-lg border border-slate-100"></div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="grid grid-cols-12 h-[600px] bg-slate-50/50">
                {/* Sidebar */}
                <div className="col-span-2 bg-white border-r border-slate-100 p-6 hidden md:flex flex-col gap-6">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">F</div>
                  
                  <div className="space-y-3 mt-4">
                    <div className="h-10 w-full bg-brand-50 rounded-xl border border-brand-100 flex items-center px-3">
                        <div className="w-4 h-4 bg-primary/20 rounded-full mr-2"></div>
                        <div className="h-2 w-16 bg-primary/20 rounded-full"></div>
                    </div>
                    <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3">
                        <div className="w-4 h-4 bg-slate-100 rounded-full mr-2"></div>
                        <div className="h-2 w-20 bg-slate-100 rounded-full"></div>
                    </div>
                     <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3">
                        <div className="w-4 h-4 bg-slate-100 rounded-full mr-2"></div>
                        <div className="h-2 w-14 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>

                  <div className="mt-auto h-24 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
                      <div className="h-2 w-12 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-2 w-20 bg-white/10 rounded-full"></div>
                  </div>
                </div>

                {/* Main Area */}
                <div className="col-span-12 md:col-span-10 p-8 md:p-10">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">Total Net Worth</div>
                      <div className="text-5xl font-extrabold text-slate-900 tracking-tight">$1,240,500</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm">1Y</div>
                      <div className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/25">All Time</div>
                    </div>
                  </div>

                  {/* Chart Area (Clean Lines with Gradient) */}
                  <div className="h-72 w-full bg-white rounded-3xl border border-slate-100 p-8 mb-8 relative overflow-hidden shadow-sm">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between px-8 py-8 pointer-events-none opacity-30">
                      <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
                      <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
                      <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
                    </div>

                    {/* The Graph (SVG Curve) */}
                    <div className="absolute bottom-0 left-0 right-0 h-48">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 L0 80 Q 20 90 40 60 T 100 20 L 100 100 Z" fill="url(#gradient)" opacity="0.1" />
                            <path d="M0 80 Q 20 90 40 60 T 100 20" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary)" />
                                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                        
                        {/* Floating Point */}
                        <div className="absolute top-[20%] right-0 w-4 h-4 bg-white border-4 border-primary rounded-full shadow-lg transform translate-x-1/2"></div>
                         <div className="absolute top-[5%] right-0 bg-slate-900 text-white text-xs font-bold py-1 px-3 rounded-lg transform -translate-x-2 translate-y-full shadow-xl">
                          Goal Reached!
                        </div>
                    </div>
                  </div>

                  {/* Bottom Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-colors">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Home className="w-6 h-6" />
                      </div>
                      <div className="text-lg font-bold text-slate-900">Housing</div>
                      <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-blue-500 rounded-full"></div>
                          </div>
                          <div className="text-xs text-slate-400 font-medium">65%</div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:border-primary-light transition-colors">
                      <div className="w-12 h-12 bg-brand-50 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="text-lg font-bold text-slate-900">KiwiSaver</div>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">On Track</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center cursor-pointer hover:bg-white hover:border-primary/50 hover:shadow-lg transition-all group">
                      <div className="w-10 h-10 bg-white text-slate-400 rounded-full flex items-center justify-center mb-2 shadow-sm group-hover:text-primary group-hover:scale-110 transition-all">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-slate-500 group-hover:text-primary">Add Goal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
