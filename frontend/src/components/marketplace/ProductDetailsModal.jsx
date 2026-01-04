import React from "react";

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const buildSimulatedSeries = (annualReturnPct = 0, months = 60) => {
  const r = typeof annualReturnPct === "number" ? annualReturnPct : 0;
  const monthly = Math.pow(1 + r / 100, 1 / 12) - 1;
  const points = [];
  let value = 100;
  for (let i = 0; i < months; i++) {
    value *= 1 + monthly;
    points.push(value);
  }
  return points;
};

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function ProductDetailsModal({ product, open, onClose, loading = false }) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [showImage, setShowImage] = React.useState(
    Boolean(product?.providerLogo),
  );

  React.useEffect(() => {
    if (open) {
      setActiveTab("overview");
    }
    setShowImage(Boolean(product?.providerLogo));
  }, [open, product]);

  if (!open || !product) {
    return null;
  }

  const holdings = Array.isArray(product.topHoldings) ? product.topHoldings : [];
  const fundManager = product.fundManager || product.provider;
  const asOfDate = formatDate(product.asOfDate || product.topHoldingsAsOf);
  const holdingsAsOf = formatDate(product.topHoldingsAsOf || product.asOfDate);
  const dataSource = product.dataSource || "Disclose Register";
  const feeTotal = typeof product?.fees === "number" ? product.fees : null;
  const riskScore = typeof product?.riskScore === "number" ? product.riskScore : null;
  const simAnnual = product?.returns?.["5y"] ?? product?.returns?.["1y"] ?? null;
  const simSeries = buildSimulatedSeries(simAnnual);

  const renderSparkline = (series) => {
    if (!series || series.length === 0) return null;
    const w = 240;
    const h = 80;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const points = series.map((v, idx) => {
      const x = (idx / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={points} />
        <polyline fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="8" points={points} />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
              {showImage && product.providerLogo ? (
                <img
                  src={product.providerLogo}
                  alt={product.provider}
                  className="h-full w-full object-cover"
                  onError={() => setShowImage(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                  {(product.provider ?? "PF").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{product.provider}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                {dataSource && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    Source: {dataSource}
                  </span>
                )}
                {asOfDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1">
                    As of: {asOfDate}
                  </span>
                )}
                {holdingsAsOf && holdingsAsOf !== asOfDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-3 py-1">
                    Holdings as of: {holdingsAsOf}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-6 pt-2">
          <nav className="flex gap-6 text-sm">
            {["overview", "performance", "fees"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`border-b-2 pb-2 capitalize ${
                  activeTab === key
                    ? "border-sky-500 font-semibold text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {key === "fees" ? "Fees & Documents" : key}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-4 text-sm">
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></span>
              Loading detailed info...
            </div>
          )}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Fund Strategy</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {product.strategy ||
                    product.description ||
                    "Strategy description is not available for this product yet."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Top Holdings</h3>
                {holdings.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Top holdings data is not available for this product.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {holdings.map((holding, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="text-sm text-slate-800">
                          {holding?.name || holding || "Unknown"}
                          {typeof holding?.percent === "number" && (
                            <span className="ml-1 text-slate-500">({holding.percent}%)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Fund Manager</h3>
                <p className="mt-2 text-sm text-slate-700">
                  {fundManager || "Not specified"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Disclosures & Documents</h3>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p className="text-slate-600">
                    Source: {dataSource || "N/A"}; As of: {asOfDate || "N/A"}; Imported: {product.lastUpdated ? formatDate(product.lastUpdated) : "N/A"}
                  </p>
                  {Array.isArray(product.documents) && product.documents.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {product.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc?.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          {doc?.label || "Document"}
                          {doc?.note && <span className="text-slate-500">({doc.note})</span>}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">暂无可下载文件</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Fees (p.a.)</h4>
                  <p className="text-xs text-slate-500 mt-1">Total fund fees as disclosed</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div
                      className="relative w-24 h-24 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800"
                      style={{
                        background: feeTotal !== null
                          ? `conic-gradient(#6366f1 ${Math.min(Math.max(feeTotal, 0), 3) / 3 * 100}%, #e2e8f0 0)`
                          : "#e2e8f0"
                      }}
                    >
                      <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
                        {feeTotal !== null ? `${feeTotal.toFixed(2)}%` : "—"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 leading-5">
                      <p>Gauge scaled to 3% max for visual clarity.</p>
                      <p className="text-slate-500">Includes performance/admin fees where available.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Risk Indicator</h4>
                  <p className="text-xs text-slate-500 mt-1">FMA RI 1–7, higher = more volatility</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-1">
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-3 rounded-full ${riskScore && riskScore > idx ? "bg-indigo-500" : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {riskScore ? `RI ${riskScore} / 7 (${product?.riskLevel || "N/A"})` : "Not disclosed"}
                    </div>
                    <p className="text-xs text-slate-500">
                      Default mapping: Defensive(1) / Conservative(2-3) / Balanced(4) / Growth(5) / Aggressive(6-7).
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Simulated Growth Curve</h4>
                  <p className="text-xs text-slate-500 mt-1">Illustrative path using annual return (not actual NAV)</p>
                  <div className="mt-3">
                    {simAnnual !== null ? renderSparkline(simSeries) : (
                      <div className="h-20 flex items-center justify-center text-sm text-slate-500">No return data</div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Computed from {typeof product?.returns?.["5y"] === "number" ? "5-year" : "1-year"} return, compounded monthly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  label="1-Year Return"
                  value={
                    typeof product?.returns?.["1y"] === "number"
                      ? `${product.returns["1y"].toFixed(2)}%`
                      : "—"
                  }
                />
                <InfoRow
                  label="5-Year Return"
                  value={
                    typeof product?.returns?.["5y"] === "number"
                      ? `${product.returns["5y"].toFixed(2)}%`
                      : "—"
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <InfoRow
                label="Total Fees"
                value={
                  typeof product?.fees === "number"
                    ? `${product.fees.toFixed(2)}% p.a.`
                    : "—"
                }
              />
              <p className="text-sm text-slate-600">
                Fee information here is for illustration only and may not include all
                transaction or performance-based fees. Always check the latest Product
                Disclosure Statement for full fee details.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Use this Strategy
          </button>
        </div>
      </div>
    </div>
  );
}


