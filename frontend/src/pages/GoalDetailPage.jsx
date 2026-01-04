import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Target,
  Calendar,
  TrendingUp,
  Shield,
  Clock,
  PieChart as LucidePieChart,
  BarChart3,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Settings2,
  DollarSign,
  Percent,
  LineChart,
  History,
  Layers,
  Play,
  Pause,
  Edit3,
  Trash2,
  RefreshCw,
  Info,
  ExternalLink,
  Brain,
  Check,
  Lock,
  Unlock,
  Wallet,
  ArrowRightLeft
} from 'lucide-react';
import { getGoalWithPlan, getDecisionLogsForGoal, getDecisionLogsBySession, deleteGoal } from '../services/goalService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';

// ================== Helpers ==================
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimeRemaining = (dueDate) => {
  if (!dueDate) return { text: 'No date set', isOverdue: false };
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
  if (diffDays === 0) return { text: 'Due today', isOverdue: false };
  if (diffDays === 1) return { text: '1 day left', isOverdue: false };
  if (diffDays < 30) return { text: `${diffDays} days left`, isOverdue: false };
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return { text: `${months} month${months > 1 ? 's' : ''} left`, isOverdue: false };
  }
  const years = Math.floor(diffDays / 365);
  const remainingMonths = Math.floor((diffDays % 365) / 30);
  return { 
    text: `${years}y ${remainingMonths}m left`, 
    isOverdue: false 
  };
};

// ================== Sub Components ==================

// Status Badge
const StatusBadge = ({ status }) => {
  const configs = {
    'active': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    'in_progress': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    'paused': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    'not_started': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
    'completed': { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500' },
    'canceled': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
  };
  const config = configs[status] || configs['active'];
  const displayStatus = status?.replace('_', ' ') || 'Active';
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {displayStatus}
    </span>
  );
};

// Stat Card
const StatCard = ({ icon: Icon, label, value, subValue, color = 'brand' }) => {
  const colorClasses = {
    brand: 'from-brand-500 to-indigo-500 text-brand-600 bg-brand-50',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50',
    amber: 'from-amber-500 to-orange-500 text-amber-600 bg-amber-50',
    blue: 'from-blue-500 to-cyan-500 text-blue-600 bg-blue-50',
    slate: 'from-slate-500 to-gray-500 text-slate-600 bg-slate-50'
  };
  const classes = colorClasses[color] || colorClasses.brand;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${classes.split(' ').slice(2).join(' ')}`}>
          <Icon size={20} className={classes.split(' ')[2]} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-0.5">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
};

// Generic Allocation Pie Chart
const AllocationPieChart = ({ data, size = "md" }) => {
  if (!data || data.length === 0) return null;
  
  const chartSize = size === "sm" ? "w-24 h-24" : "w-32 h-32";
  const innerR = size === "sm" ? 25 : 35;
  const outerR = size === "sm" ? 40 : 55;

  return (
    <div className="flex items-center gap-6">
      <div className={chartSize}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RechartsPie>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RechartsPie>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
              <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Portfolio Allocation Chart (Legacy wrapper for compatibility)
const PortfolioAllocationChart = ({ exposure }) => {
  if (!exposure) return null;
  
  const data = [
    { name: 'Growth', value: exposure.growth || 0, color: '#6366f1' },
    { name: 'Defensive', value: exposure.defensive || 0, color: '#38bdf8' },
    { name: 'Liquidity', value: exposure.liquidity || 0, color: '#f472b6' }
  ].filter(d => d.value > 0);
  
  return <AllocationPieChart data={data} />;
};

// Product Card in Portfolio
const PortfolioProductCard = ({ item, index, onClick }) => {
  const product = item.product_id || item; // Handle populated or snapshot data
  const category = product.category || 'Fund';
  const isKiwiSaver = category === 'KiwiSaver';

  return (
    <div 
      onClick={() => onClick({ ...product, weight_pct: item.weight_pct, rationale: item.rationale })}
      className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:border-brand-200 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
    >
      {isKiwiSaver && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" title="KiwiSaver Product" />
      )}
      <div className="w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-100 shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-slate-900 text-sm md:text-base truncate group-hover:text-brand-600 transition-colors">
            {product.name || product.product_name || `Asset ${index + 1}`}
          </div>
          <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2 mt-0.5">
          <span className={`px-1.5 py-0.5 rounded ${
            isKiwiSaver ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {category.toUpperCase()}
          </span>
          <span>•</span>
          <span className="truncate">{product.provider || 'External Provider'}</span>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <div className="text-lg md:text-xl font-black text-brand-600 leading-none">
          {item.weight_pct?.toFixed(1) || '0.0'}%
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Allocation</div>
      </div>
    </div>
  );
};

