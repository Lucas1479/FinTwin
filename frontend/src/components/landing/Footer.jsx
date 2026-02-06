import { Github, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-12 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <Link to="/" className="text-slate-900 font-bold text-lg hover:text-primary transition-colors">FinTwin</Link>
        <div className="text-slate-400 text-sm">&copy; 2025 FinTwin Project. Built for Independent Advice.</div>
        <div className="flex gap-6">
          <Link to="/login" className="text-slate-400 hover:text-slate-900 transition"><Github className="w-5 h-5" /></Link>
          <Link to="/login" className="text-slate-400 hover:text-slate-900 transition"><Twitter className="w-5 h-5" /></Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
