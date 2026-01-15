import React from "react";

const formatPercent = (value) => {
  if (typeof value !== "number") return "—";
  return `${value.toFixed(2)}%`;
};

const formatCurrency = (value) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatScore = (value) => {
  if (typeof value !== "number") return "—";
  return `${value} / 7`;
};

export default function ComparisonModal({ open, onClose, products = [] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Compare Products</h2>
            <p className="text-sm text-slate-500">Side-by-side overview of selected funds.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto px-6 py-5">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-3 pr-4 font-semibold">Metric</th>
                {products.map((p) => (
                  <th key={p.id} className="pb-3 pr-6 font-semibold text-slate-900">
                    <div className="min-w-[180px]">
                      <div className="text-xs uppercase text-slate-400">{p.provider || "Provider"}</div>
                      <div className="text-sm font-semibold text-slate-900">{p.name || "Product"}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">Category</td>
                {products.map((p) => (
                  <td key={`${p.id}-category`} className="py-3 pr-6">
                    {p.category || "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">Risk Level</td>
                {products.map((p) => (
                  <td key={`${p.id}-risk`} className="py-3 pr-6">
                    {p.riskLevel || "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">Risk Score</td>
                {products.map((p) => (
                  <td key={`${p.id}-riskScore`} className="py-3 pr-6">
                    {formatScore(p.riskScore)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">Fees</td>
                {products.map((p) => (
                  <td key={`${p.id}-fees`} className="py-3 pr-6">
                    {formatPercent(p.fees)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">1y Return</td>
                {products.map((p) => (
                  <td key={`${p.id}-1y`} className="py-3 pr-6">
                    {formatPercent(p.returns?.["1y"])}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">5y Return</td>
                {products.map((p) => (
                  <td key={`${p.id}-5y`} className="py-3 pr-6">
                    {formatPercent(p.returns?.["5y"])}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-500">Minimum Investment</td>
                {products.map((p) => (
                  <td key={`${p.id}-min`} className="py-3 pr-6">
                    {formatCurrency(p.minimumInvestment)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
