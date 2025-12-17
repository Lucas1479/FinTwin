import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";

export default function HorizontalFilterBar({ filters, setFilters, providers, maxTicketSize }) {
  const [showAll, setShowAll] = useState(false);

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const toggle = (key, value) => {
    setFilters((prev) => {
      const list = new Set(prev[key] ?? []);
      if (list.has(value)) list.delete(value);
      else list.add(value);
      return { ...prev, [key]: Array.from(list) };
    });
  };

  const CATEGORY_OPTIONS = [
    { value: "All", label: "All" },
    { value: "KiwiSaver", label: "KiwiSaver" },
    { value: "ManagedFund", label: "Funds" },
    { value: "TermDeposit", label: "Deposits" },
  ];

  const RISK_OPTIONS = ["Defensive", "Conservative", "Balanced", "Growth", "Aggressive"];

  return (
    <div className="mb-6 rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
      {/* Primary Row: Categories & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilters({ category: opt.value })}
              className={`
                px-4 py-2 rounded-xl text-sm font-bold transition-all border
                ${(filters.category ?? "All") === opt.value
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500/10 shadow-sm"
                  : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200"}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAll(!showAll)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${showAll || filters.riskLevels.length > 0 || filters.minReturn5y > -100 
              ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}
          `}
        >
          <SlidersHorizontal size={16} />
          {showAll ? "Hide Filters" : "More Filters"}
          {(filters.riskLevels.length > 0 || filters.minReturn5y > -100) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
              {(filters.riskLevels.length > 0 ? 1 : 0) + (filters.minReturn5y > -100 ? 1 : 0)}
            </span>
          )}
          <ChevronDown size={16} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded Section */}
      {showAll && (
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
          {/* Risk Profile */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Risk Profile</h3>
            <div className="flex flex-wrap gap-2">
              {RISK_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggle("riskLevels", r)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${(filters.riskLevels ?? []).includes(r)
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}
                  `}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Min Return Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min 5Y Return</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {filters.minReturn5y > -100 ? `${filters.minReturn5y}%+` : "Any"}
              </span>
            </div>
            <input
              type="range"
              min={-5}
              max={15}
              step={0.5}
              value={filters.minReturn5y ?? -100}
              onChange={(e) => updateFilters({ minReturn5y: Number(e.target.value) })}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>Any</span>
              <span>15%+</span>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex justify-end pt-2">
            <button 
              onClick={() => setFilters({ ...filters, search: "", riskLevels: [], providers: [], minReturn5y: -100, maxFee: 10.0 })}
              className="text-sm font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              <X size={14} /> Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

