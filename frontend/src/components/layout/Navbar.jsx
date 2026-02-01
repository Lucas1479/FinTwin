import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, User, Settings, LogOut, Search, Bell, RefreshCw, Database } from 'lucide-react';
import { getCurrentUser, logout as logoutService } from '../../services/authService';
import { resetDemoData } from '../../services/userService';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load current user information from auth service (internally handles localStorage + /users/me)
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };

    loadUser();
    window.addEventListener('userInfoUpdated', loadUser);
    return () => window.removeEventListener('userInfoUpdated', loadUser);
  }, []);

  const displayName = currentUser?.name || 'User';
  const displayEmail = currentUser?.email || '';
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleLogout = async () => {
    await logoutService();
    setCurrentUser(null);

    // Close profile menu and redirect to login page
    setIsProfileOpen(false);
    navigate('/login');
  };

  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      setShowResetConfirm(false);
      setIsProfileOpen(false);
      
      // Show success message and reload the page to reflect new data
      alert('✅ Demo data loaded successfully! Page will refresh...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to reset demo data:', error);
      alert('❌ Failed to load demo data. Please try again later.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Database className="text-amber-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Load Demo Data
                </h3>
                <p className="text-sm text-slate-600">
                  This will clear all your current assets and cash flow data, replacing them with preset demo data. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Will Include:
              </p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• 8 financial assets (bank, property, investments, etc.)</li>
                <li>• 14 cash flow items (income, expenses, subscriptions)</li>
                <li>• Complete financial data sample</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemoData}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Confirm Load'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {initials}
                </div>
                <span className="hidden md:block text-sm font-bold text-slate-700">
                  {displayName}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Signed in as
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {displayEmail || 'Unknown user'}
                    </p>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <User size={18} /> Your Profile
                  </Link>
                  <Link 
                    to="/settings" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Settings size={18} /> Settings
                  </Link>
                  <div className="border-t border-slate-50 my-1"></div>
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 text-left transition-colors"
                  >
                    <Database size={18} /> Load Demo Data
                  </button>
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
    </>
  );
};

export default Navbar;
