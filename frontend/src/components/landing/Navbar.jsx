import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="relative z-50 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
      <Link to="/" className="flex items-center gap-2 cursor-pointer">
        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">F</div>
        <span className="font-bold text-2xl tracking-tight text-slate-900">FinTwin</span>
      </Link>

      <div className="hidden md:flex gap-8 text-slate-500 text-sm font-bold">
        <a href="#" className="hover:text-primary transition-colors">Simulators</a>
        <a href="#" className="hover:text-primary transition-colors">Methodology</a>
        <a href="#" className="hover:text-primary transition-colors">Pricing</a>
      </div>

      <div className="hidden md:flex gap-4 items-center">
        <Link to="/login" className="text-slate-600 hover:text-primary px-4 py-2 text-sm font-bold transition">Log in</Link>
        <Link to="/register" className="btn-primary-rounded text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40">Get Started</Link>
      </div>

      <div className="md:hidden">
         <button onClick={() => setIsOpen(!isOpen)} className="text-slate-900">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-b-2xl p-6 flex flex-col gap-4 md:hidden border-t border-slate-100 animate-fade-in">
            <a href="#" className="text-slate-600 font-bold text-lg">Simulators</a>
            <a href="#" className="text-slate-600 font-bold text-lg">Methodology</a>
            <a href="#" className="text-slate-600 font-bold text-lg">Pricing</a>
            <div className="h-px bg-slate-100 my-2"></div>
            <Link to="/login" className="text-slate-600 font-bold text-lg">Log in</Link>
            <Link to="/register" className="btn-primary-rounded text-center justify-center">Get Started</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
