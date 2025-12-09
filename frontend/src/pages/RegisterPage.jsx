import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { register } from '../services/authService';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setMessage('Error registering user');
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
                  F
                </div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">FinTwin</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-2">Create an account</h2>
            <p className="text-slate-500">Start your journey to financial freedom today.</p>
          </div>
          
          {message && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {message}
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={submitHandler}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="input-rounded w-full pl-10 bg-slate-50"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="input-rounded w-full pl-10 bg-slate-50"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="password"
                        required
                        className="input-rounded w-full pl-10 bg-slate-50"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="password"
                        required
                        className="input-rounded w-full pl-10 bg-slate-50"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-3 mt-2">
                <input type="checkbox" className="mt-1 rounded border-slate-300 text-primary focus:ring-primary" required />
                <p className="text-sm text-slate-500">
                    I agree to the <a href="#" className="text-primary font-medium hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-medium hover:underline">Privacy Policy</a>.
                </p>
            </div>

            <button
              type="submit"
              className="w-full btn-primary-rounded flex justify-center items-center gap-2 group mt-6"
            >
              Create Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/30 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

         <div className="relative z-10 max-w-lg">
             <div className="grid grid-cols-2 gap-4 mb-12">
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl transform translate-y-8">
                     <ShieldCheck className="w-8 h-8 text-green-300 mb-4" />
                     <h3 className="text-white font-bold text-lg mb-1">Bank-Level Security</h3>
                     <p className="text-indigo-100 text-sm">Your data is encrypted and protected.</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl transform -translate-y-4">
                     <div className="w-8 h-8 text-blue-300 mb-4 font-bold text-xl">AI</div>
                     <h3 className="text-white font-bold text-lg mb-1">Smart Insights</h3>
                     <p className="text-indigo-100 text-sm">Personalized advice for your goals.</p>
                 </div>
             </div>
             <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Join 10,000+ Savvy Investors</h2>
                <p className="text-indigo-100 text-lg">Experience the future of personal finance management.</p>
             </div>
         </div>
      </div>
    </div>
  );
};

export default RegisterPage;
