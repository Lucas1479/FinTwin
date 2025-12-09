import React from "react";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function ProductDetailsModal({ product, open, onClose }) {
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
                        <span className="text-sm text-slate-800">{holding}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Fund Manager</h3>
                <p className="mt-2 text-sm text-slate-700">
                  {product.fundManager || "Not specified"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Performance charts are simplified for this MVP. Use the annual and 5-year
                returns as a guide and consult official documents for full performance
                history.
              </p>

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


