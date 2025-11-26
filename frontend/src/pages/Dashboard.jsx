import MainLayout from '../components/layout/MainLayout';
import { Plus, TrendingUp, Target, AlertCircle, ArrowUpRight, MoreHorizontal, Wallet, CreditCard, DollarSign } from 'lucide-react';

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-slate-500 mt-1">Track your wealth and goals in real-time.</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-50 transition">
                Download Report
            </button>
            <button className="bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition shadow-lg shadow-primary/25 flex items-center gap-2">
                <Plus size={18} />
                Add Widget
            </button>
          </div>
        </div>

        {/* Top Stats Cards - Rounded Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Balance Card */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={64} className="text-primary" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-brand-50 rounded-2xl text-primary">
                <DollarSign size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">Total Balance</div>
            <div className="text-4xl font-bold text-slate-900 mb-4">$15,700.00</div>
            <div className="flex items-center gap-2">
                <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ArrowUpRight size={12} /> 12.1%
                </span>
                <span className="text-slate-400 text-xs font-medium">vs last month</span>
            </div>
          </div>
          
            {/* Expenses Card */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard size={64} className="text-orange-500" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                <CreditCard size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">Total Expense</div>
            <div className="text-4xl font-bold text-slate-900 mb-4">$6,222.00</div>
            <div className="flex items-center gap-2">
                <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ArrowUpRight size={12} /> 2.4%
                </span>
                <span className="text-slate-400 text-xs font-medium">vs last month</span>
            </div>
          </div>

            {/* Goals Card */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target size={64} className="text-purple-500" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-500">
                <Target size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">Active Goals</div>
            <div className="text-4xl font-bold text-slate-900 mb-4">4 <span className="text-xl text-slate-400 font-medium">/ 6</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-purple-500 h-2 rounded-full w-2/3"></div>
            </div>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Chart */}
          <div className="card-base p-8 lg:col-span-2 min-h-[400px]">
             <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-bold text-slate-900">Total Balance Overview</h2>
                 <div className="flex gap-2">
                     <select className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-primary">
                         <option>This Year</option>
                         <option>Last Year</option>
                     </select>
                 </div>
             </div>
             {/* Placeholder for Chart - simulating the wavy look from the image */}
             <div className="relative h-64 w-full bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                 <svg className="absolute bottom-0 left-0 right-0 w-full h-48 text-primary/20" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <path fill="currentColor" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                 </svg>
                 <svg className="absolute bottom-0 left-0 right-0 w-full h-48 text-primary/40" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{transform: 'scaleY(0.8)'}}>
                    <path fill="currentColor" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                 </svg>
                 <div className="relative z-10 text-center">
                     <p className="text-slate-400 text-sm font-medium">Interactive Chart Visualization</p>
                     <p className="text-slate-300 text-xs mt-1">(Recharts or Chart.js integration)</p>
                 </div>
             </div>
          </div>

          {/* Right Column - Recent Activity / List */}
          <div className="card-base p-6">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
                 <button className="text-primary text-sm font-bold hover:underline">See All</button>
             </div>
             
             <div className="space-y-6">
                {[1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                {['🏠', '🛒', '🎬', '🍔'][i]}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{['Housing Savings', 'Grocery Run', 'Netflix Sub', 'Uber Eats'][i]}</h4>
                                <p className="text-xs text-slate-500">Today, 12:4{i} PM</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${i === 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                {i === 0 ? '+ $2,400' : '- $14.99'}
                            </p>
                        </div>
                    </div>
                ))}
             </div>
             
             <div className="mt-8 pt-6 border-t border-slate-100">
                 <button className="w-full btn-primary-rounded py-3 text-sm shadow-none bg-slate-900 hover:bg-slate-800">
                     View All Transactions
                 </button>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
