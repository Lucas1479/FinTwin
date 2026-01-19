import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Target, Briefcase, ShoppingBag, Gamepad2, HelpCircle, LogOut, ChevronLeft, ChevronRight, ChevronDown, Clock, Zap, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useSimulation } from '../../context/SimulationContext';
import { useHelp } from '../../context/HelpContext';
import { getCurrentUser, logout as logoutService } from '../../services/authService';
import HelpChatBox from './HelpChatBox';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { timeOffset, setTimeOffset, marketMode, setMarketMode } = useSimulation();
  const { isHelpOpen, openHelp, closeHelp } = useHelp();
  const [currentUser, setCurrentUser] = useState(null);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };

    loadUser();
    window.addEventListener('userInfoUpdated', loadUser);
    return () => window.removeEventListener('userInfoUpdated', loadUser);
  }, []);

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await logoutService();
    navigate('/login');
  };
  
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
    { name: 'AI Support', icon: Sparkles, onClick: () => openHelp() },
  ];

  return (
    <div 
        className={`
            ${isCollapsed ? 'w-20' : 'w-80'} 
            h-screen bg-white border-r border-slate-100 sticky top-0 
            hidden md:flex flex-col transition-all duration-300 ease-in-out
            overflow-hidden
        `}
    >
      {/* Collapse Toggle - Fixed at top */}
      <div className="flex justify-end p-4 shrink-0">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
      </div>

      {/* Scrollable Content Area - Takes remaining space */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
          {/* Main Section */}
          <div className="px-1">
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
          <div className="px-1">
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

          {/* Time Machine Section */}
          <div className="px-1">
            {!isCollapsed && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-4 transition-opacity animate-fade-in">Projections</p>}
            
            <button
              onClick={() => {
                  if (isCollapsed) toggleSidebar();
                  setIsTimeMachineOpen(!isTimeMachineOpen);
              }}
              title={isCollapsed ? "Time Machine" : ''}
              className={`
                  w-full flex items-center gap-4 py-4 rounded-[1.5rem] text-sm font-semibold transition-all duration-300 group relative
                  ${isCollapsed ? 'justify-center px-0' : 'px-6'}
                  ${isTimeMachineOpen 
                      ? 'bg-brand-50 text-primary shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <Clock size={22} className={`transition-colors shrink-0 ${isTimeMachineOpen ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2} />
              
              {!isCollapsed && (
                <>
                  <div className="whitespace-nowrap overflow-hidden transition-all duration-300 flex-1 text-left">
                      <div className="leading-none">Time Machine</div>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-300 text-slate-400 ${isTimeMachineOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Expandable Panel */}
            <div className={`
                overflow-hidden transition-all duration-500 ease-in-out
                ${isTimeMachineOpen && !isCollapsed ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'}
            `}>
                 <div className="mx-2 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner relative overflow-hidden group">
                    {/* Subtle Gradient Glow */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-700"></div>
                    
                    <div className="relative z-10 space-y-6">
                        {/* Header Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Horizon</span>
                             {timeOffset > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active</span>
                                </div>
                            )}
                        </div>

                        {/* Year Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                 <span className="text-3xl font-black text-indigo-600 tracking-tighter">+{timeOffset}<span className="text-sm text-indigo-400 ml-1">years</span></span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="20" 
                                step="1" 
                                value={timeOffset} 
                                onChange={(e) => setTimeOffset(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600 transition-all hover:accent-indigo-500"
                            />
                             <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>Now</span>
                                <span>20y</span>
                            </div>
                        </div>

                        {/* Market Mode Buttons */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Market Condition</span>
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                {[
                                    { id: 'Bear', icon: TrendingDown, color: 'text-rose-500' },
                                    { id: 'Neutral', icon: Minus, color: 'text-slate-400' },
                                    { id: 'Bull', icon: TrendingUp, color: 'text-emerald-500' }
                                ].map((m) => {
                                    const Icon = m.icon;
                                    const isActive = marketMode === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setMarketMode(m.id)}
                                            title={m.id}
                                            className={`
                                                flex-1 flex items-center justify-center py-2 rounded-lg transition-all duration-300
                                                ${isActive ? 'bg-indigo-50 shadow-inner' : 'hover:bg-slate-50'}
                                            `}
                                        >
                                            <Icon size={14} className={`transition-colors ${isActive ? m.color : 'text-slate-300'}`} strokeWidth={3} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="pt-4 border-t border-slate-200/50">
                            <p className="text-[9px] text-slate-400 leading-relaxed font-medium text-center">
                                Disclaimer: Projections are estimates based on current algorithms.
                            </p>
                        </div>
                    </div>
                 </div>
            </div>
          </div>
      </div>

      {/* Footer Area (Fixed) - Contains Support & Profile */}
      <div className="p-4 shrink-0 border-t border-slate-100 bg-white z-10">
        <div className="px-1 mb-6">
            <nav className="space-y-2">
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    
                    if (item.onClick) {
                        return (
                            <button
                                key={item.name}
                                onClick={item.onClick}
                                title={isCollapsed ? item.name : ''}
                                className={`
                                    w-full flex items-center gap-4 py-3 rounded-[1.5rem] text-sm font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300
                                    ${isCollapsed ? 'justify-center px-0' : 'px-6'}
                                    ${isHelpOpen && item.name === 'AI Support' ? 'text-indigo-600 bg-indigo-50' : ''}
                                `}
                            >
                                <Icon size={20} className={`${isHelpOpen && item.name === 'AI Support' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'} shrink-0`} strokeWidth={2} />
                                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                            </button>
                        );
                    }

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
        <Link 
            to="/settings"
            className={`
            p-2 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-3 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer group
            ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'p-3'}
            `}
        >
            <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-primary font-bold text-xs group-hover:scale-110 transition-transform shrink-0">
                {initials}
            </div>
            {!isCollapsed && (
                <>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.name || 'Loading...'}</p>
                        <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Free Account</p>
                    </div>
                    <button onClick={handleLogout} className="p-1 hover:bg-red-50 rounded-lg transition-colors group/logout">
                        <LogOut size={16} className="text-slate-300 group-hover/logout:text-red-500 transition-colors" />
                    </button>
                </>
            )}
        </Link>
      </div>

      {/* Help Chat Popup */}
      <HelpChatBox />

    </div>
  );
};

export default Sidebar;