// 产品详情弹窗（复用 Intake 页的排版与元素）
const ProductDetailPanel = ({ product, onClose }) => {
  const [activeTab, setActiveTab] = useState('analysis');
  if (!product) return null;

  // Simulation Logic from Marketplace
  const buildSimulatedSeries = (annualReturnPct = 0, months = 60) => {
    const r = typeof annualReturnPct === "number" ? annualReturnPct : 0;
    const monthly = Math.pow(1 + r / 100, 1 / 12) - 1;
    const points = [];
    let val = 100;
    for (let i = 0; i < months; i++) {
      val *= 1 + monthly;
      points.push(val);
    }
    return points;
  };

  const simAnnual = product.returns?.['5y'] ?? product.metrics?.returns?.annualized5yr ?? product.returns?.['1y'] ?? 5.0;
  const simSeries = buildSimulatedSeries(simAnnual);

  const renderSparkline = (series) => {
    if (!series || series.length === 0) return null;
    const w = 300;
    const h = 100;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const points = series.map((v, idx) => {
      const x = (idx / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 drop-shadow-sm">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 0 ${h} L 0 ${h - ((series[0] - min) / range) * h} ${series.map((v, idx) => {
            const x = (idx / (series.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `L ${x} ${y}`;
          }).join(" ")} L ${w} ${h} Z`}
          fill="url(#sparklineGradient)"
        />
        <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  const riskScore = product.riskScore || (product.metrics?.risk?.level ? parseInt(product.metrics.risk.level) : 4);
  const topHoldings = Array.isArray(product.topHoldings) ? product.topHoldings : [];
  const allocation = product.allocation || product.metrics?.allocation;
  const feeValue = product.fees ?? product.metrics?.fees?.total;

  const tabs = [
    { id: 'analysis', label: 'DEEP ANALYSIS', icon: TrendingUp },
    { id: 'composition', label: 'PORTFOLIO COMPOSITION', icon: Layers },
    { id: 'holdings', label: 'TOP HOLDINGS', icon: Target }
  ];

  return (
    <div className="fixed top-20 right-6 z-[110] w-full max-w-[620px] pointer-events-none">
      <div className="relative w-full bg-white rounded-[2.25rem] shadow-[-16px_16px_48px_-18px_rgba(0,0,0,0.16)] overflow-hidden flex flex-col max-h-[70vh] border border-slate-100 pointer-events-auto">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl border border-indigo-100/50 overflow-hidden">
              {product.providerLogo ? (
                <img src={product.providerLogo} alt={product.provider} className="w-full h-full object-cover" />
              ) : (
                (product.provider ?? "PF").slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-1 block">
                {product.category || 'Investment Product'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{product.name}</h2>
              <p className="text-sm text-slate-400 font-medium">{product.provider}</p>
            </div>
          </div>
          <button
            onClick={() => { setActiveTab('analysis'); onClose(); }}
            className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 py-3 bg-slate-50/30 flex gap-6 border-b border-slate-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 py-2 text-[11px] font-black tracking-[0.15em] transition-all relative ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} strokeWidth={2.5} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute -bottom-4 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'analysis' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center border border-slate-100/60">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1.5">Fees (P.A.)</span>
                  <div className="text-[26px] font-black text-slate-900 tracking-tighter">
                    {typeof feeValue === 'number' ? feeValue.toFixed(2) : (feeValue ?? '—')}<span className="text-base ml-0.5">%</span>
                  </div>
                </div>
                <div className="bg-emerald-50/60 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center border border-emerald-100/60">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600/70 mb-1.5">5Y Return</span>
                  <div className="text-[26px] font-black text-emerald-600 tracking-tighter">
                    {(typeof simAnnual === 'number' ? simAnnual.toFixed(1) : '0.0')}<span className="text-base ml-0.5">%</span>
                  </div>
                </div>
              </div>

              {/* Projection & Volatility in two columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-900">Projection Growth</span>
                    <span className="text-[9px] font-bold text-slate-400 italic tracking-wider">5-Year Simulation</span>
                  </div>
                  <div className="bg-slate-50 rounded-[1.75rem] p-5 h-[150px] flex items-center justify-center border border-slate-100/60 overflow-hidden relative">
                    <div className="absolute inset-x-4 bottom-4 top-8 bg-white rounded-2xl" />
                    <div className="relative w-full">
                      {renderSparkline(simSeries)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-900 px-1">Volatility Profile</span>
                  <div className="bg-slate-50 rounded-[1.75rem] p-5 border border-slate-100/60">
                    <div className="flex gap-1.5 mb-3">
                      {[1, 2, 3, 4, 5, 6, 7].map(level => (
                        <div 
                          key={level} 
                          className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                            level <= (riskScore || 4) 
                              ? 'bg-indigo-500' 
                              : 'bg-slate-200'
                          }`} 
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center px-0.5">
                      <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Level {riskScore || 4}/7</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Standardized Risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Logic & Strategy side by side on wide screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Brain size={13} className="text-indigo-600" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-600">AI Selection Logic</span>
                  </div>
                  <div className="bg-indigo-50/40 rounded-[1.75rem] p-5 border border-indigo-100/40 min-h-[110px] relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 opacity-5">
                      <Brain size={80} />
                    </div>
                    <p className="text-[12px] text-slate-700 leading-relaxed font-medium relative z-10">
                      {product.rationale || "Automated selection based on risk-adjusted returns and strategy alignment with your long-term goals."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-900 px-1">Strategy Overview</span>
                  <div className="bg-slate-50 rounded-[1.75rem] p-5 border border-slate-100/60">
                    <div className="text-sm font-bold text-slate-600 italic">
                      {product.strategy || product.description || 'Balanced'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Portfolio Weight Card */}
              {product.weight_pct !== undefined && (
                <div className="bg-[#101827] rounded-[1.75rem] p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-indigo-400 mb-3 block">Portfolio Weight</span>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-[32px] font-black tracking-tighter">
                      {typeof product.weight_pct === 'number' ? product.weight_pct.toFixed(1) : product.weight_pct}
                    </div>
                    <div className="text-lg font-bold text-indigo-400/60">%</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'composition' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Asset Mix Section */}
              <div className="space-y-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 px-2">Asset Mix</span>
                <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100/50">
                  {allocation ? (
                    <>
                      <div className="flex h-5 rounded-full overflow-hidden bg-slate-200 shadow-inner mb-8">
                        <div style={{ width: `${allocation.growth || 0}%` }} className="bg-indigo-500 shadow-lg shadow-indigo-500/20" />
                        <div style={{ width: `${allocation.defensive || 0}%` }} className="bg-sky-400 shadow-lg shadow-sky-400/20" />
                        <div style={{ width: `${allocation.cash || allocation.liquidity || 0}%` }} className="bg-fuchsia-400 shadow-lg shadow-fuchsia-400/20" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-500" />
                          Growth Assets: {allocation.growth || 0}%
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-sky-400" />
                          Defensive Assets: {allocation.defensive || 0}%
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-fuchsia-400" />
                          Cash & Liquidity: {allocation.cash || allocation.liquidity || 0}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-sm text-slate-500">No allocation data available.</div>
                  )}
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">Product Category</span>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <span className="font-bold text-slate-700">{product.category || 'Product'}</span>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.type || 'External'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">Risk Appetite</span>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <span className="font-bold text-slate-700">{product.strategy || product.riskLevel || `Level ${riskScore || 4}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 px-2">Top Strategic Holdings</span>
              <div className="grid gap-4">
                {topHoldings.length > 0 ? (
                  topHoldings.map((holding, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 truncate max-w-[360px]">{holding.name || holding.ticker || 'Holding'}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{holding.type || 'ASSET'} • {holding.country || 'GLOBAL'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-indigo-600 tracking-tight">{holding.percent ?? holding.weight ?? '—'}%</div>
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Weight</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                    <Target size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Detailed holdings data not disclosed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="px-10 py-8 bg-white border-t border-slate-50">
          <button 
            onClick={() => window.open(`/marketplace?search=${encodeURIComponent(product.name)}`, '_blank')}
            className="w-full h-16 bg-[#101827] text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-[0.98]"
          >
            Deep Analytics in Marketplace <ExternalLink size={14} className="opacity-50" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Decision Log Timeline Item
const DecisionLogItem = ({ log, isLast }) => {
  const stageIcons = {
    definition: Target,
    strategy: TrendingUp,
    product: Layers,
    simulation: LineChart
  };
  const StageIcon = stageIcons[log.stage] || Circle;
  
  const stageColors = {
    definition: 'bg-blue-100 text-blue-600 border-blue-200',
    strategy: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    product: 'bg-purple-100 text-purple-600 border-purple-200',
    simulation: 'bg-amber-100 text-amber-600 border-amber-200'
  };
  const stageColor = stageColors[log.stage] || 'bg-slate-100 text-slate-600';
  
  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-200"></div>
      )}
      
      {/* Icon */}
      <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center border ${stageColor}`}>
        <StageIcon size={18} />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-slate-900 capitalize">{log.stage} Stage</span>
          {log.committed_to_goal && (
            <CheckCircle2 size={14} className="text-emerald-500" />
          )}
        </div>
        <div className="text-xs text-slate-400 mb-2">
          {formatDateTime(log.created_at)}
          {log.llm_model && <span> • {log.llm_model}</span>}
        </div>
        
        {/* AI Decision Summary */}
        {log.ai_decision?.rationale && (
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-100">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
              <p className="line-clamp-3">{log.ai_decision.rationale}</p>
            </div>
          </div>
        )}
        
        {/* Goal Snapshot Key Metrics */}
        {log.goal_snapshot && (
          <div className="mt-3 flex flex-wrap gap-2">
            {log.goal_snapshot.target_amount && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                Target: {formatCurrency(log.goal_snapshot.target_amount)}
              </span>
            )}
            {log.goal_snapshot.riskTolerance && (
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg capitalize">
                {log.goal_snapshot.riskTolerance}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Contribution Strategy Display
const ContributionStrategyCard = ({ strategy, contribution }) => {
  if (!strategy && !contribution) return null;
  
  const mode = strategy?.mode || contribution?.frequency || 'recurring';
  const monthlyAmount = strategy?.monthly_amount || contribution?.amount || 0;
  const lumpSum = strategy?.lump_sum_amount || 0;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <DollarSign size={18} className="text-emerald-500" />
        Contribution Strategy
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-emerald-600" />
            <span className="text-sm text-emerald-800">Monthly Contribution</span>
          </div>
          <span className="font-bold text-emerald-700">{formatCurrency(monthlyAmount)}</span>
        </div>
        
        {lumpSum > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              <span className="text-sm text-blue-800">Initial Lump Sum</span>
            </div>
            <span className="font-bold text-blue-700">{formatCurrency(lumpSum)}</span>
          </div>
        )}
        
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${strategy?.income_linked ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <span className="text-xs text-slate-500">Income Linked</span>
          </div>
          {strategy?.escalation_rate_pct > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-brand-500" />
              <span className="text-xs text-slate-500">{strategy.escalation_rate_pct}% annual escalation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Glide Path Card
const GlidePathCard = ({ glidePath }) => {
  if (!glidePath?.enabled) return null;
  
  const endState = glidePath.end_state || { growth: 30, defensive: 50, liquidity: 20 };
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-blue-500" />
        Glide Path (De-risking)
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Starts</span>
          <span className="font-semibold text-slate-900">{glidePath.start_years_before_goal || 10} years before goal</span>
        </div>
        
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">Target allocation at goal date:</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-emerald-50 rounded-lg">
              <div className="text-lg font-bold text-emerald-600">{endState.growth}%</div>
              <div className="text-xs text-emerald-600">Growth</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{endState.defensive}%</div>
              <div className="text-xs text-blue-600">Defensive</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-600">{endState.liquidity}%</div>
              <div className="text-xs text-amber-600">Liquidity</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simulation Results Card
const SimulationResultsCard = ({ simulation }) => {
  if (!simulation) return null;
  
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <LineChart size={18} />
        Simulation Results
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-3xl font-bold">{simulation.success_probability?.toFixed(0) || 'N/A'}%</div>
          <div className="text-sm text-white/70">Success Probability</div>
        </div>
        <div>
          <div className="text-3xl font-bold">{formatCurrency(simulation.median_outcome)}</div>
          <div className="text-sm text-white/70">Median Outcome</div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-white/60">10th Percentile:</span>
          <span className="ml-2 font-semibold">{formatCurrency(simulation.percentile_10)}</span>
        </div>
        <div>
          <span className="text-white/60">90th Percentile:</span>
          <span className="ml-2 font-semibold">{formatCurrency(simulation.percentile_90)}</span>
        </div>
      </div>
      
      {simulation.run_at && (
        <div className="mt-3 text-xs text-white/50">
          Last run: {formatDateTime(simulation.run_at)}
        </div>
      )}
    </div>
  );
};

// ================== Main Component ==================
const GoalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [plan, setPlan] = useState(null);
  const [decisionLogs, setDecisionLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch goal with plan
        const goalData = await getGoalWithPlan(id);
        setGoal(goalData);
        setPlan(goalData.plan || null);
        
        // Fetch decision logs
        try {
          let logs = await getDecisionLogsForGoal(id);
          
          // If no logs found by goal_id, try by session_id if available in plan
          if ((!logs || logs.length === 0) && goalData.plan?.decision_session_id) {
            console.log('Fetching logs by session_id:', goalData.plan.decision_session_id);
            logs = await getDecisionLogsBySession(goalData.plan.decision_session_id);
          }
          
          setDecisionLogs(logs || []);
        } catch (logErr) {
          console.warn('Failed to fetch decision logs:', logErr);
          setDecisionLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch goal:', err);
        navigate('/goals');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchData();
  }, [id, navigate]);
  
  const handleDelete = async () => {
    try {
      await deleteGoal(id);
      navigate('/goals');
    } catch (err) {
      console.error('Failed to delete goal:', err);
      alert('Failed to delete goal');
    }
  };
  
  // Computed values
  const progress = useMemo(() => {
    if (!goal?.target_amount) return 0;
    return Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100));
  }, [goal]);
  
  const timeRemaining = useMemo(() => {
    return getTimeRemaining(goal?.due_date);
  }, [goal?.due_date]);
  
  const selectedPortfolio = plan?.selected_portfolio;
  const targetExposure = plan?.target_exposure || selectedPortfolio?.calculated_exposure;
  
  const categoryAllocation = useMemo(() => {
    if (!selectedPortfolio?.products) return [];
    const totals = selectedPortfolio.products.reduce((acc, item) => {
      const product = item.product_id || item;
      let cat = product.category || 'Fund';
      if (cat === 'Fund') cat = 'Managed Fund';
      if (cat === 'TermDeposit') cat = 'Cash & Fixed Term';
      
      acc[cat] = (acc[cat] || 0) + (item.weight_pct || 0);
      return acc;
    }, {});

    return [
      { name: 'KiwiSaver', value: totals['KiwiSaver'] || 0, color: '#6366f1' },
      { name: 'Managed Fund', value: totals['Managed Fund'] || 0, color: '#10b981' },
      { name: 'Cash/Term', value: totals['Cash & Fixed Term'] || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [selectedPortfolio]);

  const groupedProducts = useMemo(() => {
    if (!selectedPortfolio?.products) return {};
    return selectedPortfolio.products.reduce((acc, item) => {
      const product = item.product_id || item;
      
      // Use actual database categories as seen in Marketplace
      // Mapping categories to user-friendly labels if needed
      let groupKey = product.category || 'Fund';
      
      // Standardize grouping keys for the UI
      if (groupKey === 'KiwiSaver') groupKey = 'KiwiSaver';
      else if (groupKey === 'TermDeposit') groupKey = 'Cash & Fixed Term';
      else groupKey = 'Managed Fund';
      
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {});
  }, [selectedPortfolio]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
            <div className="h-48 bg-slate-200 rounded-3xl"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!goal) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6 text-center py-20">
          <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Goal not found</h2>
          <Link to="/goals" className="text-brand-600 hover:underline">Return to Goals</Link>
        </div>
      </MainLayout>
    );
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LucidePieChart },
    { id: 'portfolio', label: 'Plan Holdings', icon: Layers },
    { id: 'strategy', label: 'Strategy', icon: Settings2 },
    { id: 'decisions', label: 'Decision History', icon: History }
  ];
  
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
        
        {/* Back Button & Header */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/goals')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Goals</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                <Target size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{goal.goal_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500 capitalize">{goal.category}</span>
                  <StatusBadge status={goal.status} />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/goals/${id}/edit`)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Edit3 size={16} />
                Edit
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-slate-900">{formatCurrency(goal.current_amount)}</span>
                <span className="text-lg text-slate-400">/ {formatCurrency(goal.target_amount)}</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {formatCurrency(goal.target_amount - goal.current_amount)} remaining to goal
              </p>
              
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-brand-600">{progress.toFixed(1)}% complete</span>
                <span className={`text-sm font-medium ${timeRemaining.isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                  <Clock size={14} className="inline mr-1" />
                  {timeRemaining.text}
                </span>
              </div>
            </div>
            
            <div className="lg:w-64 lg:border-l lg:border-slate-100 lg:pl-6">
              <div className="text-sm text-slate-500 mb-1">Target Date</div>
              <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={20} className="text-brand-500" />
                {formatDate(goal.due_date)}
              </div>
              
              {plan?.contribution && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl">
                  <div className="text-xs text-emerald-600 font-medium">Monthly Contribution</div>
                  <div className="text-lg font-bold text-emerald-700">
                    {formatCurrency(plan.contribution.amount || plan.contribution_strategy?.monthly_amount)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  icon={Target}
                  label="Target Amount"
                  value={formatCurrency(goal.target_amount)}
                  color="brand"
                />
                <StatCard 
                  icon={TrendingUp}
                  label="Current Amount"
                  value={formatCurrency(goal.current_amount)}
                  subValue={`${progress.toFixed(0)}% achieved`}
                  color="emerald"
                />
                <StatCard 
                  icon={Shield}
                  label="Risk Profile"
                  value={goal.riskTolerance?.replace('-', ' ') || 'Balanced'}
                  color="blue"
                />
                <StatCard 
                  icon={AlertCircle}
                  label="Priority"
                  value={goal.priority || 'Want'}
                  color="amber"
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Insights & Actions */}
                <div className="lg:col-span-8 space-y-8">
                  {/* AI Strategy Insight */}
                  <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-100 shadow-sm relative overflow-hidden group">
                    {/* Subtle AI Gradient Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Brain size={20} />
                          </div>
                          <div>
                            <h3 className="text-slate-900 font-bold text-sm uppercase tracking-[0.15em]">
                              AI Strategy Insight
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Automated Plan Analysis</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100/50 shadow-inner">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Analysis</span>
                        </div>
                      </div>

                      <div className="prose prose-slate prose-sm max-w-none mb-10 text-slate-600 leading-relaxed font-medium">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {plan?.ai_rationale || goal.notes || "This goal is currently following a standard growth path. Our AI recommends periodic reviews to ensure alignment with market volatility."}
                        </ReactMarkdown>
                      </div>
                      
                      {plan?.strategy_profile && (
                        <div className="flex flex-wrap items-center gap-4 pt-8 border-t border-slate-50">
                          <div className="flex flex-col gap-1.5 px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all group-hover:bg-white group-hover:shadow-md">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">Active Strategy</span>
                            <span className="font-bold text-slate-900 capitalize text-sm">{plan.strategy_profile}</span>
                          </div>
                          
                          {plan?.settings?.inflation_adjusted && (
                            <div className="flex items-center gap-2.5 px-5 py-3 bg-emerald-50 rounded-2xl border border-emerald-100/50 text-xs font-bold text-emerald-700 transition-all group-hover:bg-white group-hover:shadow-md">
                              <CheckCircle2 size={16} className="text-emerald-500" /> 
                              Inflation Protected
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2.5 px-5 py-3 bg-brand-50 rounded-2xl border border-brand-100/50 text-xs font-bold text-brand-700 transition-all group-hover:bg-white group-hover:shadow-md">
                            <Sparkles size={16} className="text-brand-500" /> 
                            AI Optimized
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Steps / Actions (New Section) */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-brand-500" /> Next Actions
                    </h3>
                    <div className="space-y-4">
                      {goal.actions?.length > 0 ? (
                        goal.actions.map((action, idx) => (
                          <div key={action._id || idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-brand-200 transition-all">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${action.is_completed ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300'}`}>
                              {action.is_completed && <Check size={12} strokeWidth={4} />}
                            </div>
                            <span className={`flex-1 text-sm font-medium ${action.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {action.action_text}
                            </span>
                            {action.reminder_date && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Due {formatDate(action.reminder_date)}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center justify-center italic text-slate-400 text-sm">
                          AI is analyzing your path... No immediate actions required.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Allocation & Progress */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Simulation or Exposure */}
                  {plan?.simulation_result ? (
                    <SimulationResultsCard simulation={plan.simulation_result} />
                  ) : targetExposure ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <LucidePieChart size={16} className="text-slate-400" /> Asset Allocation
                      </h3>
                      <PortfolioAllocationChart exposure={targetExposure} />
                    </div>
                  ) : null}

                  {/* Goal Attributes (Detailed) */}
                  {goal.goal_details && Object.keys(goal.goal_details).length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Info size={16} className="text-slate-400" /> Context Details
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(goal.goal_details).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                            <span className="text-xs text-slate-500 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-slate-900">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                               typeof value === 'number' && key.includes('price') ? formatCurrency(value) :
                               typeof value === 'number' && key.includes('rate') ? `${value}%` :
                               String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Tracker / Timeline Summary */}
                  <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                    <h3 className="text-emerald-900 font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Clock size={14} /> Time Horizon
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 font-medium">Started</span>
                        <span className="text-emerald-900 font-bold">{formatDate(goal.created_at)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 font-medium">Target</span>
                        <span className="text-emerald-900 font-bold">{formatDate(goal.due_date)}</span>
                      </div>
                      <div className="pt-3 border-t border-emerald-200">
                        <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Status</div>
                        <div className={`text-lg font-black ${timeRemaining.isOverdue ? 'text-red-600' : 'text-emerald-700'}`}>
                          {timeRemaining.text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Portfolio Tab (Renamed to Plan Holdings) */}
          {activeTab === 'portfolio' && (
            <>
              {selectedPortfolio ? (
                <div className="space-y-8">
                  {/* Portfolio Header */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm group relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-30" />
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPortfolio.option_name || 'Selected Plan Holdings'}</h3>
                          <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">{selectedPortfolio.description}</p>
                        </div>
                        {selectedPortfolio.total_fees_estimate !== undefined && (
                          <div className="bg-brand-50 px-6 py-4 rounded-2xl border border-brand-100/50 text-right shrink-0">
                            <div className="text-2xl font-black text-brand-600 leading-none mb-1">{selectedPortfolio.total_fees_estimate.toFixed(2)}%</div>
                            <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Est. Annual Fees</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-8 border-t border-slate-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          {/* Asset Mix Chart */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <LucidePieChart size={18} className="text-slate-400" />
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Target Asset Mix</h4>
                            </div>
                            {selectedPortfolio.calculated_exposure && (
                              <PortfolioAllocationChart exposure={selectedPortfolio.calculated_exposure} />
                            )}
                          </div>

                          {/* Category Mix Chart */}
                          <div className="space-y-6 lg:border-l lg:border-slate-50 lg:pl-12">
                            <div className="flex items-center gap-3">
                              <Layers size={18} className="text-slate-400" />
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Product Categories</h4>
                            </div>
                            <AllocationPieChart data={categoryAllocation} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Grouped Products List */}
                  <div className="space-y-6">
                    {Object.entries(groupedProducts).map(([category, items], gIdx) => (
                      <div key={category} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
                        <div className="flex items-center justify-between mb-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              category === 'KiwiSaver' ? 'bg-indigo-100 text-indigo-600' :
                              category === 'Managed Fund' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {category === 'KiwiSaver' ? <Lock size={16} /> : 
                               category === 'Managed Fund' ? <Layers size={16} /> : 
                               <Wallet size={16} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{category}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {category === 'KiwiSaver' ? 'Restricted Liquidity (Locked until 65)' : 
                                 category === 'Managed Fund' ? 'Flexible Liquidity (T+3 Days)' : 
                                 'High Liquidity (Immediate/Maturity)'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                            {items.length} Asset{items.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map((item, idx) => (
                            <PortfolioProductCard 
                              key={item._id || item.product_id || idx} 
                              item={item} 
                              index={idx} 
                              onClick={setSelectedProduct}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <Layers size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">No Plan Holdings Configured</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto mb-10">This goal doesn't have an active investment plan. Run the AI Engine to generate a portfolio.</p>
                  <button className="btn-primary-rounded px-8 py-3 text-sm">Initialize Plan</button>
                </div>
              )}
            </>
          )}
          
          {/* Strategy Tab */}
          {activeTab === 'strategy' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContributionStrategyCard 
                strategy={plan?.contribution_strategy} 
                contribution={plan?.contribution}
              />
              <GlidePathCard glidePath={plan?.glide_path} />
              
              {/* Plan Settings */}
              {plan?.settings && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings2 size={18} className="text-slate-400" />
                    Plan Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Inflation Adjusted</span>
                      <span className={`text-sm font-bold ${plan.settings.inflation_adjusted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {plan.settings.inflation_adjusted ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Tax Optimized</span>
                      <span className={`text-sm font-bold ${plan.settings.tax_optimized ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {plan.settings.tax_optimized ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Reinvest Dividends</span>
                      <span className={`text-sm font-bold ${plan.settings.reinvest_dividends ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {plan.settings.reinvest_dividends ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Liquidity</span>
                      <span className="text-sm font-bold text-slate-700 capitalize">{plan.settings.liquidity_preference || 'Flexible'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Strategy Profile */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-blue-500" />
                  Strategy Profile
                </h3>
                <div className="text-3xl font-bold text-blue-600 capitalize mb-2">
                  {plan?.strategy_profile || 'Balanced'}
                </div>
                <p className="text-sm text-slate-500">
                  This profile determines the overall risk and return balance for your investment strategy.
                </p>
              </div>
            </div>
          )}
          
          {/* Decisions Tab */}
          {activeTab === 'decisions' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <History size={18} className="text-slate-400" />
                AI Decision Timeline
              </h3>
              
              {decisionLogs.length > 0 ? (
                <div className="space-y-0">
                  {decisionLogs.map((log, idx) => (
                    <DecisionLogItem 
                      key={log._id || idx} 
                      log={log} 
                      isLast={idx === decisionLogs.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History size={48} className="text-slate-200 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-700 mb-2">No Decision History</h4>
                  <p className="text-sm text-slate-500">
                    Decision logs will appear here when this goal is created through the AI Goal Engine.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
            <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Goal?</h3>
              <p className="text-slate-500 mb-6">
                This will permanently delete "{goal.goal_name}" and its associated plan. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Detail Side Panel */}
        {selectedProduct && (
          <ProductDetailPanel 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}
        
      </div>
    </MainLayout>
  );
};

export default GoalDetailPage;


