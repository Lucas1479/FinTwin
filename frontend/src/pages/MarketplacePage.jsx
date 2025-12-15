import { useEffect, useMemo, useState, useCallback } from "react";
import { ShoppingBag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import FilterPanel from "../components/marketplace/FilterPanel";
import ProductGrid from "../components/marketplace/ProductGrid";
import ComparisonDock from "../components/marketplace/ComparisonDock";
import ProductDetailsModal from "../components/marketplace/ProductDetailsModal";
import productService from "../services/productService";
import { fetchCurrentUserProfile } from "../utils/api";
import { scoreProduct } from "../utils/scoring";

// ==========================================
// Constants
// ==========================================

const PAGE_SIZE = 100; // Products per page (API request)
const DISPLAY_PER_PAGE = 24; // Products displayed per page on frontend

// ==========================================
// Utility Functions
// ==========================================

const clampNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Apply client-side filters to products
 */
function applyFilters(products, filters, profile) {
  let list = [...products];

  // Category filter
  if (filters.category && filters.category !== "All") {
    list = list.filter((p) => p?.category === filters.category);
  }

  // Risk levels filter
  if (Array.isArray(filters.riskLevels) && filters.riskLevels.length > 0) {
    list = list.filter((p) => filters.riskLevels.includes(p?.riskLevel));
  }

  // Providers filter
  if (Array.isArray(filters.providers) && filters.providers.length > 0) {
    list = list.filter((p) => filters.providers.includes(p?.provider));
  }

  // Min 5-year return filter
  const min5y = clampNumber(filters.minReturn5y, -100);
  list = list.filter(
    (p) => clampNumber(p?.returns?.["5y"], -Infinity) >= min5y
  );

  // Max fee filter
  const maxFee = clampNumber(filters.maxFee, 10.0);
  list = list.filter((p) => clampNumber(p?.fees, Infinity) <= maxFee);

  // Eligibility filter
  const hideIneligible = filters.hideIneligible ?? false;
  const capacity = clampNumber(profile?.maxTicketSize, 0) || Infinity;
  if (hideIneligible && Number.isFinite(capacity) && capacity > 0) {
    list = list.filter((p) => {
      const minInv = clampNumber(p?.minimumInvestment, 0);
      return minInv === 0 || minInv <= capacity;
    });
  }

  // Search filter
  const q = (filters.search || "").trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p?.name || "").toLowerCase();
      const provider = (p?.provider || "").toLowerCase();
      return name.includes(q) || provider.includes(q);
    });
  }

  // De-duplicate by provider + name
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

  // Attach smart score
  if (profile) {
    list = list.map((p) => {
      const scored = scoreProduct(p, profile);
      return { ...p, _score: scored.score, _annual: scored.annual };
    });
  }

  return list;
}

