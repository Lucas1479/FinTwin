import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Briefcase, ShoppingBag, Gamepad2, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';

const Sidebar = () => {
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  
  // Core Modules (High Frequency)
  const mainItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Wealth', path: '/wealth', icon: Briefcase },
    { name: 'My Goals', path: '/goals', icon: Target },
  ];

  // Tools (Low Frequency)
  const toolItems = [
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Playground', path: '/playground', icon: Gamepad2 },
  ];

  const bottomItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <div 
        className={`
            ${isCollapsed ? 'w-20' : 'w-80'} 
            h-[calc(100vh-65px)] bg-white border-r border-slate-100 sticky top-[65px] 
            hidden md:flex flex-col p-4 overflow-y-auto transition-all duration-300 ease-in-out
        `}
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end mb-6">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
      </div>

      {/* Main Section */}
      <div className="mb-8 px-1">
        {!isCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-4 transition-opacity animate-fade-in">Core</p>}
        {isCollapsed && <div className="h-4 mb-4"></div>} {/* Spacer for collapsed mode */}
        
        <nav className="space-y-2">
            {mainItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
                <Link 
                key={item.path}
                to={item.path} 
                title={isCollapsed ? item.name : ''}
                className={`
                    flex items-center gap-4 py-4 rounded-[1.5rem] text-sm font-semibold transition-all duration-300 group relative
                    ${isCollapsed ? 'justify-center px-0' : 'px-6'}
                    ${isActive 
                    ? 'bg-brand-50 text-primary shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                >
                <Icon size={22} className={`transition-colors shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2} />
                
                {!isCollapsed && (
                    <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
                        <div className="leading-none">{item.name}</div>
                    </div>
                )}
                
                {isActive && !isCollapsed && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary"></div>}
                </Link>
            );
            })}
        </nav>
      </div>

      {/* Tools Section */}
      <div className="mb-8 px-1">
        {!isCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-4 transition-opacity animate-fade-in">Tools</p>}
        <nav className="space-y-2">
            {toolItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path} 
                title={isCollapsed ? item.name : ''}
                className={`
                    flex items-center gap-4 py-4 rounded-[1.5rem] text-sm font-semibold transition-all duration-300 group
                    ${isCollapsed ? 'justify-center px-0' : 'px-6'}
                    ${isActive 
                    ? 'bg-brand-50 text-primary shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                >
                <Icon size={22} className={`transition-colors shrink-0 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-1 mt-auto">
        <nav className="space-y-2">
            {bottomItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link 
                        key={item.path}
                        to={item.path} 
                        title={isCollapsed ? item.name : ''}
                        className={`
                            flex items-center gap-4 py-3 rounded-[1.5rem] text-sm font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300
                            ${isCollapsed ? 'justify-center px-0' : 'px-6'}
                        `}
                    >
                        <Icon size={20} className="text-slate-300 group-hover:text-slate-500 shrink-0" strokeWidth={2} />
                        {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                    </Link>
                )
            })}
        </nav>
      </div>
      
      {/* User Profile Card Mini */}
      <div className={`
        mt-6 p-2 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-3 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer group
        ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'p-3'}
      `}>
        <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-primary font-bold text-xs group-hover:scale-110 transition-transform shrink-0">
            LS
        </div>
        {!isCollapsed && (
            <>
                <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">Lucas Smith</p>
                    <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Free Account</p>
                </div>
                <LogOut size={16} className="text-slate-300 mr-2 hover:text-red-500 transition-colors" />
            </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
