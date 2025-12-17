import { LayoutGrid, List as ListIcon } from "lucide-react";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products = [],
  compareList = [],
  onToggleCompare = () => {},
  onViewDetails = () => {},
  userInvestmentAmount,
  viewMode = "cards", // "cards" | "list"
}) {
  const isCompared = (id) => compareList.includes(id);

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Compare</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4 text-right">5Y Return</th>
                <th className="px-6 py-4 text-right">Total Fees</th>
                <th className="px-6 py-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr 
                  key={p.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    // Don't trigger if clicking checkbox
                    if (e.target.type !== 'checkbox') onViewDetails(p);
                  }}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      checked={isCompared(p.id)}
                      onChange={() => onToggleCompare(p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4">{p.provider}</td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    (p.returns?.['5y'] || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {typeof p.returns?.['5y'] === 'number' ? `${p.returns['5y']}%` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {typeof p.fees === 'number' ? `${p.fees}%` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.riskScore <= 2 ? 'bg-emerald-100 text-emerald-800' :
                      p.riskScore <= 4 ? 'bg-blue-100 text-blue-800' :
                      p.riskScore <= 5 ? 'bg-orange-100 text-orange-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {p.riskScore}/7
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Card View
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {products.map((p) => (
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
}
