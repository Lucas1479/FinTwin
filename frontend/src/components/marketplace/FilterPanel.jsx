import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, Check } from "lucide-react";
import InfoTooltip from '../common/InfoTooltip'; // Import Tooltip
import { HELP_ANCHORS } from '../../constants/helpAnchors'; // Import Registry

// Helper for collapsible sections
const FilterSection = ({ title, children, defaultOpen = true, count = 0 }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-5 border-b border-slate-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</span>
          {count > 0 && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">{count}</span>}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
        {children}
      </div>
    </div>
  );
};

export default function FilterPanel({ filters, setFilters, providers, maxTicketSize }) {
  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const formatMoney = (v) =>
    typeof v === "number"
      ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "";

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

  const RISK_OPTIONS = [
    { label: "Defensive", color: "bg-emerald-500" },
    { label: "Conservative", color: "bg-teal-500" },
    { label: "Balanced", color: "bg-blue-500" },
    { label: "Growth", color: "bg-indigo-500" },
    { label: "Aggressive", color: "bg-violet-500" }
  ];

  return (
    <div className="rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <SlidersHorizontal size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Filters</h2>
        </div>
        
        {/* Reset Button */}
        {(filters.category !== "All" || filters.search || filters.riskLevels.length > 0 || filters.minReturn5y > -100) && (
          <button 
            onClick={() => setFilters({ ...filters, category: "All", search: "", riskLevels: [], providers: [], minReturn5y: -100, maxFee: 10.0 })}
            className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Category - Chip Style */}
      <div className="py-6 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map((opt) => {
            const isSelected = (filters.category ?? "All") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateFilters({ category: opt.value })}
                className={`
                  relative px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border
                  ${isSelected 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500/10 translate-y-0" 
                    : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"}
                `}
              >
                {opt.label}
                {isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Risk Profile - Custom Checkbox */}
      <FilterSection 
        title={
            <div className="flex items-center gap-2">
                <span>Risk Profile</span>
                <InfoTooltip 
                    content="Filter products by their SRRI (Standard Risk Indicator). 1=Low, 7=High."
                    anchor={HELP_ANCHORS.MARKETPLACE.RISK_LEVELS} 
                />
            </div>
        } 
        count={filters.riskLevels.length}
      >
        <div className="space-y-3">
          {RISK_OPTIONS.map(({ label, color }) => {
            const isChecked = (filters.riskLevels ?? []).includes(label);
            return (
              <label key={label} className="flex cursor-pointer items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color} ${isChecked ? 'ring-4 ring-opacity-20' : ''} ring-${color.replace('bg-', '')}`} />
                  <span className={`text-sm ${isChecked ? "font-semibold text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}>
                    {label}
                  </span>
                </div>
                <div className={`
                  w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200
                  ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-200 bg-white group-hover:border-indigo-300"}
                `}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isChecked}
                    onChange={() => toggle("riskLevels", label)}
                  />
                  <Check size={12} className={`text-white transition-transform ${isChecked ? "scale-100" : "scale-0"}`} strokeWidth={3} />
                </div>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Min Return - Slider */}
      <FilterSection title="Min 5Y Return">
        <div className="px-1 py-2">
          <div className="flex justify-between text-xs font-medium mb-4">
            <span className="text-slate-400">Any</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {filters.minReturn5y > -10 ? `${filters.minReturn5y}%` : "No Min"}
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={15}
            step={0.5}
            value={filters.minReturn5y ?? -100}
            onChange={(e) => updateFilters({ minReturn5y: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700"
          />
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
            <span>-5%</span>
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
            <span>15%+</span>
          </div>
        </div>
      </FilterSection>

      {/* Max Fees - Slider */}
      <FilterSection title="Max Fees">
        <div className="px-1 py-2">
          <div className="flex justify-between text-xs font-medium mb-4">
            <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {filters.maxFee < 3 ? `${filters.maxFee}%` : "No Max"}
            </span>
            <span className="text-slate-400">3%+</span>
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={filters.maxFee ?? 10}
            onChange={(e) => updateFilters({ maxFee: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700"
          />
        </div>
      </FilterSection>

      {/* Providers - Searchable List */}
      <FilterSection title="Providers" count={filters.providers.length} defaultOpen={false}>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {(providers ?? []).map((p) => {
            const isChecked = (filters.providers ?? []).includes(p);
            return (
              <label key={p} className="flex cursor-pointer items-center gap-3 group py-1">
                <div className={`
                  w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0
                  ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white group-hover:border-indigo-400"}
                `}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isChecked}
                    onChange={() => toggle("providers", p)}
                  />
                  <Check size={10} className={`text-white transition-transform ${isChecked ? "scale-100" : "scale-0"}`} strokeWidth={3} />
                </div>
                <span className={`text-xs truncate transition-colors ${isChecked ? "text-slate-900 font-medium" : "text-slate-500 group-hover:text-slate-700"}`}>
                  {p}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Eligibility Toggle */}
      <div className="pt-6 mt-2">
        <label className="flex cursor-pointer gap-3 group bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={filters.hideIneligible ?? false}
              onChange={() => updateFilters({ hideIneligible: !(filters.hideIneligible ?? false) })}
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 block">Smart Filter</span>
            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Hide products above my investment capacity ({formatMoney(maxTicketSize)})</span>
          </div>
        </label>
      </div>
    </div>
  );
}
