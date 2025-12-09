import { useState, useEffect, useMemo } from 'react';
import { FilterPanel } from './FilterPanel';
import { ProductCard } from './ProductCard';
import { ComparisonDock } from './ComparisonDock';
import { Filter, TrendingUp, AlertCircle, UserCircle } from 'lucide-react';
import { fetchProducts } from '../../services/api';

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'All',
    sortBy: 'best5YReturn',
    riskProfiles: [],
    providers: [],
    minReturn: 0,
    maxFee: 2,
  });
  const [compareList, setCompareList] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // 从后端获取产品
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await fetchProducts();
        setProducts(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load products:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // 获取可用的机构列表
  const availableProviders = useMemo(() => {
    return Array.from(new Set(products.map(p => p.provider))).sort();
  }, [products]);

  // 筛选和排序产品
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      if (filters.category !== 'All' && product.category !== filters.category) {
        return false;
      }
      if (filters.riskProfiles.length > 0 && !filters.riskProfiles.includes(product.riskLevel)) {
        return false;
      }
      if (filters.providers.length > 0 && !filters.providers.includes(product.provider)) {
        return false;
      }
      const returnValue = product.returns['5y'] || product.returns['1y'];
      if (returnValue < filters.minReturn) {
        return false;
      }
      if (product.fees > filters.maxFee) {
        return false;
      }
      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'best5YReturn':
          const aReturn = a.returns['5y'] || a.returns['1y'];
          const bReturn = b.returns['5y'] || b.returns['1y'];
          return bReturn - aReturn;
        case 'lowestFees':
          return a.fees - b.fees;
        case 'riskLowToHigh':
          return a.riskScore - b.riskScore;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, filters]);

  const handleToggleCompare = (productId) => {
    setCompareList(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        if (prev.length >= 3) {
          alert('You can only compare up to 3 products.');
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const selectedProductsForComparison = products.filter(p => compareList.includes(p.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-gray-900 text-2xl font-bold">Financial Product Marketplace</h1>
              <p className="text-gray-600 text-sm">Compare and choose the right investment</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Panel */}
          <aside className="lg:w-1/4">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableProviders={availableProviders}
            />
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            <div className="mb-6">
              <p className="text-gray-600">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={compareList.includes(product.id)}
                  onToggleCompare={handleToggleCompare}
                  userInvestmentAmount={userProfile?.investmentAmount}
                />
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Comparison Dock */}
      {compareList.length > 0 && (
        <ComparisonDock
          selectedProducts={selectedProductsForComparison}
          onRemove={handleToggleCompare}
          onClearAll={() => setCompareList([])}
        />
      )}
    </div>
  );
}