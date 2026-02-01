import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import InfoTooltip from "../components/common/InfoTooltip"; // Import Tooltip
import { HELP_ANCHORS } from "../constants/helpAnchors"; // Import Registry
import FilterPanel from "../components/marketplace/FilterPanel";
import HorizontalFilterBar from "../components/marketplace/HorizontalFilterBar";
import SorterBar from "../components/marketplace/SorterBar";
import ProductGrid from "../components/marketplace/ProductGrid";
import ComparisonDock from "../components/marketplace/ComparisonDock";
import ComparisonModal from "../components/marketplace/ComparisonModal";
import ProductDetailsModal from "../components/marketplace/ProductDetailsModal";
import productService from "../services/productService";
import { getUserProfile } from "../services/userService";
import { scoreProduct } from "../utils/scoring";
import { useSidebar } from "../context/SidebarContext";

const PAGE_SIZE = 2000; 
const DISPLAY_PER_PAGE = 12; // Reduced for less scrolling

const clampNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function processProducts(products, filters, profile) {
  let list = [...products];

  // 1. Filtering (Same logic as before)
  if (filters.category && filters.category !== "All") {
    list = list.filter((p) => p?.category === filters.category);
  }
  if (Array.isArray(filters.riskLevels) && filters.riskLevels.length > 0) {
    list = list.filter((p) => filters.riskLevels.includes(p?.riskLevel));
  }
  if (Array.isArray(filters.providers) && filters.providers.length > 0) {
    list = list.filter((p) => filters.providers.includes(p?.provider));
  }
  const min5y = clampNumber(filters.minReturn5y, -100);
  if (min5y > -100) {
    list = list.filter((p) => clampNumber(p?.returns?.["5y"], -Infinity) >= min5y);
  }
  
  const maxFee = clampNumber(filters.maxFee, 10.0);
  if (maxFee < 10.0) {
    list = list.filter((p) => clampNumber(p?.fees, Infinity) <= maxFee);
  }

  const hideIneligible = filters.hideIneligible ?? false;
  const capacity = clampNumber(profile?.maxTicketSize, 0) || Infinity;
  if (hideIneligible && Number.isFinite(capacity) && capacity > 0) {
    list = list.filter((p) => {
      const minInv = clampNumber(p?.minimumInvestment, 0);
      return minInv === 0 || minInv <= capacity;
    });
  }

  const q = (filters.search || "").trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const name = (p?.name || "").toLowerCase();
      const provider = (p?.provider || "").toLowerCase();
      return name.includes(q) || provider.includes(q);
    });
  }

  // De-duplicate (Removed: Trust backend to return unique IDs)
  // const unique = new Map();
  // for (const p of list) {
  //   const key = `${(p?.provider || "").trim().toLowerCase()}::${(p?.name || "").trim().toLowerCase()}`;
  //   if (!unique.has(key)) unique.set(key, p);
  // }
  // list = Array.from(unique.values());

  // Attach smart score
  if (profile) {
    list = list.map((p) => {
      const scored = scoreProduct(p, profile);
      return { ...p, _score: scored.score, _annual: scored.annual };
    });
  }

  // 2. Sorting (Same logic)
  const sortField = filters.sortField || "annual";
  const sortDir = filters.sortDir || "desc";
  const dir = sortDir === "desc" ? -1 : 1;

  list.sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case "annual":
        // Use same logic as ProductCard display: prefer 5y, fallback to 1y
        valA = a.returns?.["5y"] ?? a.returns?.["1y"] ?? -Infinity;
        valB = b.returns?.["5y"] ?? b.returns?.["1y"] ?? -Infinity;
        break;
      case "return5y":
        valA = a.returns?.["5y"] ?? -Infinity;
        valB = b.returns?.["5y"] ?? -Infinity;
        break;
      case "fees":
        valA = a.fees ?? Infinity;
        valB = b.fees ?? Infinity;
        break;
      case "riskScore":
        valA = a.riskScore ?? 0;
        valB = b.riskScore ?? 0;
        break;
      case "title":
        valA = a.name?.toLowerCase() ?? "";
        valB = b.name?.toLowerCase() ?? "";
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      default:
        valA = 0;
        valB = 0;
    }
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });

  return list;
}

// ... (Pagination Component - Unchanged logic, just styling tweaks) ...
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page) => (
          <button key={page} onClick={() => onPageChange(page)} className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === currentPage ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"}`}>
            {page}
          </button>
        ))}
      </div>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  );
};

