import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Briefcase, 
  ShoppingBag, 
  Gamepad2, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setCollapsed(true);
      }
    };

    // Check on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  const NavItem = ({ item, isActive, showLabel = true }) => {
    const Icon = item.icon;
    
    return (
      <Link 
        to={item.path} 
        title={collapsed ? item.name : undefined}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group relative ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive 
            ? 'bg-orange-50 text-orange-600 shadow-sm' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon 
          size={20} 
          className={`flex-shrink-0 transition-colors ${
            isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600'
          }`} 
          strokeWidth={2} 
        />
        {showLabel && !collapsed && (
          <span className="truncate">{item.name}</span>
        )}
        {isActive && !collapsed && (
          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-orange-500"></div>
        )}
      </Link>
    );
  };

  return (
    <div 
      className={`h-[calc(100vh-65px)] bg-white border-r border-slate-100 sticky top-[65px] hidden md:flex flex-col overflow-y-auto transition-all duration-300 ${
        collapsed ? 'w-20 p-4' : 'w-72 p-6'
      }`}
    >
      {/* Collapse Toggle Button */}
      <div className={`mb-6 ${collapsed ? 'flex justify-center' : 'flex justify-between items-center px-2'}`}>
        {!collapsed && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Core</p>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Main Section */}
      <div className={`mb-6 ${collapsed ? '' : 'px-2'}`}>
        {collapsed && (
          <div className="w-8 h-px bg-slate-200 mx-auto mb-4"></div>
        )}
        <nav className="space-y-1.5">
          {mainItems.map((item) => (
            <NavItem 
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}
        </nav>
      </div>

      {/* Tools Section */}
      <div className={`mb-6 ${collapsed ? '' : 'px-2'}`}>
        {!collapsed && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Tools</p>
        )}
        {collapsed && (
          <div className="w-8 h-px bg-slate-200 mx-auto mb-4"></div>
        )}
        <nav className="space-y-1.5">
          {toolItems.map((item) => (
            <NavItem 
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Bottom Section */}
      <div className={`${collapsed ? '' : 'px-2'}`}>
        {collapsed && (
          <div className="w-8 h-px bg-slate-200 mx-auto mb-4"></div>
        )}
        <nav className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all duration-300 ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* User Profile Card */}
      <div 
        className={`mt-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer group ${
          collapsed ? 'p-2 justify-center' : 'p-3 gap-3'
        }`}
        title={collapsed ? 'Lucas Smith' : undefined}
      >
        <div className={`rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm group-hover:scale-105 transition-transform ${
          collapsed ? 'w-9 h-9' : 'w-10 h-10'
        }`}>
          LS
        </div>
        {!collapsed && (
          <>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">Lucas Smith</p>
              <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Free Account</p>
            </div>
            <LogOut size={16} className="text-slate-300 mr-1 hover:text-red-500 transition-colors" />
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
