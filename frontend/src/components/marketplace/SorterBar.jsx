import { ArrowDownAZ, ArrowUpAZ, LayoutGrid, List, ChevronDown, Search } from "lucide-react";

export default function SorterBar({ 
  totalCount, 
  showingStart, 
  showingEnd, 
  sortField, 
  sortDir, 
  onSortChange, 
  onSortDirChange,
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchChange
}) {
  const sortOptions = [
    { value: "annual", label: "Annual Return" },
    { value: "return5y", label: "5-Year Return" },
    { value: "fees", label: "Total Fees" },
    { value: "riskScore", label: "Risk Score" },
    { value: "title", label: "Name" }
  ];

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
      
      {/* Left: Count Badge */}
      <div className="flex items-center gap-2 xl:flex-1">
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full shadow-sm whitespace-nowrap">
          {totalCount} Items
        </span>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          ({showingStart}-{showingEnd})
        </span>
      </div>

      {/* Middle: Search Bar */}
      <div className="flex-1 flex justify-center w-full xl:w-auto order-last xl:order-none">
        <div className="relative group w-full xl:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search funds..."
            className="block w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-3 xl:flex-1">
        {/* Sort Dropdown */}
        <div className="relative group flex-1 sm:flex-none">
          <div className="flex items-center justify-between sm:justify-start bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer min-w-[140px]">
            <span className="text-xs text-slate-400 mr-2 font-medium uppercase tracking-wider">Sort</span>
            <div className="flex items-center">
              <select
                value={sortField}
                onChange={(e) => onSortChange(e.target.value)}
                className="appearance-none bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-full text-right sm:text-left"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="ml-1 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Direction Toggle */}
        <button
          onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
        >
          {sortDir === "asc" ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
        </button>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => onViewModeChange("cards")}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              viewMode === "cards" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              viewMode === "list" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