const MarketplacePage = () => {
  const { isCollapsed } = useSidebar();
  // ... (State logic unchanged) ...
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({ riskTolerance: "Balanced" });
  const [apiPage, setApiPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [displayPage, setDisplayPage] = useState(1);
  const [viewMode, setViewMode] = useState("cards");
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
  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ... (Load logic unchanged) ...
  const loadPage = useCallback(async (page) => {
    try {
      setLoading(true);
      setError("");
      const { products: fetchedProducts, pagination } = await productService.getProducts({
        page,
        limit: PAGE_SIZE, // Full load
      });
      setProducts(fetchedProducts);
      setTotalProducts(fetchedProducts.length);
      
      // DEBUG: Check category distribution
      const catCounts = {};
      fetchedProducts.forEach(p => {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      });
      console.log("Product Categories Loaded:", catCounts);

      setDisplayPage(1);
    } catch (err) {
      setError("Failed to load products.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const [, userResult] = await Promise.allSettled([
        loadPage(1),
        getUserProfile(),
      ]);
      if (isMounted && userResult.status === "fulfilled") {
        const payload = userResult.value?.data || userResult.value || {};
        setProfile(p => ({ ...p, ...payload }));
      }
    };
    init();
    return () => { isMounted = false; };
  }, [loadPage]);

  useEffect(() => { setDisplayPage(1); }, [filters]);

  useEffect(() => {
    if (compareList.length < 2) {
      setCompareOpen(false);
    }
  }, [compareList.length]);

  // ... (Computed values unchanged) ...
  const providerOptions = useMemo(() => {
    const set = new Set(products.map((p) => p?.provider).filter(Boolean));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [products]);

  const maxTicketSize = useMemo(() => {
    if (profile?.income && Number.isFinite(profile.income)) return Math.max(20000, profile.income * 0.25);
    return 24000;
  }, [profile]);

  const processedProducts = useMemo(() => processProducts(products, filters, { ...profile, maxTicketSize }), [products, filters, profile, maxTicketSize]);
  const displayTotalPages = Math.ceil(processedProducts.length / DISPLAY_PER_PAGE);
  const displayProducts = useMemo(() => {
    const start = (displayPage - 1) * DISPLAY_PER_PAGE;
    const end = start + DISPLAY_PER_PAGE;
    return processedProducts.slice(start, end);
  }, [processedProducts, displayPage]);

  const showingStart = processedProducts.length === 0 ? 0 : (displayPage - 1) * DISPLAY_PER_PAGE + 1;
  const showingEnd = Math.min(displayPage * DISPLAY_PER_PAGE, processedProducts.length);

  // ... (Handlers unchanged) ...
  const handleToggleCompare = (id) => setCompareList((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  const handleDisplayPageChange = (newPage) => { setDisplayPage(newPage); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleSortChange = (field) => setFilters(f => ({ ...f, sortField: field }));
  const handleSortDirChange = (dir) => setFilters(f => ({ ...f, sortDir: dir }));

  // Detail fetch on demand to keep list payload light
  const handleViewDetails = useCallback(async (product) => {
    if (!product?.id) return;
    // Optimistically show the list-level data first
    setSelectedProduct(product);
    setDetailsLoading(true);
    try {
      const full = await productService.getProductById(product.id);
      setSelectedProduct(full || product);
    } catch (err) {
      console.error("[Marketplace] Failed to load product detail", err);
      // keep the basic data but stop loading
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // ==========================================
  // Render (UPDATED RESPONSIVE UI)
  // ==========================================

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1600px] px-6 py-8 pb-32">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Marketplace</h1>
                <InfoTooltip 
                    content="Products are rated 1-7 (Defensive to Aggressive). The AI matches these to your Risk DNA."
                    anchor={HELP_ANCHORS.MARKETPLACE.RISK_LEVELS} 
                />
            </div>
            <p className="mt-1 text-slate-500 text-sm">Discover investment opportunities tailored for you</p>
          </div>
        </div>

        {/* Main Grid: Filters + Content */}
        {/* Changed from lg to xl breakpoint for sidebar layout */}
        <div className={`grid grid-cols-1 gap-8 ${isCollapsed ? '2xl:grid-cols-[280px_1fr]' : ''}`}>
          
          {/* Left: Filter Panel (Only visible on 2XL screens) */}
          {isCollapsed && (
            <div className="hidden 2xl:block relative">
              <div className="sticky top-24 space-y-6">
                <FilterPanel
                  filters={filters}
                  setFilters={setFilters}
                  providers={providerOptions}
                  maxTicketSize={maxTicketSize}
                />
              </div>
            </div>
          )}

          {/* Right: Content */}
          <div className="space-y-6">
            
            {/* Sticky Header Group */}
            <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-6 px-6 border-b border-slate-200/50 shadow-sm transition-all">
              <div className="space-y-4">
                {/* Top Bar: Sorter */}
                <SorterBar
                  totalCount={processedProducts.length}
                  showingStart={showingStart}
                  showingEnd={showingEnd}
                  sortField={filters.sortField}
                  sortDir={filters.sortDir}
                  onSortChange={handleSortChange}
                  onSortDirChange={handleSortDirChange}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  searchValue={filters.search}
                  onSearchChange={(val) => setFilters(f => ({ ...f, search: val }))}
                />

                {/* Horizontal Filter Bar (Visible on screens smaller than 2XL) */}
                <div className={isCollapsed ? "2xl:hidden" : ""}>
                  <HorizontalFilterBar 
                    filters={filters}
                    setFilters={setFilters}
                    providers={providerOptions}
                    maxTicketSize={maxTicketSize}
                  />
                </div>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                  <span className="text-slate-500 font-medium animate-pulse">Fetching market data...</span>
                </div>
              </div>
            ) : processedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                <p className="text-slate-500 mt-1 mb-6 max-w-xs text-center">We couldn't find any products matching your current filters.</p>
                <button 
                  onClick={() => setFilters({ ...filters, category: "All", search: "", riskLevels: [], providers: [] })}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <ProductGrid
                  products={displayProducts}
                  compareList={compareList}
                  onToggleCompare={handleToggleCompare}
                  viewMode={viewMode}
                  onViewDetails={handleViewDetails}
                  userInvestmentAmount={maxTicketSize}
                />

                <Pagination
                  currentPage={displayPage}
                  totalPages={displayTotalPages}
                  onPageChange={handleDisplayPageChange}
                />
              </>
            )}
          </div>
        </div>

        <ComparisonDock
          compareList={compareList}
          products={products}
          onClear={() => { setCompareList([]); setCompareOpen(false); }}
          onCompare={() => setCompareOpen(true)}
        />
        <ComparisonModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          products={compareList.map(id => products.find(p => p.id === id)).filter(Boolean)}
        />
        <ProductDetailsModal 
          product={selectedProduct} 
          loading={detailsLoading}
          open={Boolean(selectedProduct)} 
          onClose={() => { setSelectedProduct(null); setDetailsLoading(false); }} 
        />
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
