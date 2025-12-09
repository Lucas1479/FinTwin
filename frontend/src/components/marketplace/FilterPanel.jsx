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
  
    // UI-friendly labels, but keep internal values stable for filtering
    const CATEGORY_OPTIONS = [
      { value: "All", label: "All" },
      { value: "KiwiSaver", label: "KiwiSaver" },
      { value: "ManagedFund", label: "Managed Funds" },
      { value: "TermDeposit", label: "Term Deposits" },
    ];
  
    const groupByValue = filters.groupBy ?? "none";          // "none" | "provider" | "alpha" | "asOf"
    const sortFieldValue = filters.sortField ?? "annual";    // "annual" | "return5y" | "fees" | "title" | "provider" | "asOf" | "score"
    const sortDirValue = filters.sortDir ?? "desc";          // "asc" | "desc"
  
    return (
      <div className="rounded-2xl bg-base-100 p-4 shadow">
        <div className="text-sm font-semibold">Filters</div>
  
        {/* Category */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium opacity-70">Category</div>
          <div className="join flex flex-wrap">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`btn join-item btn-sm ${
                  (filters.category ?? "All") === opt.value ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => updateFilters({ category: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
  
        {/* Search (如果你上层已有 search 字段，这里只是UI控制它；没有也不会报错) */}
        {"search" in (filters ?? {}) && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium opacity-70">Search</div>
            <input
              className="input input-bordered input-sm w-full"
              placeholder="Find provider or product..."
              value={filters.search ?? ""}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>
        )}
  
        {/* Group By / Display grouping */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Group by</div>
          <select
            className="select select-bordered select-sm w-full"
            value={groupByValue}
            onChange={(e) => updateFilters({ groupBy: e.target.value })}
          >
            <option value="none">None</option>
            <option value="provider">Provider</option>
            <option value="alpha">Title (A–Z)</option>
            <option value="asOf">As-of Date</option>
          </select>
        </div>
  
        {/* Sort Field + Sort Direction */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Sort</div>
  
          <div className="grid grid-cols-1 gap-2">
            <select
              className="select select-bordered select-sm w-full"
              value={sortFieldValue}
              onChange={(e) => updateFilters({ sortField: e.target.value })}
            >
              <option value="annual">Annual Return</option>
              <option value="return5y">5-Year Return</option>
              <option value="fees">Total Fees</option>
              <option value="score">Smart Score (Recommended)</option>
              <option value="title">Title (Fund Name)</option>
              <option value="provider">Provider</option>
              <option value="asOf">As-of Date</option>
            </select>
  
            <div className="join w-full">
              <button
                type="button"
                className={`btn join-item btn-sm w-1/2 ${
                  sortDirValue === "desc" ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => updateFilters({ sortDir: "desc" })}
              >
                Descending
              </button>
              <button
                type="button"
                className={`btn join-item btn-sm w-1/2 ${
                  sortDirValue === "asc" ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => updateFilters({ sortDir: "asc" })}
              >
                Ascending
              </button>
            </div>
          </div>
        </div>
  
        {/* Risk profile */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Risk profile</div>
          <div className="flex flex-wrap gap-2">
            {["Conservative", "Balanced", "Growth", "Aggressive"].map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={(filters.riskLevels ?? []).includes(r)}
                  onChange={() => toggle("riskLevels", r)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>
  
        {/* Provider */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Provider</div>
          <div className="max-h-44 overflow-auto rounded-lg border border-base-300 p-2">
            {(providers ?? []).map((p) => (
              <label key={p} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={(filters.providers ?? []).includes(p)}
                  onChange={() => toggle("providers", p)}
                />
                {p}
              </label>
            ))}
          </div>
        </div>
  
        {/* Min 5-Year Return */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Min 5-Year Return (%)</div>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={filters.minReturn5y ?? 0}
            onChange={(e) => updateFilters({ minReturn5y: Number(e.target.value) })}
            className="range range-xs"
          />
          <div className="mt-1 text-xs opacity-70">{filters.minReturn5y ?? 0}%</div>
        </div>
  
        {/* Max Fee */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium opacity-70">Max Fee (%)</div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={filters.maxFee ?? 2}
            onChange={(e) => updateFilters({ maxFee: Number(e.target.value) })}
            className="range range-xs"
          />
          <div className="mt-1 text-xs opacity-70">{filters.maxFee ?? 2}%</div>
        </div>

        {/* Eligibility toggle */}
        <div className="mt-5 border-t border-base-200 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={filters.hideIneligible ?? true}
              onChange={() =>
                updateFilters({ hideIneligible: !(filters.hideIneligible ?? true) })
              }
            />
            Hide products above my capacity
          </label>
          {typeof maxTicketSize === "number" && (
            <p className="mt-1 text-[11px] text-slate-500">
              Approximate single-ticket capacity:{" "}
              <span className="font-semibold">{formatMoney(maxTicketSize)}</span>.
            </p>
          )}
        </div>
      </div>
    );
  }
  