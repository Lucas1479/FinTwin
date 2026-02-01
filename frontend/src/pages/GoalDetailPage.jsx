import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
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
  ArrowRightLeft,
  Coins,
  Zap,
  Download,
  FileText,
  X
} from 'lucide-react';
import { getGoalWithPlan, getDecisionLogsForGoal, getDecisionLogsBySession, deleteGoal } from '../services/goalService';
import { getAssets } from '../services/wealthService';
import { getCashFlows } from '../services/cashFlowService';
import { useSimulatedData, useSimulation } from '../context/SimulationContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import DigitalTwinHouse from '../components/goals/DigitalTwinHouse';

// --- Internal Component: GoalProductDetailModal (Mirrors StageProduct.jsx style) ---
const GoalProductDetailModal = ({ product, open, onClose }) => {
  const [detailTab, setDetailTab] = useState('overview');
  const navigate = useNavigate();
  
  if (!open || !product) return null;

  const allocation = normalizeAllocation(product.allocation || product.metrics?.allocation);
  const holdings = Array.isArray(product.topHoldings) ? product.topHoldings : [];
  const riskScore = typeof product.riskScore === 'number' ? product.riskScore : null;

  const formatPct = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
        {/* Header - More compact */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-200 shrink-0 overflow-hidden">
              {product.providerLogo ? (
                <img src={product.providerLogo} alt={product.provider} className="w-full h-full object-cover" />
              ) : (
                (product.provider ?? 'PF').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate leading-tight">
                {product.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-tight">{product.provider}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{product.category || 'Fund'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setDetailTab('overview');
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Tabs - Compressed height */}
        <div className="px-5 border-b border-slate-100 bg-white">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'OVERVIEW', icon: FileText },
              { id: 'performance', label: 'METRICS', icon: TrendingUp },
              { id: 'composition', label: 'ALLOCATION', icon: LucidePieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 text-[10px] font-bold tracking-wider transition-all relative ${
                  detailTab === tab.id ? 'text-brand-600' : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
                {detailTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area - Higher Density */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-soft bg-slate-50/20 min-h-[320px]">
          {detailTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
              {/* Key Indicators Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Annual Fee</div>
                  <div className="text-sm font-bold text-slate-900">{product.fees ?? '0.00'}%</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">5Y Return</div>
                  <div className="text-sm font-bold text-emerald-600">
                    {product.returns?.['5y'] !== null && product.returns?.['5y'] !== undefined
                      ? `${product.returns['5y'].toFixed(1)}%` 
                      : product.returns?.['1y'] !== null && product.returns?.['1y'] !== undefined
                        ? `${product.returns['1y'].toFixed(1)}%` 
                        : '—'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Risk RI</div>
                  <div className="text-sm font-bold text-slate-900">{riskScore || 'N/A'}</div>
                </div>
              </div>

              {/* Rationale - Professional Box */}
              <div className="bg-brand-50/40 rounded-xl p-4 border border-brand-100/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={12} className="text-brand-600" />
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">AI Recommendation</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {product.rationale || 'Selected for its optimized fee-to-performance ratio and alignment with your target risk profile.'}
                </p>
              </div>

              {/* Strategy */}
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={12} className="text-brand-500" />
                  Objective & Strategy
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {product.strategy || product.description || 'Data unavailable.'}
                </p>
              </div>
            </div>
          )}

          {detailTab === 'performance' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Risk Assessment</h3>
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                        <div key={val} className={`flex-1 h-1.5 rounded-full ${riskScore && riskScore >= val ? 'bg-brand-500' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span>CONSERVATIVE</span>
                      <span className="text-brand-600">{riskScore || 'N/A'}</span>
                      <span>AGGRESSIVE</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Historical Return</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-emerald-600">
                      {product.returns?.['5y'] !== null && product.returns?.['5y'] !== undefined
                        ? `+${product.returns['5y'].toFixed(1)}%` 
                        : product.returns?.['1y'] !== null && product.returns?.['1y'] !== undefined
                          ? `+${product.returns['1y'].toFixed(1)}%` 
                          : '—'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      {product.returns?.['5y'] !== null && product.returns?.['5y'] !== undefined ? '5Y AVG' : '1Y AVG'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Projection Chart - Compact */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Growth Projection</h3>
                  <span className="text-[9px] font-medium text-slate-400">Compounded 5Y Rate</span>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { m: 0, v: 100 },
                      { m: 12, v: 100 * Math.pow(1 + ((product.returns?.['5y'] ?? product.returns?.['1y'] ?? 6) / 100), 1) },
                      { m: 36, v: 100 * Math.pow(1 + ((product.returns?.['5y'] ?? product.returns?.['1y'] ?? 6) / 100), 3) },
                      { m: 60, v: 100 * Math.pow(1 + ((product.returns?.['5y'] ?? product.returns?.['1y'] ?? 6) / 100), 5) },
                    ]}>
                      <defs>
                        <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} fill="url(#brandGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'composition' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-900 mb-4 uppercase tracking-wider">Asset Allocation</h3>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
                  <div style={{ width: `${allocation.growth}%` }} className="h-full bg-brand-500" />
                  <div style={{ width: `${allocation.defensive}%` }} className="h-full bg-sky-400" />
                  <div style={{ width: `${allocation.cash}%` }} className="h-full bg-slate-300" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Growth', 'Defensive', 'Cash'].map((label, i) => (
                    <div key={label} className="text-center">
                      <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">{label}</div>
                      <div className="text-[11px] font-bold text-slate-700">
                        {i === 0 ? formatPct(allocation.growth) : i === 1 ? formatPct(allocation.defensive) : formatPct(allocation.cash)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-900 mb-3 uppercase tracking-wider">Key Holdings</h3>
                <div className="space-y-3">
                  {holdings.length > 0 ? (
                    holdings.slice(0, 5).map((h, i) => {
                      const name = h?.name || h || "Unknown";
                      const pct = typeof h?.percent === "number" ? h.percent : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1 text-[10px]">
                            <span className="font-bold text-slate-600 truncate mr-4">{name}</span>
                            <span className="font-black text-slate-900 shrink-0">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 opacity-60 rounded-full" style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-slate-400 py-4 text-center">Holding data not available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={12} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Verified 2026</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDetailTab('overview');
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50"
            >
              CLOSE
            </button>
            <button
              onClick={() => {
                onClose();
                navigate(`/marketplace?search=${encodeURIComponent(product.name)}`);
              }}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
            >
              MARKETPLACE <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const normalizeAllocation = (allocation = {}) => {
  if (!allocation) return { growth: 0, defensive: 0, cash: 0 };
  const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const hasPillars =
    allocation.growth !== undefined ||
    allocation.defensive !== undefined ||
    allocation.cash !== undefined ||
    allocation.liquidity !== undefined;

  let growth = 0;
  let defensive = 0;
  let cash = 0;

  if (hasPillars) {
    growth = toNumber(allocation.growth);
    defensive = toNumber(allocation.defensive);
    cash = toNumber(allocation.cash ?? allocation.liquidity);
  } else {
    const equities = toNumber(allocation.equities);
    const property = toNumber(allocation.property);
    const other = toNumber(allocation.other);
    const bonds = toNumber(allocation.bonds);
    const cashVal = toNumber(allocation.cash);
    growth = equities + property + other;
    defensive = bonds;
    cash = cashVal;
  }

  const total = growth + defensive + cash;
  if (total <= 0) {
    return { growth: 0, defensive: 0, cash: 0 };
  }

  let scale = 1;
  if (total <= 1.2) {
    scale = 100 / total;
  } else if (total > 100) {
    scale = 100 / total;
  }

  const clamp = (val) => Math.max(0, Number((val * scale).toFixed(2)));
  return {
    growth: clamp(growth),
    defensive: clamp(defensive),
    cash: clamp(cash),
  };
};

const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
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

// Minimalist Abstract 2D Geometric Hourglass
const AnimatedHourglass = ({ progress }) => {
  const p = progress / 100;
  
  return (
    <div className="relative w-16 h-20 flex items-center justify-center">
      {/* Subtle Ambient Glow */}
      <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl animate-pulse" />
      
      <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 overflow-visible">
        {/* Abstract Outline - Outer Frame */}
        <path 
          d="M4 2H36M4 54H36M4 2L20 28L36 2M4 54L20 28L36 54" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-slate-200" 
        />
        
        {/* Sand - Top Chamber (Draining) */}
        <path 
          d={`M${4 + 16 * p} ${2 + 26 * p} L${36 - 16 * p} ${2 + 26 * p} L20 28 Z`} 
          fill="currentColor" 
          className="text-primary/20 transition-all duration-1000"
        />
        
        {/* Sand - Bottom Chamber (Filling) */}
        <path 
          d={`M20 28 L${20 - 16 * p} ${54 - 26 * (1-p)} L${20 + 16 * p} ${54 - 26 * (1-p)} Z`} 
          fill="currentColor" 
          className="text-primary transition-all duration-1000"
        />

        {/* Central Flowing Particle (Animated) */}
        {progress < 100 && (
          <line 
            x1="20" y1="28" x2="20" y2="52" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray="2 4" 
            className="text-primary/40"
          >
            <animate attributeName="stroke-dashoffset" from="6" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>
        )}

        {/* Precision Nodes */}
        <circle cx="20" cy="28" r="2" fill="currentColor" className="text-primary shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
      </svg>
    </div>
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
const PortfolioProductCard = ({ item, index, onClick, currentBalance }) => {
  const product = item.product_id || item; // Handle populated or snapshot data
  const category = product.category || 'Fund';
  const isKiwiSaver = category === 'KiwiSaver';

  return (
    <div 
      onClick={() => onClick({ ...product, weight_pct: item.weight_pct, rationale: item.rationale })}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:border-indigo-200 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
    >
      {isKiwiSaver && (
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" title="KiwiSaver Product" />
      )}
      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-indigo-100 shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-black text-slate-900 text-xs md:text-sm truncate group-hover:text-indigo-600 transition-colors">
            {product.name || product.product_name || `Asset ${index + 1}`}
          </div>
          <ExternalLink size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
          <span className={`px-1.5 py-0.5 rounded ${
            isKiwiSaver ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-500'
          }`}>
            {category.toUpperCase()}
          </span>
          <span>•</span>
          <span className="truncate">{product.provider || 'External Provider'}</span>
        </div>
      </div>
      
      {/* Current Balance Display */}
      <div className="text-right shrink-0 ml-4 flex flex-col items-end">
        <div className="text-sm md:text-base font-black text-slate-900 leading-none mb-1">
          {formatCurrency(currentBalance)}
        </div>
        <div className="flex items-center gap-1.5">
           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
             {item.weight_pct?.toFixed(1) || '0.0'}%
           </span>
        </div>
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
  const allocation = normalizeAllocation(product.allocation || product.metrics?.allocation);
  const feeValue = product.fees ?? product.metrics?.fees?.total;

  const tabs = [
    { id: 'analysis', label: 'DEEP ANALYSIS', icon: TrendingUp },
    { id: 'composition', label: 'PORTFOLIO COMPOSITION', icon: Layers },
    { id: 'holdings', label: 'TOP HOLDINGS', icon: Target }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 transition-opacity" onClick={onClose}>
      <div 
        className="relative w-full max-w-[620px] bg-white rounded-[2.25rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
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
                          Growth Assets: {formatPct(allocation.growth)}%
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-sky-400" />
                          Defensive Assets: {formatPct(allocation.defensive)}%
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-fuchsia-400" />
                          Cash & Liquidity: {formatPct(allocation.cash || allocation.liquidity)}%
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
              <div className="space-y-4">
                {topHoldings.length > 0 ? (
                  topHoldings.slice(0, 5).map((holding, idx) => {
                    const name = holding.name || holding.ticker || 'Holding';
                    const percent = typeof (holding.percent ?? holding.weight) === 'number' 
                      ? (holding.percent ?? holding.weight) 
                      : null;
                    
                    return (
                      <div key={idx} className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 truncate max-w-[280px] md:max-w-[360px]">{name}</h4>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {holding.type || 'ASSET'} • {holding.country || 'GLOBAL'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-indigo-600 tracking-tight">
                              {percent !== null ? `${percent.toFixed(2)}%` : '—'}
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Weight</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out opacity-80 group-hover:opacity-100"
                            style={{ width: percent !== null ? `${Math.max(percent, 2)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })
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
              <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-brand-600">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {log.ai_decision.rationale}
                </ReactMarkdown>
              </div>
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
  
  const monthlyAmount = strategy?.monthly_amount || contribution?.amount || 0;
  const lumpSum = strategy?.lump_sum_amount || 0;
  
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6">
        <DollarSign size={18} className="text-emerald-500" />
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contribution Strategy</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monthly Flow</span>
          <span className="text-lg font-black text-slate-900">{formatCurrency(monthlyAmount)}</span>
        </div>
        
        {lumpSum > 0 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Initial Deposit</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(lumpSum)}</span>
          </div>
        )}
        
        <div className="flex items-center gap-4 pt-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${strategy?.income_linked ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income Linked</span>
          </div>
          {strategy?.escalation_rate_pct > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{strategy.escalation_rate_pct}% Annual Escalation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Glide Path Card
const GlidePathCard = ({ glidePath }) => {
  const isEnabled = glidePath?.enabled;
  const endState = glidePath?.end_state || { growth: 30, defensive: 50, liquidity: 20 };
  
  return (
    <div className={`bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2.5 mb-6">
        <TrendingUp size={18} className={isEnabled ? 'text-blue-500' : 'text-slate-400'} />
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Glide Path</h3>
        {!isEnabled && (
          <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">Disabled</span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">De-risking Strategy</span>
          <span className="text-xs font-black text-slate-900">
            {isEnabled ? `${glidePath.start_years_before_goal || 10}Y Before Target` : 'Static Allocation'}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Growth', value: endState.growth, color: isEnabled ? 'text-indigo-600' : 'text-slate-400', bg: 'bg-slate-50' },
            { label: 'Defensive', value: endState.defensive, color: isEnabled ? 'text-sky-600' : 'text-slate-400', bg: 'bg-slate-50' },
            { label: 'Cash', value: endState.liquidity, color: isEnabled ? 'text-fuchsia-600' : 'text-slate-400', bg: 'bg-slate-50' }
          ].map((item, idx) => (
            <div key={idx} className={`text-center p-3 ${item.bg} rounded-xl border border-slate-100/50`}>
              <div className={`text-base font-black ${item.color}`}>{isEnabled ? `${item.value}%` : '—'}</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.label}</div>
            </div>
          ))}
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
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [associatedAssets, setAssociatedAssets] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);
  const { timeOffset, marketMode } = useSimulation();
  
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      // ✅ 使用原生浏览器打印 (支持所有现代CSS)
      const currentTab = activeTab;
      const allTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'portfolio', label: 'Plan Holdings' },
        { id: 'strategy', label: 'Strategy' },
        { id: 'decisions', label: 'Decision History' }
      ];
      
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');
      
      const tabSections = [];
      
      for (let i = 0; i < allTabs.length; i++) {
        const tab = allTabs[i];
        setActiveTab(tab.id);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const clonedContent = reportRef.current.cloneNode(true);
        clonedContent.querySelectorAll('[data-export-ignore="true"]').forEach(el => el.remove());
        
        const sectionHTML = i === 0 
          ? clonedContent.innerHTML 
          : `<div style="page-break-before: always; padding-top: 30px;">
              <h2 style="font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 30px; padding-bottom: 12px; border-bottom: 3px solid #6366f1;">
                ${tab.label}
              </h2>
              ${clonedContent.innerHTML}
            </div>`;
        
        tabSections.push(sectionHTML);
      }
      
      setActiveTab(currentTab);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${goal.goal_name} - Complete Report</title>
            <meta charset="UTF-8">
            <style>
              ${styles}
              @media print {
                body { margin: 0; padding: 20px; background: white; }
                button { display: none !important; }
                [data-export-ignore="true"] { display: none !important; }
                @page { margin: 1.5cm; size: A4; }
                h1, h2, h3 { page-break-after: avoid; }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #1e293b;
              }
            </style>
          </head>
          <body>${tabSections.join('\n')}</body>
        </html>
      `);
      
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 1000);
      setIsExporting(false);
      return; // ✅ 直接返回，不执行下面的html2canvas代码
      
      const element = reportRef.current;
      
      // html2canvas v1.4.1 has major issues with Tailwind v4's oklch() and oklab() colors.
      // These are modern CSS color spaces that the library's internal parser doesn't understand.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        ignoreElements: (el) => {
          return el.getAttribute('data-export-ignore') === 'true';
        },
        onclone: (clonedDoc) => {
          // CRITICAL FIX: Tailwind v4 uses oklch()/oklab() which html2canvas cannot parse
          // Solution: Replace ALL Tailwind color utilities with RGB equivalents
          
          // 1. Inject comprehensive color override stylesheet
          const colorOverrideCSS = `
            /* Text Colors - RGB overrides */
            .text-slate-50 { color: rgb(248, 250, 252) !important; }
            .text-slate-100 { color: rgb(241, 245, 249) !important; }
            .text-slate-200 { color: rgb(226, 232, 240) !important; }
            .text-slate-300 { color: rgb(203, 213, 225) !important; }
            .text-slate-400 { color: rgb(148, 163, 184) !important; }
            .text-slate-500 { color: rgb(100, 116, 139) !important; }
            .text-slate-600 { color: rgb(71, 85, 105) !important; }
            .text-slate-700 { color: rgb(51, 65, 85) !important; }
            .text-slate-800 { color: rgb(30, 41, 59) !important; }
            .text-slate-900 { color: rgb(15, 23, 42) !important; }
            
            .text-indigo-50 { color: rgb(238, 242, 255) !important; }
            .text-indigo-100 { color: rgb(224, 231, 255) !important; }
            .text-indigo-200 { color: rgb(199, 210, 254) !important; }
            .text-indigo-300 { color: rgb(165, 180, 252) !important; }
            .text-indigo-400 { color: rgb(129, 140, 248) !important; }
            .text-indigo-500 { color: rgb(99, 102, 241) !important; }
            .text-indigo-600 { color: rgb(79, 70, 229) !important; }
            .text-indigo-700 { color: rgb(67, 56, 202) !important; }
            .text-indigo-800 { color: rgb(55, 48, 163) !important; }
            .text-indigo-900 { color: rgb(49, 46, 129) !important; }
            
            .text-emerald-50 { color: rgb(236, 253, 245) !important; }
            .text-emerald-100 { color: rgb(209, 250, 229) !important; }
            .text-emerald-200 { color: rgb(167, 243, 208) !important; }
            .text-emerald-300 { color: rgb(110, 231, 183) !important; }
            .text-emerald-400 { color: rgb(52, 211, 153) !important; }
            .text-emerald-500 { color: rgb(16, 185, 129) !important; }
            .text-emerald-600 { color: rgb(5, 150, 105) !important; }
            .text-emerald-700 { color: rgb(4, 120, 87) !important; }
            .text-emerald-800 { color: rgb(6, 95, 70) !important; }
            .text-emerald-900 { color: rgb(6, 78, 59) !important; }
            
            .text-rose-50 { color: rgb(255, 241, 242) !important; }
            .text-rose-100 { color: rgb(255, 228, 230) !important; }
            .text-rose-200 { color: rgb(254, 205, 211) !important; }
            .text-rose-300 { color: rgb(253, 164, 175) !important; }
            .text-rose-400 { color: rgb(251, 113, 133) !important; }
            .text-rose-500 { color: rgb(244, 63, 94) !important; }
            .text-rose-600 { color: rgb(225, 29, 72) !important; }
            .text-rose-700 { color: rgb(190, 18, 60) !important; }
            .text-rose-800 { color: rgb(159, 18, 57) !important; }
            .text-rose-900 { color: rgb(136, 19, 55) !important; }
            
            .text-amber-400 { color: rgb(251, 191, 36) !important; }
            .text-amber-500 { color: rgb(245, 158, 11) !important; }
            .text-amber-600 { color: rgb(217, 119, 6) !important; }
            .text-amber-700 { color: rgb(180, 83, 9) !important; }
            
            /* Background Colors */
            .bg-slate-50 { background-color: rgb(248, 250, 252) !important; }
            .bg-slate-100 { background-color: rgb(241, 245, 249) !important; }
            .bg-slate-200 { background-color: rgb(226, 232, 240) !important; }
            .bg-slate-300 { background-color: rgb(203, 213, 225) !important; }
            .bg-slate-800 { background-color: rgb(30, 41, 59) !important; }
            .bg-slate-900 { background-color: rgb(15, 23, 42) !important; }
            
            .bg-white { background-color: rgb(255, 255, 255) !important; }
            
            .bg-indigo-50 { background-color: rgb(238, 242, 255) !important; }
            .bg-indigo-100 { background-color: rgb(224, 231, 255) !important; }
            .bg-indigo-500 { background-color: rgb(99, 102, 241) !important; }
            .bg-indigo-600 { background-color: rgb(79, 70, 229) !important; }
            
            .bg-emerald-50 { background-color: rgb(236, 253, 245) !important; }
            .bg-emerald-100 { background-color: rgb(209, 250, 229) !important; }
            .bg-emerald-500 { background-color: rgb(16, 185, 129) !important; }
            .bg-emerald-600 { background-color: rgb(5, 150, 105) !important; }
            
            .bg-rose-50 { background-color: rgb(255, 241, 242) !important; }
            .bg-rose-100 { background-color: rgb(255, 228, 230) !important; }
            .bg-rose-500 { background-color: rgb(244, 63, 94) !important; }
            .bg-rose-600 { background-color: rgb(225, 29, 72) !important; }
            
            .bg-amber-50 { background-color: rgb(255, 251, 235) !important; }
            .bg-amber-100 { background-color: rgb(254, 243, 199) !important; }
            
            /* Border Colors */
            .border-slate-100 { border-color: rgb(241, 245, 249) !important; }
            .border-slate-200 { border-color: rgb(226, 232, 240) !important; }
            .border-slate-300 { border-color: rgb(203, 213, 225) !important; }
            
            .border-indigo-100 { border-color: rgb(224, 231, 255) !important; }
            .border-indigo-200 { border-color: rgb(199, 210, 254) !important; }
            .border-indigo-500 { border-color: rgb(99, 102, 241) !important; }
            
            .border-emerald-100 { border-color: rgb(209, 250, 229) !important; }
            .border-emerald-200 { border-color: rgb(167, 243, 208) !important; }
            
            .border-rose-100 { border-color: rgb(255, 228, 230) !important; }
            .border-rose-200 { border-color: rgb(254, 205, 211) !important; }
            
            /* Ring/Shadow colors */
            * { 
              --tw-ring-color: rgba(99, 102, 241, 0.5) !important;
              --tw-shadow-color: rgba(0, 0, 0, 0.1) !important;
              --tw-outline-color: rgb(99, 102, 241) !important;
            }
          `;
          
          const styleTag = clonedDoc.createElement('style');
          styleTag.textContent = colorOverrideCSS;
          clonedDoc.head.appendChild(styleTag);
          
          // 2. Also process inline styles (backup)
          const elements = clonedDoc.getElementsByTagName('*');
          
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const style = window.getComputedStyle(el);
            
            // 1. Fix explicit color properties
            const colorProps = [
              'backgroundColor', 'color', 'fill', 'stroke',
              'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
              'outlineColor'
            ];

            colorProps.forEach(prop => {
              const val = style[prop];
              if (val && (val.includes('oklch') || val.includes('oklab'))) {
                if (prop === 'backgroundColor') el.style.backgroundColor = 'rgb(255, 255, 255)';
                else if (prop === 'color') el.style.color = 'rgb(30, 41, 59)'; // slate-800
                else if (prop.includes('Color')) el.style[prop] = 'rgb(226, 232, 240)'; // slate-200
                else if (prop === 'fill' || prop === 'stroke') el.style[prop] = 'rgb(99, 102, 241)'; // indigo-500
              }
            });

            // 2. Fix backgroundImage (gradients often use oklch in Tailwind v4)
            if (style.backgroundImage && (style.backgroundImage.includes('oklch') || style.backgroundImage.includes('oklab'))) {
              el.style.backgroundImage = 'none';
              // If it was a brand gradient, use solid indigo
              if (el.className.includes('brand') || el.className.includes('indigo')) {
                el.style.backgroundColor = 'rgb(99, 102, 241)';
              }
            }

            // 3. Fix box-shadow (Tailwind v4 shadows often use oklch)
            if (style.boxShadow && (style.boxShadow.includes('oklch') || style.boxShadow.includes('oklab'))) {
              el.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`FinTwin_Report_${goal.goal_name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`PDF generation failed: ${err.message || 'Unknown error'}. Please try the Markdown export as an alternative.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = () => {
    const assetList = associatedAssets.length > 0 
      ? associatedAssets.map(a => `- **${a.name}**: ${formatCurrency(a.value)}`).join('\n')
      : "No individual assets linked yet.";

    const productList = selectedPortfolio?.products?.length > 0
      ? selectedPortfolio.products.map((item, idx) => {
          const p = item.product_id || item;
          return `${idx + 1}. **${p.name || p.product_name}** (${p.provider}) - Allocation: ${item.weight_pct}%`;
        }).join('\n')
      : "No portfolio configuration found.";

    const md = `
# Financial Strategy Report: ${goal.goal_name}
**Date Generated:** ${new Date().toLocaleDateString('en-NZ')}
**Status:** ${goal.status?.toUpperCase() || 'ACTIVE'}

## 1. Goal Summary
- **Target Amount:** ${formatCurrency(goal.target_amount)}
- **Target Date:** ${formatDate(goal.due_date)}
- **Current Balance:** ${formatCurrency(totalAssociatedValue)}
- **Progress:** ${progress.toFixed(1)}%
- **Time Horizon:** ${timeRemaining.text}

## 2. Strategic Configuration
- **Category:** ${goal.category}
- **Priority:** ${goal.priority || 'Medium'}
- **Risk Profile:** ${goal.riskTolerance || 'Balanced'}
- **Inflation Protection:** ${plan?.settings?.inflation_adjusted ? 'Enabled' : 'Disabled'}

## 3. AI Strategy Insight
${plan?.ai_rationale || goal.notes || "Standard growth path."}

## 4. Associated Assets
${assetList}

## 5. Target Asset Allocation
- **Growth Assets:** ${targetExposure?.growth || 0}%
- **Defensive Assets:** ${targetExposure?.defensive || 0}%
- **Liquidity/Cash:** ${targetExposure?.liquidity || 0}%

## 6. Recommended Portfolio Holdings
${productList}

---
*This report was generated by FinTwin AI Engine. Projections are estimates and not guaranteed.*
    `.trim();

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Strategy_Report_${goal.goal_name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch goal with plan
        const goalData = await getGoalWithPlan(id);
        setGoal(goalData);
        setPlan(goalData.plan || null);
        
        // 2. Fetch ALL assets + cash flows to find associated ones and feed simulation
        const [allAssets, allCashFlows] = await Promise.all([
          getAssets(),
          getCashFlows()
        ]);
        const linkedAssets = allAssets.filter(a => a.asset_details?.linked_goal_id === id);
        setAssociatedAssets(linkedAssets);
        setCashFlows(allCashFlows || []);

        // 3. Fetch decision logs
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
  
  // 2. Simulated data wrapper
  // This interceptor allows the page to reflect future state automatically
  const simulatedData = useSimulatedData({
    assets: associatedAssets,
    goals: [goal].filter(Boolean),
    cashFlows: cashFlows // Include cash flows so contributions feed the evolution engine
  });

  const displayGoal = simulatedData?.goals?.[0] || goal;
  const displayAssets = simulatedData?.assets || associatedAssets;

  // Computed values
  const totalAssociatedValue = useMemo(() => {
    return displayAssets.reduce((sum, a) => sum + (a.value || 0), 0);
  }, [displayAssets]);

  const progress = useMemo(() => {
    if (!displayGoal?.target_amount) return 0;
    // Real-time progress: Sum of current associated assets value / Target
    return Math.min(100, Math.max(0, (totalAssociatedValue / displayGoal.target_amount) * 100));
  }, [totalAssociatedValue, displayGoal?.target_amount]);
  
  const timeRemaining = useMemo(() => {
    return getTimeRemaining(goal?.due_date);
  }, [goal?.due_date]);

  const timeProgress = useMemo(() => {
    if (!goal?.created_at || !goal?.due_date) return 0;
    const start = new Date(goal.created_at).getTime();
    const end = new Date(goal.due_date).getTime();
    const now = new Date().getTime();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, ((now - start) / total) * 100));
  }, [goal]);
  
  const selectedPortfolio = plan?.selected_portfolio;
  // Use actual portfolio exposure instead of target for consistency with Holdings tab
  const targetExposure = selectedPortfolio?.calculated_exposure || plan?.target_exposure;
  
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
      <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in" ref={reportRef}>
        
        {/* Back Button & Header - Refactored */}
        <div className="mb-8" data-export-ignore="true">
          <button 
            onClick={() => navigate('/goals')}
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:shadow-sm transition-all">
              <ArrowLeft size={14} />
            </div>
            <span className="text-sm font-semibold">Back to Goals</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-4 ring-white">
                <Target size={32} />
              </div>
              <div className="pt-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 leading-none">{goal.goal_name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/50 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    {goal.category}
                  </div>
                  <StatusBadge status={goal.status} />
                  {timeOffset > 0 && (
                     <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Zap size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sim Mode (+{timeOffset}y)</span>
                     </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2" data-export-ignore="true">
              <div className="relative group">
                <button 
                  className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2"
                >
                  <Download size={16} className="text-slate-400" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5 transform origin-top-right scale-95 group-hover:scale-100">
                  <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Download size={14} className="text-brand-500" />
                    {isExporting ? 'Generating...' : 'Download PDF Report'}
                  </button>
                  <button 
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <FileText size={14} className="text-emerald-500" />
                    Download Markdown
                  </button>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/goals/${id}/edit`)}
                className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex items-center gap-2"
              >
                <Edit3 size={16} className="text-slate-400" />
                <span>Edit</span>
              </button>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm group/delete"
                title="Delete Goal"
              >
                <Trash2 size={16} className="group-hover/delete:animate-bounce" />
              </button>
            </div>
          </div>
        </div>

        {/* PDF Header */}
        <div className="hidden pb-6 mb-8 border-b border-slate-100 flex items-center justify-between" style={{ display: isExporting ? 'flex' : 'none' }}>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-100">FT</div>
              <div>
                <span className="font-black text-slate-900 tracking-tight text-lg block">FinTwin Strategy Report</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Empowering Financial Clarity</span>
              </div>
           </div>
           <div className="text-right">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block mb-1">Confidential Report</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-NZ', { dateStyle: 'full' })}</span>
           </div>
        </div>

        
        {/* Progress Hero Card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden group">
            {/* Background Effects */}
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/40 to-transparent pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
               {/* 1. Digital Twin (Visual Anchor) */}
               <div className="hidden lg:block shrink-0 transform hover:scale-105 transition-transform duration-500">
                  <DigitalTwinHouse progress={progress} />
               </div>

               {/* 2. Main Metrics (Expanded) */}
               <div className="flex-1 w-full space-y-7">
                  {/* Top Row: Financials */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                     {/* Current vs Target */}
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                           <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                              <Target size={14} /> 
                           </div>
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Goal Progress</span>
                           {timeRemaining.isOverdue && (
                              <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Overdue</span>
                           )}
                        </div>
                        <div className="flex items-baseline gap-3">
                           <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                              {formatCurrency(totalAssociatedValue)}
                           </span>
                           <span className="text-lg font-bold text-slate-400">
                              / {formatCurrency(goal.target_amount)}
                           </span>
                        </div>
                     </div>

                     {/* Monthly Save (Compact Card) */}
                     <div className="w-full md:w-auto md:min-w-[180px] bg-slate-50/80 rounded-2xl p-4 border border-slate-100 group/save hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Monthly Save
                           </span>
                           <div className={`w-1.5 h-1.5 rounded-full ${plan?.contribution ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        </div>
                        <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                           {plan?.contribution ? (
                              <>
                                 <TrendingUp size={18} />
                                 {formatCurrency(plan.contribution.amount || plan.contribution_strategy?.monthly_amount)}
                              </>
                           ) : (
                              <span className="text-slate-400 text-base italic">Not setup</span>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Middle: Progress Bar */}
                  <div>
                     <div className="flex justify-between text-xs font-bold text-slate-500 mb-2.5 px-1">
                        <span className="text-indigo-600 flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                           {progress.toFixed(1)}% Complete
                        </span>
                        <span className="flex items-center gap-1.5">
                           <Calendar size={12} />
                           Target: {formatDate(goal.due_date)}
                        </span>
                     </div>
                     <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-100">
                        <div 
                           className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 relative bg-[length:200%_100%] animate-[shimmer_3s_infinite]"
                           style={{ width: `${progress}%` }}
                        >
                           <div className="absolute inset-0 bg-white/20"></div>
                        </div>
                     </div>
                  </div>

                  {/* Bottom: Meta Stats (Grid) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Remaining */}
                     <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                           <Coins size={14} />
                        </div>
                        <div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Remaining</span>
                           <span className="text-sm font-bold text-slate-700">{formatCurrency(Math.max(0, goal.target_amount - totalAssociatedValue))}</span>
                        </div>
                     </div>

                     {/* Time Left */}
                     <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center ${timeRemaining.isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                           <Clock size={14} />
                        </div>
                        <div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Time Left</span>
                           <span className={`text-sm font-bold ${timeRemaining.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{timeRemaining.text}</span>
                        </div>
                     </div>

                     {/* Priority */}
                     <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-amber-500">
                           <AlertCircle size={14} />
                        </div>
                        <div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                           <span className="text-sm font-bold text-slate-700 capitalize">{goal.priority || 'Medium'}</span>
                        </div>
                     </div>

                     {/* Risk */}
                     <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500">
                           <Shield size={14} />
                        </div>
                        <div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Risk</span>
                           <span className="text-sm font-bold text-slate-700 capitalize">{goal.riskTolerance || 'Balanced'}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6 overflow-x-auto" data-export-ignore="true">
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
                  value={formatCurrency(totalAssociatedValue)}
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
                      <div className="flex items-center justify-between mb-6">
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

                      <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed font-medium">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {plan?.ai_rationale || goal.notes || "This goal is currently following a standard growth path. Our AI recommends periodic reviews to ensure alignment with market volatility."}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {plan?.strategy_profile && (
                      <div className="relative z-10 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-50 mt-6">
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

                  {/* Goal Details Card - Multi-column Layout */}
                  {goal.goal_details && (() => {
                    const allCategories = {
                      "Financial Metrics": ["price", "cost", "amount", "budget", "income", "expense", "value", "rate", "percent", "pct", "tax", "fee", "liquid", "invest", "debt", "balance", "contribution", "return", "inflation", "appreciation", "term", "deposit", "savings", "down_payment", "mortgage", "loan"],
                      "Temporal Info": ["date", "year", "month", "duration", "period", "frequency", "horizon", "timeline"],
                      "Status & Type": ["status", "type", "category", "method", "mode", "is_", "has_", "condition", "attitude", "location", "first_home", "buyer", "owner"],
                      "Other Details": []
                    };

                    // Categorize all items
                    const categorizedItems = {
                      "Financial Metrics": [],
                      "Temporal Info": [],
                      "Status & Type": [],
                      "Other Details": []
                    };

                    Object.entries(goal.goal_details).forEach(([key, value]) => {
                      if (value === null || value === undefined || value === '') return;
                      
                      let categorized = false;
                      for (const [catName, keywords] of Object.entries(allCategories)) {
                        if (catName !== "Other Details" && keywords.some(k => key.toLowerCase().includes(k))) {
                          categorizedItems[catName].push([key, value]);
                          categorized = true;
                          break;
                        }
                      }
                      
                      if (!categorized) {
                        categorizedItems["Other Details"].push([key, value]);
                      }
                    });

                    // Check if there's any data to display
                    const hasData = Object.values(categorizedItems).some(items => items.length > 0);
                    if (!hasData) return null;

                    return (
                      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h3 className="text-slate-900 font-bold text-sm uppercase tracking-[0.15em]">
                              Goal Details
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Comprehensive Information</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {Object.entries(categorizedItems).map(([catName, items]) => {
                            if (items.length === 0) return null;
                            return (
                              <div key={catName} className="space-y-4">
                                <div className="flex items-center gap-2 pb-3 border-b-2 border-brand-100">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    {catName}
                                  </h4>
                                </div>
                                <div className="space-y-3">
                                  {items.map(([key, value]) => {
                                    const label = key.replace(/_/g, ' ');
                                    const isDate = key.toLowerCase().includes('date') && !isNaN(Date.parse(value));
                                    const isCurrency = key.toLowerCase().includes('price') || 
                                                      key.toLowerCase().includes('cost') || 
                                                      key.toLowerCase().includes('amount') ||
                                                      key.toLowerCase().includes('budget') ||
                                                      key.toLowerCase().includes('income') ||
                                                      key.toLowerCase().includes('deposit') ||
                                                      key.toLowerCase().includes('payment');
                                    
                                    let displayValue = value;
                                    if (typeof value === 'boolean') {
                                      displayValue = value ? 'Yes' : 'No';
                                    } else if (isDate) {
                                      displayValue = formatDate(value);
                                    } else if (isCurrency && typeof value === 'number') {
                                      displayValue = formatCurrency(value);
                                    } else {
                                      displayValue = String(value);
                                    }
                                    
                                    return (
                                      <div key={key} className="space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                                          {label}
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 leading-tight">
                                          {displayValue}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
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

                  {/* Time Horizon - Simplified Abstract Design */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center">
                    <div className="mb-6">
                      <AnimatedHourglass progress={timeProgress} />
                    </div>
                    
                    <div className="text-center space-y-1 mb-8">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Temporal Horizon</h3>
                      <div className={`text-2xl font-black tracking-tight ${timeRemaining.isOverdue ? 'text-rose-600' : 'text-primary'}`}>
                        {timeRemaining.text}
                      </div>
                    </div>

                    <div className="w-full space-y-3">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</span>
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{formatDate(goal.created_at)}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Date</span>
                        <span className="text-xs font-bold text-slate-900 tracking-tight">{formatDate(goal.due_date)}</span>
                      </div>
                    </div>

                    <div className="mt-6 w-full pt-6 border-t border-slate-50 flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{timeProgress.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Next Steps / Actions (Moved to bottom of right column) */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-slate-900 font-bold text-sm uppercase tracking-[0.15em]">
                            Next Actions
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Your Roadmap</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {goal.actions?.length > 0 ? (
                        goal.actions.map((action, idx) => (
                          <div key={action._id || idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-brand-200 transition-all">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${action.is_completed ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300'}`}>
                              {action.is_completed && <Check size={12} strokeWidth={4} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${action.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {action.action_text}
                              </p>
                              {action.reminder_date && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                  Due {formatDate(action.reminder_date)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300">
                            <Sparkles size={24} />
                          </div>
                          <p className="italic text-slate-400 text-xs leading-relaxed">
                            AI is analyzing your path...<br/>No immediate actions required.
                          </p>
                        </div>
                      )}
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
                          {items.map((item, idx) => {
                            const product = item.product_id || item;
                            const asset = displayAssets.find(a => 
                              a.source_product_id === (product._id || product.id) || 
                              a.name.includes(product.name)
                            );
                            
                            return (
                              <PortfolioProductCard 
                                key={item._id || (item.product_id ? (item.product_id._id || item.product_id.id || item.product_id) : null) || `product-${category}-${idx}`} 
                                item={item} 
                                index={idx} 
                                onClick={(p) => {
                                  setSelectedProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                currentBalance={asset ? asset.value : 0}
                              />
                            );
                          })}
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ContributionStrategyCard 
                  strategy={plan?.contribution_strategy} 
                  contribution={plan?.contribution}
                />
                <GlidePathCard glidePath={plan?.glide_path} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Plan Settings */}
                {plan?.settings && (
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-6">
                      <Settings2 size={18} className="text-slate-400" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Plan Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Inflation Adjusted', value: plan.settings.inflation_adjusted, icon: TrendingUp },
                        { label: 'Tax Optimized', value: plan.settings.tax_optimized, icon: Shield },
                        { label: 'Reinvest Dividends', value: plan.settings.reinvest_dividends, icon: RefreshCw },
                        { label: 'Liquidity Preference', value: plan.settings.liquidity_preference || 'Flexible', icon: Wallet, isText: true }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <item.icon size={13} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                          </div>
                          {item.isText ? (
                            <span className="text-xs font-bold text-slate-900 uppercase">{item.value}</span>
                          ) : (
                            <span className={`text-[10px] font-black uppercase ${item.value ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {item.value ? 'Active' : 'Off'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Strategy Profile */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-6">
                    <Shield size={18} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Strategy Profile</h3>
                  </div>

                  <div className="flex flex-col justify-center h-[calc(100%-4rem)]">
                    <div className="text-3xl font-black text-indigo-600 tracking-tighter mb-2 uppercase">
                      {plan?.strategy_profile || 'Balanced'}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Automated asset allocation and rebalancing logic to maintain your target risk-return trajectory.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      AI Engine Monitored
                    </div>
                  </div>
                </div>
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
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowDeleteConfirm(false)}></div>
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

        {/* Product Detail Modal (Mirrors Stage 3 style) */}
        <GoalProductDetailModal 
          product={selectedProduct}
          open={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
        />

        {/* PDF Footer */}
        <div className="hidden pt-8 mt-12 border-t border-slate-50 flex items-center justify-between opacity-50" style={{ display: isExporting ? 'flex' : 'none' }}>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-md leading-relaxed">
             Disclaimer: This document is a projection based on current market assumptions and user-provided data. Past performance is not indicative of future results. Financial decisions should be made in consultation with a qualified professional.
           </p>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 tracking-tighter">GENERATED BY FINTWIN ENGINE V2.1</p>
              <p className="text-[8px] font-bold text-slate-400">© 2026 Money-Minds Interactive</p>
           </div>
        </div>
        
      </div>
    </MainLayout>
  );
};

export default GoalDetailPage;




