import { useState } from "react";
export default function ProductCard({
  product,
  isSelected,
  onToggleCompare,
  onViewDetails,
  userInvestmentAmount,
}) {
  const [showImage, setShowImage] = useState(Boolean(product?.providerLogo));
  const annualizedReturn =
    product?.returns?.['5y'] ?? product?.returns?.['1y'] ?? null;
  const meetsMinimum =
    !product?.minimumInvestment ||
    (userInvestmentAmount && userInvestmentAmount >= product.minimumInvestment);
  const tenYearFees =
    typeof product?.fees === 'number'
      ? (100000 * product.fees * 0.01 * 10).toFixed(0)
      : null;

  const riskColors = {
    Conservative: 'bg-emerald-50 text-emerald-700',
    Balanced: 'bg-sky-50 text-sky-700',
    Growth: 'bg-orange-50 text-orange-700',
    Aggressive: 'bg-rose-50 text-rose-700',
  };

  const riskColorClass = riskColors[product?.riskLevel] ?? 'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Minimum Investment Badge */}
      {product?.minimumInvestment ? (
        <div className="mb-3 text-xs font-medium text-amber-700">
          {meetsMinimum ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="text-base">✓</span>
              Eligible for your amount
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1">
              Requires ${(product.minimumInvestment / 1000).toFixed(0)}k minimum
            </span>
          )}
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
          {showImage && product?.providerLogo ? (
            <img
              src={product.providerLogo}
              alt={product?.provider ?? 'Provider'}
              className="h-full w-full object-cover"
              onError={() => setShowImage(false)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
              {(product?.provider ?? 'PF').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {product?.name ?? 'Unnamed product'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {product?.provider ?? 'Unknown provider'}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskColorClass}`}>
          {product?.riskLevel ?? 'N/A'}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Annual Return</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            {typeof annualizedReturn === 'number' ? `${annualizedReturn.toFixed(1)}% p.a.` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Total Fees</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {typeof product?.fees === 'number' ? `${product.fees.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Risk Score</p>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className={`h-2 w-2 rounded-full ${
                  typeof product?.riskScore === 'number' && index < product.riskScore
                    ? 'bg-slate-900'
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">10Y Fee Cost</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {tenYearFees ? `$${tenYearFees}` : '—'}
          </p>
        </div>
      </div>

      {/* Net Return */}
      <div className="mb-4 rounded-xl bg-sky-50 p-3">
        <p className="text-[11px] font-medium text-slate-600">
          Net Return (after fees)
        </p>
        <p className="mt-1 text-sm font-semibold text-sky-900">
          {typeof annualizedReturn === 'number' && typeof product?.fees === 'number'
            ? `${(annualizedReturn - product.fees).toFixed(2)}% p.a.`
            : '—'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleCompare?.(product?.id)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            isSelected
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {isSelected ? '✓ Selected for comparison' : 'Compare'}
        </button>

        <button
          type="button"
          onClick={() => onViewDetails?.(product)}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700"
        >
          View details →
        </button>
      </div>
    </div>
  );
}