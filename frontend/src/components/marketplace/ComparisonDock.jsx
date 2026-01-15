export default function ComparisonDock({ compareList, products, onClear, onCompare }) {
    if (!compareList || compareList.length === 0) return null;
  
    const selected = compareList
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);
  
    return (
      <div className="fixed bottom-4 left-0 right-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-2xl bg-base-100 px-4 py-3 shadow">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Compare</span>
            <span className="badge badge-neutral">{selected.length}/3</span>
          </div>
  
          <div className="flex flex-1 items-center gap-2 overflow-x-auto px-2">
            {selected.map((p) => (
              <span key={p.id} className="badge badge-outline whitespace-nowrap">
                {p.provider}: {p.name}
              </span>
            ))}
          </div>
  
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-ghost" onClick={onClear}>
              Clear all
            </button>
            <button className="btn btn-sm btn-primary" disabled={selected.length < 2} onClick={onCompare}>
              Compare ({selected.length}/3)
            </button>
          </div>
        </div>
      </div>
    );
  }
  