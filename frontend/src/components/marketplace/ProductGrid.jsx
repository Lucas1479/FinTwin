import { useMemo } from "react";
import ProductCard from "./ProductCard";

function toDateValue(asOf) {
  if (!asOf) return -Infinity;
  const s = String(asOf).trim();
  const iso = s.length === 7 ? `${s}-01` : s; // "2022-12" -> "2022-12-01"
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : -Infinity;
}

function getSortValue(p, sortField) {
  if (sortField === "title") return (p?.name || "").toLowerCase();
  if (sortField === "provider") return (p?.provider || "").toLowerCase();
  if (sortField === "fees") return typeof p?.fees === "number" ? p.fees : Infinity;
  if (sortField === "asOf") return toDateValue(p?.asOf);

  if (sortField === "score") {
    return typeof p?._score === "number" ? p._score : -Infinity;
  }

  const r1 = p?.returns?.["1y"];
  const r5 = p?.returns?.["5y"];

  if (sortField === "annual") {
    const annual =
      typeof r5 === "number"
        ? r5
        : typeof r1 === "number"
          ? r1
          : null;
    return typeof annual === "number" ? annual : -Infinity;
  }

  if (sortField === "return5y") {
    return typeof r5 === "number" ? r5 : -Infinity;
  }

  // default fall-back => annual
  const annual =
    typeof r5 === "number"
      ? r5
      : typeof r1 === "number"
        ? r1
        : null;
  return typeof annual === "number" ? annual : -Infinity;
}

function cmp(a, b, dir) {
  const mul = dir === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b)) * mul;
}

function makeGroupKey(p, groupBy) {
  if (groupBy === "provider") return p?.provider || "Unknown Provider";
  if (groupBy === "category") return p?.category || "Unknown Category";
  if (groupBy === "asOf") return p?.asOf || "Unknown Time";
  if (groupBy === "alpha") {
    const first = (p?.name || "").trim().charAt(0).toUpperCase();
    return first || "#";
  }
  return "All";
}

export default function ProductGrid({
  products = [],
  compareList = [],
  onToggleCompare = () => {},
  onViewDetails = () => {},
  userInvestmentAmount,

  groupBy = "none",       // none | provider | asOf | alpha | category
  sortField = "annual",   // annual | return5y | fees | title | provider | asOf
  sortDir = "desc",       // asc | desc
  viewMode = "cards",     // cards | list
}) {
  const isCompared = (id) => compareList.includes(id);

  const { groupKeys, groupMap } = useMemo(() => {
    // 1) sort items first
    const sorted = [...products].sort((p1, p2) => {
      const v1 = getSortValue(p1, sortField);
      const v2 = getSortValue(p2, sortField);
      const c1 = cmp(v1, v2, sortDir);
      if (c1 !== 0) return c1;

      // tie-breakers (稳定排序)
      const prov1 = (p1?.provider || "").toLowerCase();
      const prov2 = (p2?.provider || "").toLowerCase();
      const c2 = prov1.localeCompare(prov2);
      if (c2 !== 0) return c2;

      return (p1?.name || "").localeCompare(p2?.name || "");
    });

    // 2) group after sorting
    const gmap = new Map();
    if (groupBy && groupBy !== "none") {
      for (const p of sorted) {
        const k = makeGroupKey(p, groupBy);
        if (!gmap.has(k)) gmap.set(k, []);
        gmap.get(k).push(p);
      }
    } else {
      gmap.set("All", sorted);
    }

    // 3) order group keys
    const keys = Array.from(gmap.keys());
    if (groupBy === "asOf") {
      keys.sort((a, b) => cmp(toDateValue(a), toDateValue(b), sortDir));
    } else if (groupBy === "alpha") {
      keys.sort((a, b) => a.localeCompare(b));
    } else {
      keys.sort((a, b) => a.localeCompare(b));
    }

    return { groupKeys: keys, groupMap: gmap };
  }, [products, sortField, sortDir, groupBy]);

  const renderCards = (items) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          isSelected={isCompared(p.id)}
          onToggleCompare={() => onToggleCompare(p.id)}
          onViewDetails={onViewDetails}
          userInvestmentAmount={userInvestmentAmount}
        />
      ))}
    </div>
  );

  const renderList = (items) => (
    <div className="overflow-x-auto rounded-2xl border border-base-200 bg-base-100">
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="w-12">Cmp</th>
            <th>Fund</th>
            <th>Provider</th>
            <th className="text-right">5Y</th>
            <th className="text-right">Fees</th>
            <th className="text-right">asOf</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={isCompared(p.id)}
                  onChange={() => onToggleCompare(p.id)}
                />
              </td>
              <td className="max-w-[360px] truncate">{p?.name || "—"}</td>
              <td className="max-w-[360px] truncate">{p?.provider || "—"}</td>
              <td className="text-right">
                {typeof p?.returns?.["5y"] === "number" ? `${p.returns["5y"].toFixed(2)}%` : "—"}
              </td>
              <td className="text-right">
                {typeof p?.fees === "number" ? `${p.fees.toFixed(2)}%` : "—"}
              </td>
              <td className="text-right">{p?.asOf || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {groupKeys.map((k) => {
        const items = groupMap.get(k) || [];
        const showGroup = groupBy !== "none";

        // 不分组：只渲染一次，不要出现一堆 accordion
        if (!showGroup) {
          return (
            <div key="all">
              {viewMode === "list" ? renderList(items) : renderCards(items)}
            </div>
          );
        }

        // 分组：用 details 做 accordion（规整、可点开收起）
        return (
          <details key={k} className="rounded-2xl border border-base-200 bg-base-100" open>
            <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
              <div className="font-semibold truncate">{k}</div>
              <div className="text-xs opacity-70">{items.length} items</div>
            </summary>
            <div className="px-4 pb-4">
              {viewMode === "list" ? renderList(items) : renderCards(items)}
            </div>
          </details>
        );
      })}
    </div>
  );
}
