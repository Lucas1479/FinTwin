import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, User, Settings, LogOut, Search, Bell } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo - Aligned with Sidebar width mostly, but kept simple */}
        <Link to="/dashboard" className="flex items-center gap-2 md:w-64">
          <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">F</div>
          <span className="font-bold text-2xl tracking-tight text-slate-900">FinTwin</span>
        </Link>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-2 border-none rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                    placeholder="Search for transactions, goals..." 
                />
            </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
           {/* Notifications */}
           <button className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-primary transition-colors">
             <Bell size={22} />
             <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
           </button>

           {/* Profile Dropdown */}
           <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="w-9 h-9 rounded-full bg-brand-100 border-2 border-white shadow-sm flex items-center justify-center text-primary font-bold text-sm">
                  LS
                </div>
                <span className="hidden md:block text-sm font-bold text-slate-700">Lucas</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 truncate">lucas@example.com</p>
                  </div>
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <User size={18} /> Your Profile
                  </a>
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <Settings size={18} /> Settings
                  </a>
                  <div className="border-t border-slate-50 my-1"></div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 text-left transition-colors">
                    <LogOut size={18} /> Sign out
                  </button>
                </div>
              )}
           </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
