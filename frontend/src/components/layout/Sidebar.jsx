import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Briefcase, ShoppingBag, Gamepad2, Settings, HelpCircle, LogOut } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  // Core Modules (High Frequency)
  const mainItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { name: 'My Wealth', path: '/wealth', icon: Briefcase, label: 'Wealth Center' },
    { name: 'My Goals', path: '/goals', icon: Target, label: 'Goal Management' },
  ];

  // Tools (Low Frequency)
  const toolItems = [
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { name: 'Playground', path: '/playground', icon: Gamepad2, label: 'Sandbox' },
  ];

  const bottomItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Help & Support', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="w-80 h-[calc(100vh-65px)] bg-white border-r border-slate-100 sticky top-[65px] hidden md:flex flex-col p-8 overflow-y-auto">
      {/* Main Section */}
      <div className="mb-8 px-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Core</p>
        <nav className="space-y-2">
            {mainItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
                <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-semibold transition-all duration-300 group relative ${
                    isActive 
                    ? 'bg-brand-50 text-primary shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                >
                <Icon size={22} className={`transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2} />
                <div>
                    <div className="leading-none">{item.name}</div>
                </div>
                {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary"></div>}
                </Link>
            );
            })}
        </nav>
      </div>

      {/* Tools Section */}
      <div className="mb-8 px-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Tools</p>
        <nav className="space-y-2">
            {toolItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
                <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-semibold transition-all duration-300 group ${
                    isActive 
                    ? 'bg-brand-50 text-primary shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                >
                <Icon size={22} className={`transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2} />
                {item.name}
                </Link>
            );
            })}
        </nav>
      </div>

      <div className="px-2 mt-auto">
        <nav className="space-y-2">
            {bottomItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link 
                        key={item.path}
                        to={item.path} 
                        className="flex items-center gap-4 px-6 py-3 rounded-[1.5rem] text-sm font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300"
                    >
                        <Icon size={20} className="text-slate-300 group-hover:text-slate-500" strokeWidth={2} />
                        {item.name}
                    </Link>
                )
            })}
        </nav>
      </div>
      
      {/* User Profile Card Mini */}
      <div className="mt-6 p-3 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-3 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer group">
        <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center text-primary font-bold text-sm group-hover:scale-110 transition-transform">
            LS
        </div>
        <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">Lucas Smith</p>
            <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Free Account</p>
        </div>
        <LogOut size={16} className="text-slate-300 mr-2 hover:text-red-500 transition-colors" />
      </div>
    </div>
  );
};

export default Sidebar;
