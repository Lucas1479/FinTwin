import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Target,
  AlertCircle,
  ArrowUpRight,
  MoreHorizontal,
  Wallet,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import api, { fetchCurrentUserProfile, fetchProducts } from '../utils/api';
import { scoreProduct } from '../utils/scoring';

// Simple default profile – later can be populated from /api/users/me
const DEFAULT_PROFILE = {
  riskTolerance: 'Balanced', // Conservative / Balanced / Growth / Aggressive
  horizonYears: 10, // investment horizon (years)
  monthlyContribution: 1000, // monthly contribution
  targetAmount: 200000, // target wealth
};

// Future value of a simple monthly contribution (compound interest)
function futureValueMonthly(monthly, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (!r) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [productsResult, userResult] = await Promise.allSettled([
          fetchProducts(),
          fetchCurrentUserProfile(),
        ]);

        if (!mounted) return;

        if (productsResult.status === 'fulfilled') {
          setProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
        } else {
          setError('Unable to load products for now. Please try again later.');
          // eslint-disable-next-line no-console
          console.error(productsResult.reason);
        }

        if (userResult.status === 'fulfilled') {
          const user = userResult.value || {};
          setProfile((prev) => ({
            ...prev,
            riskTolerance: user.riskTolerance || prev.riskTolerance,
          }));
        }
      } catch (e) {
        if (mounted) {
          setError('Unable to load data for now. Please try again later.');
          // eslint-disable-next-line no-console
          console.error(e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // 1) Select recommended products from Marketplace universe
  const recommended = useMemo(() => {
    const universe = products.filter((p) =>
      ['KiwiSaver', 'ManagedFund'].includes(p?.category),
    );
    const scored = universe
      .map((p) => scoreProduct(p, profile))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [products, profile]);

  const avgAnnualReturn = useMemo(() => {
    if (!recommended.length) return 4;
    const sum = recommended.reduce((acc, r) => acc + (r.annual || 0), 0);
    return sum / recommended.length;
  }, [recommended]);

  // 2) Derive three core metrics from recommended portfolio
  const totalProjected = futureValueMonthly(
    profile.monthlyContribution,
    avgAnnualReturn,
    profile.horizonYears,
  );

  const planHealthRaw = (totalProjected / profile.targetAmount) * 100;
  const planHealth = Math.max(0, Math.min(100, Math.round(planHealthRaw)));

  const neededMonthly = futureValueMonthly(1, avgAnnualReturn, profile.horizonYears);
  const monthlyTarget =
    neededMonthly > 0
      ? Math.round(profile.targetAmount / neededMonthly)
      : profile.monthlyContribution;

  const formatMoney = (v) =>
    `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-slate-500 mt-1">
              High-level view of your projected plan, powered by Marketplace data.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-50 transition">
              Download Report
            </button>
            <button className="bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition shadow-lg shadow-primary/25 flex items-center gap-2">
              <Plus size={18} />
              Add Widget
            </button>
          </div>
        </div>

        {/* Top Stats Cards - driven by real Marketplace data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Balance / projected wealth */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet size={64} className="text-primary" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-brand-50 rounded-2xl text-primary">
                <DollarSign size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">
              Projected balance in 10 years
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-4">
              {formatMoney(totalProjected)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight size={12} />
                {avgAnnualReturn.toFixed(1)}% p.a.
              </span>
              <span>
                Based on monthly contribution{' '}
                <span className="font-semibold">
                  {formatMoney(profile.monthlyContribution)}
                </span>
              </span>
            </div>
          </div>

          {/* Plan Health */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={64} className="text-orange-500" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                <Target size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">
              Plan health
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-4">{planHealth}%</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${planHealth}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Target {formatMoney(profile.targetAmount)}, projected{' '}
              {formatMoney(totalProjected)} with current plan.
            </p>
          </div>

          {/* Monthly Target */}
          <div className="card-base p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <CreditCard size={64} className="text-purple-500" />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-500">
                <DollarSign size={24} />
              </div>
              <button className="text-slate-400 hover:text-primary transition">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">
              Suggested monthly contribution
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-4">
              {formatMoney(monthlyTarget)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Current monthly contribution {formatMoney(profile.monthlyContribution)} –{' '}
              {monthlyTarget > profile.monthlyContribution
                ? 'below what is needed to hit the target'
                : 'on track for your target'}
            </div>
          </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Chart placeholder with scenario explanation */}
          <div className="card-base p-8 lg:col-span-2 min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900">Total Balance Overview</h2>
              <div className="flex gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  Recommended portfolio
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-300" />
                  Cash / term deposit
                </span>
              </div>
            </div>
            <div className="relative h-64 w-full bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
              <svg
                className="absolute bottom-0 left-0 right-0 w-full h-48 text-primary/20"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
              >
                <path
                  fill="currentColor"
                  d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                />
              </svg>
              <svg
                className="absolute bottom-0 left-0 right-0 w-full h-48 text-primary/40"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                style={{ transform: 'scaleY(0.8)' }}
              >
                <path
                  fill="currentColor"
                  d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                />
              </svg>
              <div className="relative z-10 text-center">
                <p className="text-slate-400 text-sm font-medium">
                  Suppose you invest {formatMoney(profile.monthlyContribution)} per month.
                  The chart compares the recommended portfolio vs a cash/term-deposit plan
                  over your investment horizon.
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  In a later iteration this can be replaced by a live Recharts / Chart.js line chart.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Recommended actions based on portfolio scoring */}
          <div className="card-base p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recommended Actions</h2>
              <button
                type="button"
                className="text-primary text-sm font-bold hover:underline"
                onClick={() => navigate('/marketplace')}
              >
                See All
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <AlertCircle size={16} />
                Loading products...
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="space-y-6">
                  {recommended.map(({ product, annual }, i) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors">
                          {(product.provider || 'PF').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 truncate max-w-[180px]">
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {product.provider} · {product.riskLevel || 'Risk profile'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Approx. annual return{' '}
                            <span className="font-semibold text-emerald-600">
                              {annual.toFixed(1)}% p.a.
                            </span>{' '}
                            · Fees{' '}
                            {typeof product.fees === 'number'
                              ? `${product.fees.toFixed(2)}%`
                              : 'n/a'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">
                          Recommended option #{i + 1}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Aligned with {profile.riskTolerance} risk tolerance
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    className="w-full btn-primary-rounded py-3 text-sm shadow-none bg-slate-900 hover:bg-slate-800"
                    onClick={() => navigate('/marketplace')}
                  >
                    Open Marketplace to explore all products
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