// ==========================================
// Pagination Component
// ==========================================

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1">
      {/* First page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title="First page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Previous page */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1 px-2">
        {pageNumbers[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              1
            </button>
            {pageNumbers[0] > 2 && <span className="px-1 text-slate-400">...</span>}
          </>
        )}

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-1 text-slate-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      {/* Next page */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Next page"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last page */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Last page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
};

// ==========================================
// Main Component
// ==========================================

const MarketplacePage = () => {
  // Data states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({ riskTolerance: "Balanced" });

  // Pagination states (API level)
  const [apiPage, setApiPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);

  // Display pagination (client-side within loaded data)
  const [displayPage, setDisplayPage] = useState(1);

  // Filter states
  const [filters, setFilters] = useState({
    category: "All",
    groupBy: "none",
    sortField: "annual",
    sortDir: "desc",
    riskLevels: [],
    providers: [],
    minReturn5y: -100,
    maxFee: 10.0,
    search: "",
    hideIneligible: false,
  });

  // UI states
  const [compareList, setCompareList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ==========================================
  // Data Loading
  // ==========================================

  const loadPage = useCallback(async (page) => {
    try {
      setLoading(true);
      setError("");

      const { products: fetchedProducts, pagination } = await productService.getProducts({
        page,
        limit: PAGE_SIZE,
      });

      setProducts(fetchedProducts);
      setTotalProducts(pagination.total);
      setApiTotalPages(pagination.pages);
      setApiPage(page);
      setDisplayPage(1); // Reset display page when API page changes

    } catch (err) {
      setError("Failed to load products. Please try again later.");
      console.error("[Marketplace] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      const [, userResult] = await Promise.allSettled([
        loadPage(1),
        fetchCurrentUserProfile(),
      ]);

      if (!isMounted) return;

      if (userResult.status === "fulfilled") {
        const user = userResult.value || {};
        setProfile((prev) => ({
          ...prev,
          riskTolerance: user.riskTolerance || prev.riskTolerance,
          income: user.income,
        }));
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, [loadPage]);

  // Reset display page when filters change
  useEffect(() => {
    setDisplayPage(1);
  }, [filters]);

  // ==========================================
  // Computed Values
  // ==========================================

  const providerOptions = useMemo(() => {
    const set = new Set(products.map((p) => p?.provider).filter(Boolean));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [products]);

  const maxTicketSize = useMemo(() => {
    if (profile?.income && Number.isFinite(profile.income)) {
      return Math.max(20000, profile.income * 0.25);
    }
    return 24000;
  }, [profile]);

  // Apply client-side filters
  const filteredProducts = useMemo(
    () => applyFilters(products, filters, { ...profile, maxTicketSize }),
    [products, filters, profile, maxTicketSize]
  );

  // Calculate display pagination
  const displayTotalPages = Math.ceil(filteredProducts.length / DISPLAY_PER_PAGE);
  
  // Get products for current display page
  const displayProducts = useMemo(() => {
    const start = (displayPage - 1) * DISPLAY_PER_PAGE;
    const end = start + DISPLAY_PER_PAGE;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, displayPage]);

  // Calculate showing range
  const showingStart = filteredProducts.length === 0 ? 0 : (displayPage - 1) * DISPLAY_PER_PAGE + 1;
  const showingEnd = Math.min(displayPage * DISPLAY_PER_PAGE, filteredProducts.length);

  // ==========================================
  // Event Handlers
  // ==========================================

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

  const handleDisplayPageChange = (newPage) => {
    setDisplayPage(newPage);
    // Scroll to top of grid
    document.getElementById("marketplace-grid-top")?.scrollIntoView({ 
      behavior: "smooth", 
      block: "start" 
    });
  };

  const handleApiPageChange = (newPage) => {
    loadPage(newPage);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==========================================
  // Render
  // ==========================================

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
              <h1 className="text-3xl font-bold text-slate-900">Marketplace</h1>
              <p className="mt-2 text-sm text-slate-600">
                Browse, filter, and compare investment products from our curated database.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
                {totalProducts.toLocaleString()} Products
              </span>
            </div>
          </div>

          {/* Content Grid */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Left: Sticky Filters */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-4">
                <FilterPanel
                  filters={filters}
                  setFilters={setFilters}
                  providers={providerOptions}
                  maxTicketSize={maxTicketSize}
                />
              </div>
            </div>

            {/* Right: Product Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500"></div>
                  <p className="mt-4 text-sm text-slate-600">Loading products...</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
                  <p className="text-sm text-rose-800">{error}</p>
                  <button
                    onClick={() => loadPage(1)}
                    className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Retry
                  </button>
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
                  {/* Results info bar */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold text-slate-900">{showingStart}-{showingEnd}</span> of{" "}
                      <span className="font-semibold text-slate-900">{filteredProducts.length}</span> products
                      <span className="text-slate-400"> ({totalProducts.toLocaleString()} in database)</span>
                    </div>
                    
                    {/* API Page selector (for large datasets) */}
                    {apiTotalPages > 1 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Data batch:</span>
                        <select
                          value={apiPage}
                          onChange={(e) => handleApiPageChange(Number(e.target.value))}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          {Array.from({ length: apiTotalPages }, (_, i) => i + 1).map((p) => (
                            <option key={p} value={p}>
                              {(p - 1) * PAGE_SIZE + 1} - {Math.min(p * PAGE_SIZE, totalProducts)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Product grid */}
                  <div id="marketplace-grid-top">
                    <ProductGrid
                      products={displayProducts}
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

                  {/* Pagination */}
                  <div className="mt-8">
                    <Pagination
                      currentPage={displayPage}
                      totalPages={displayTotalPages}
                      onPageChange={handleDisplayPageChange}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Dock */}
        <ComparisonDock
          compareList={compareList}
          products={products}
          onClear={() => setCompareList([])}
        />

        {/* Product Details Modal */}
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
