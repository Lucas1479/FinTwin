import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import FilterPanel from "../components/marketplace/FilterPanel";
import ProductGrid from "../components/marketplace/ProductGrid";
import ComparisonDock from "../components/marketplace/ComparisonDock";
import ProductDetailsModal from "../components/marketplace/ProductDetailsModal";
import api, { fetchCurrentUserProfile, fetchProducts } from "../utils/api";
import { scoreProduct } from "../utils/scoring";

const clampNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function applyFilters(products, filters, profile) {
  let list = [...products];

  // Category
  if (filters.category && filters.category !== "All") {
    list = list.filter((p) => p?.category === filters.category);
  }

  // Risk levels
  if (Array.isArray(filters.riskLevels) && filters.riskLevels.length > 0) {
    list = list.filter((p) => filters.riskLevels.includes(p?.riskLevel));
  }

  // Providers
  if (Array.isArray(filters.providers) && filters.providers.length > 0) {
    list = list.filter((p) => filters.providers.includes(p?.provider));
  }

  // Min 5y return
  const min5y = clampNumber(filters.minReturn5y, 0);
  list = list.filter(
    (p) => clampNumber(p?.returns?.["5y"], -Infinity) >= min5y
  );

  // Max fee
  const maxFee = clampNumber(filters.maxFee, 2.0);
  list = list.filter((p) => clampNumber(p?.fees, Infinity) <= maxFee);

  // Eligibility: hide products with minimumInvestment well above user's capacity
  const hideIneligible = filters.hideIneligible ?? true;
  const capacity = clampNumber(profile?.maxTicketSize, 0) || Infinity;
  if (hideIneligible && Number.isFinite(capacity) && capacity > 0) {
    list = list.filter((p) => {
      const minInv = clampNumber(p?.minimumInvestment, 0);
      return minInv === 0 || minInv <= capacity;
    });
  }

  // Search (fund name or provider)
  const q = (filters.search || "").trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p?.name || "").toLowerCase();
      const provider = (p?.provider || "").toLowerCase();
      return name.includes(q) || provider.includes(q);
    });
  }

  // De-duplicate by provider + name (ignore category) to reduce noisy duplicates
  const unique = new Map();
  for (const p of list) {
    const key = `${(p?.provider || "").trim().toLowerCase()}::${(p?.name || "")
      .trim()
      .toLowerCase()}`;
    if (!unique.has(key)) {
      unique.set(key, p);
    }
  }

  list = Array.from(unique.values());

  // Attach a smart score for downstream sorting (shared with Dashboard)
  if (profile) {
    list = list.map((p) => {
      const scored = scoreProduct(p, profile);
      return { ...p, _score: scored.score, _annual: scored.annual };
    });
  }

  return list;
}

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    riskTolerance: "Balanced",
  });

  const [filters, setFilters] = useState({
    category: "All",
    groupBy: "none",
    sortField: "annual",
    sortDir: "desc",
    riskLevels: [],
    providers: [],
    minReturn5y: 0,
    maxFee: 2.0,
    search: "",
    hideIneligible: true,
  });

  const [compareList, setCompareList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [productsResult, userResult] = await Promise.allSettled([
          fetchProducts(),
          fetchCurrentUserProfile(),
        ]);

        if (!isMounted) return;

        if (productsResult.status === "fulfilled") {
          setProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
        } else {
          setError("Failed to load products. Please try again later.");
          // eslint-disable-next-line no-console
          console.error(productsResult.reason);
        }

        if (userResult.status === "fulfilled") {
          const user = userResult.value || {};
          setProfile((prev) => ({
            ...prev,
            riskTolerance: user.riskTolerance || prev.riskTolerance,
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load data. Please try again later.");
          // eslint-disable-next-line no-console
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // 当筛选条件变化时，将可见数量重置为第一页（避免上一页“View more”的状态污染新结果）
  useEffect(() => {
    setVisibleCount(12);
  }, [filters]);

  const providerOptions = useMemo(() => {
    const set = new Set(products.map((p) => p?.provider).filter(Boolean));
    return Array.from(set).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [products]);

  const maxTicketSize = useMemo(() => {
    if (profile?.income && Number.isFinite(profile.income)) {
      // Rough heuristic: up to 25% of annual income in a single product, min 20k
      return Math.max(20000, profile.income * 0.25);
    }
    // Fallback: roughly two years of default monthly contributions (1000)
    return 24000;
  }, [profile]);

  const filteredProducts = useMemo(
    () => applyFilters(products, filters, { ...profile, maxTicketSize }),
    [products, filters, profile, maxTicketSize]
  );

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const handleToggleCompare = (id) => {
    setCompareList((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl animate-fade-in px-4 pb-28 pt-8">
        {/* Header */}
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <ShoppingBag size={28} />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">
                Marketplace
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Browse, filter, and compare investment products using a curated
                snapshot dataset.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              MVP
            </span>
          </div>

          {/* Content */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Left: Filters */}
            <div className="lg:col-span-1">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                providers={providerOptions}
                maxTicketSize={maxTicketSize}
              />
            </div>

            {/* Right: Product Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-600">
                  Loading products...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-800">
                  {error}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
                  <div className="text-lg font-semibold text-slate-900">
                    No products match your criteria
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Try loosening the filters or clearing some options.
                  </div>
                </div>
              ) : (
                <>
                  <div id="marketplace-grid-top">
                    <ProductGrid
                      products={visibleProducts}
                      compareList={compareList}
                      onToggleCompare={handleToggleCompare}
                      groupBy={filters.groupBy}
                      sortField={filters.sortField}
                      sortDir={filters.sortDir}
                      viewMode="cards"
                      onViewDetails={setSelectedProduct}
                      userInvestmentAmount={maxTicketSize}
                    />
                  </div>

                  {filteredProducts.length > 12 && (
                    <div className="mt-6 flex justify-center gap-3">
                      {visibleCount < filteredProducts.length && (
                        <button
                          type="button"
                          className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                          onClick={() =>
                            setVisibleCount((prev) =>
                              Math.min(prev + 9, filteredProducts.length)
                            )
                          }
                        >
                          View more ({filteredProducts.length - visibleCount} more)
                        </button>
                      )}

                      {visibleCount > 12 && (
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setVisibleCount(12);
                            const el = document.getElementById(
                              "marketplace-grid-top"
                            );
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                        >
                          View less
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Compare Dock */}
        <ComparisonDock
          compareList={compareList}
          products={products}
          onClear={() => setCompareList([])}
        />

        {/* Details Modal */}
        <ProductDetailsModal
          product={selectedProduct}
          open={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
        />
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
