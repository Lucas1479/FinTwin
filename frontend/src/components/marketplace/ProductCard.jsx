import { useState } from "react";
import { TrendingUp, ShieldCheck, AlertCircle, Info, ArrowRight } from "lucide-react";

export default function ProductCard({
  product,
  isSelected,
  onToggleCompare,
  onViewDetails,
  userInvestmentAmount,
}) {
  const [showImage, setShowImage] = useState(Boolean(product?.providerLogo));
  
  const annualizedReturn = product?.returns?.['5y'] ?? product?.returns?.['1y'] ?? null;
  const netReturn = typeof annualizedReturn === 'number' && typeof product?.fees === 'number' 
    ? (annualizedReturn - product.fees) 
    : null;

  // Visual Styling Maps
  const riskConfig = {
    Defensive: { color: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", label: "Low Risk" },
    Conservative: { color: "text-teal-700", bg: "bg-teal-50", bar: "bg-teal-500", label: "Med-Low" },
    Balanced: { color: "text-blue-700", bg: "bg-blue-50", bar: "bg-blue-500", label: "Medium" },
    Growth: { color: "text-indigo-700", bg: "bg-indigo-50", bar: "bg-indigo-500", label: "Med-High" },
    Aggressive: { color: "text-violet-700", bg: "bg-violet-50", bar: "bg-violet-500", label: "High Risk" },
  };

  const riskStyle = riskConfig[product?.riskLevel] ?? riskConfig.Balanced;

  return (
    <div 
      onClick={() => onViewDetails?.(product)}
      className={`
        relative group flex flex-col rounded-[1.5rem] bg-white p-5 transition-all duration-300 cursor-pointer
        border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40
        ${isSelected ? "ring-2 ring-indigo-500 shadow-md" : ""}
      `}
    >
      {/* Compare Checkbox (Hidden unless hovered/selected) */}
      <div 
        className={`absolute top-5 right-5 z-10 transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        onClick={(e) => e.stopPropagation()} // Prevent card click
      >
        <label className="flex items-center gap-2 cursor-pointer bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-sm border border-slate-100 hover:border-indigo-200">
          <input 
            type="checkbox" 
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={isSelected}
            onChange={() => onToggleCompare?.(product?.id)}
          />
          <span className="text-[10px] font-semibold text-slate-600">Compare</span>
        </label>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 overflow-hidden">
          {showImage && product?.providerLogo ? (
            <img src={product.providerLogo} alt="" className="w-full h-full object-cover" onError={() => setShowImage(false)} />
          ) : (
            (product?.provider ?? "PF").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <h3 
            className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.25rem]" 
            title={product?.name}
          >
            {product?.name ?? "Unnamed Fund"}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate font-medium uppercase tracking-wide">{product?.provider ?? "Unknown Provider"}</p>
        </div>
      </div>

      {/* Main Metric: Return */}
      <div className="mb-5">
        <div className="flex items-baseline gap-0.5">
          <span className={`text-2xl font-bold ${annualizedReturn >= 0 ? "text-slate-900" : "text-rose-600"}`}>
            {typeof annualizedReturn === 'number' ? `${annualizedReturn.toFixed(2)}` : "—"}
          </span>
          <span className="text-sm font-medium text-slate-400">%</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5-Year Return</span>
          {netReturn !== null && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              <TrendingUp size={10} />
              {netReturn.toFixed(2)}% Net
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 pt-4 border-t border-slate-50">
        {/* Fees */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fees</span>
            <Info size={10} className="text-slate-300" />
          </div>
          <div className="text-sm font-semibold text-slate-700">
            {typeof product?.fees === 'number' ? `${product.fees.toFixed(2)}%` : "—"}
          </div>
        </div>

        {/* Risk Level */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${riskStyle.bg} ${riskStyle.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${riskStyle.bar}`}></div>
            {product?.riskLevel ?? "N/A"}
          </div>
        </div>
      </div>

      {/* Visual Indicator (Risk Bar) */}
      <div className="mb-1">
        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
          <span>Risk Score</span>
          <span>{product?.riskScore ?? 0} / 7</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-full ${
                (product?.riskScore ?? 0) > i ? riskStyle.bar : "bg-transparent"
              } transition-all duration-500`} 
            />
          ))}
        </div>
      </div>

      {/* Footer / Visual Cue */}
      <div className="mt-auto flex items-center justify-end pt-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
          <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}
