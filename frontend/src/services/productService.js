/**
 * Product Service
 * ===============
 * Handles all product-related API calls and data transformation.
 * Transforms backend data structure to frontend-expected format.
 */

import api from '../utils/api';

// ==========================================
// Data Transformation Layer
// ==========================================

/**
 * Transform backend product to frontend format
 * Backend: { _id, metrics: { riskScore, fees: { total }, returns: { y1, y5 } }, strategy, ... }
 * Frontend: { id, riskLevel, fees, returns: { '1y', '5y' }, riskScore, ... }
 */
const transformProduct = (backendProduct) => {
  if (!backendProduct) return null;

  const {
    _id,
    name,
    code,
    provider,
    description,
    category,
    type,
    strategy,
    metrics,
    allocation,
    topHoldings,
    termDepositDetails,
    isActive,
    lastUpdated,
  } = backendProduct;

  return {
    // Identity
    id: _id,
    name: name || 'Unknown Fund',
    code,
    provider: provider || 'Unknown Provider',
    fundManager: provider || 'Unknown Provider',
    description,

    // Category mapping (Backend → Frontend)
    // Backend: KiwiSaver | Fund | TermDeposit
    // Frontend expects: KiwiSaver | ManagedFund | TermDeposit
    category: category === 'Fund' ? 'ManagedFund' : category,
    type, // Active | Index | ETF | FixedTerm | Savings

    // Risk mapping
    // Backend: strategy (Defensive|Conservative|Balanced|Growth|Aggressive)
    // Frontend expects: riskLevel with same values
    riskLevel: strategy,
    riskScore: metrics?.riskScore ?? 4,

    // Fees (flatten from nested structure)
    fees: metrics?.fees?.total ?? 0,
    feesBreakdown: {
      total: metrics?.fees?.total ?? 0,
      performance: metrics?.fees?.performance ?? 0,
      admin: metrics?.fees?.admin ?? 0,
    },

    // Returns (transform key format)
    // Backend: { y1, y5, benchmark_y1 }
    // Frontend expects: { '1y', '5y' }
    returns: {
      '1y': metrics?.returns?.y1 ?? null,
      '5y': metrics?.returns?.y5 ?? null,
      benchmark: metrics?.returns?.benchmark_y1 ?? null,
    },

    // Asset allocation (pass through, already in good format)
    allocation: allocation || {
      cash: 0,
      bonds: 0,
      equities: 0,
      property: 0,
      other: 0,
    },

    // Holdings (limit to top 5)
    topHoldings: (topHoldings || []).slice(0, 5),

    // Term Deposit specific
    termDepositDetails: termDepositDetails || null,

    // Metadata
    isActive: isActive ?? true,
    lastUpdated,
    asOfDate: backendProduct.asOfDate || null,
    topHoldingsAsOf: backendProduct.topHoldingsAsOf || backendProduct.asOfDate || null,
    dataSource: backendProduct.dataSource || 'Disclose Register',
    documents: Array.isArray(backendProduct.documents) ? backendProduct.documents : [],

    // Minimum investment (for eligibility filtering)
    // Note: Backend doesn't have this field yet, default to 0 (no minimum)
    minimumInvestment: 0,
  };
};

/**
 * Transform array of products
 */
const transformProducts = (backendProducts) => {
  if (!Array.isArray(backendProducts)) return [];
  return backendProducts.map(transformProduct).filter(Boolean);
};

// ==========================================
// API Methods
// ==========================================

const productService = {
  /**
   * Get all products with optional filters
   * @param {Object} params - Query parameters
   * @param {string} params.category - KiwiSaver | Fund | TermDeposit
   * @param {string} params.strategy - Defensive | Conservative | Balanced | Growth | Aggressive
   * @param {number} params.riskMin - Minimum risk score (1-7)
   * @param {number} params.riskMax - Maximum risk score (1-7)
   * @param {number} params.feeMax - Maximum total fee (%)
   * @param {string} params.provider - Provider name (partial match)
   * @param {string} params.search - Search in name/description
   * @param {string} params.sortBy - name | fees | riskScore | returns
   * @param {string} params.sortOrder - asc | desc
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  async getProducts(params = {}) {
    try {
      // Map frontend category to backend if needed for server-side filtering
      const apiParams = { ...params };
      if (apiParams.category === 'ManagedFund') {
        apiParams.category = 'Fund';
      }

      const response = await api.get('/products', { params: apiParams });
      
      if (response.data?.success) {
        return {
          products: transformProducts(response.data.data),
          pagination: response.data.pagination,
        };
      }
      
      throw new Error(response.data?.message || 'Failed to fetch products');
    } catch (error) {
      console.error('[ProductService] getProducts error:', error);
      throw error;
    }
  },

  /**
   * Get single product by ID
   * @param {string} id - Product ID
   */
  async getProductById(id) {
    try {
      const response = await api.get(`/products/${id}`);
      
      if (response.data?.success) {
        return transformProduct(response.data.data);
      }
      
      throw new Error(response.data?.message || 'Product not found');
    } catch (error) {
      console.error('[ProductService] getProductById error:', error);
      throw error;
    }
  },

  /**
   * Get products by category
   * @param {string} category - KiwiSaver | Fund | TermDeposit
   */
  async getProductsByCategory(category) {
    try {
      // Map frontend category to backend if needed
      const backendCategory = category === 'ManagedFund' ? 'Fund' : category;
      const response = await api.get(`/products/category/${backendCategory}`);
      
      if (response.data?.success) {
        return transformProducts(response.data.data);
      }
      
      throw new Error(response.data?.message || 'Failed to fetch products');
    } catch (error) {
      console.error('[ProductService] getProductsByCategory error:', error);
      throw error;
    }
  },

  /**
   * Get products by strategy/risk level
   * @param {string} strategy - Defensive | Conservative | Balanced | Growth | Aggressive
   */
  async getProductsByStrategy(strategy) {
    try {
      const response = await api.get(`/products/strategy/${strategy}`);
      
      if (response.data?.success) {
        return transformProducts(response.data.data);
      }
      
      throw new Error(response.data?.message || 'Failed to fetch products');
    } catch (error) {
      console.error('[ProductService] getProductsByStrategy error:', error);
      throw error;
    }
  },

  /**
   * Search products
   * @param {string} query - Search query
   * @param {number} limit - Max results
   */
  async searchProducts(query, limit = 20) {
    try {
      const response = await api.get('/products/search', {
        params: { q: query, limit },
      });
      
      if (response.data?.success) {
        return transformProducts(response.data.data);
      }
      
      throw new Error(response.data?.message || 'Search failed');
    } catch (error) {
      console.error('[ProductService] searchProducts error:', error);
      throw error;
    }
  },

  /**
   * Compare multiple products
   * @param {string[]} productIds - Array of product IDs (2-5)
   */
  async compareProducts(productIds) {
    try {
      const response = await api.post('/products/compare', { productIds });
      
      if (response.data?.success) {
        return transformProducts(response.data.data);
      }
      
      throw new Error(response.data?.message || 'Comparison failed');
    } catch (error) {
      console.error('[ProductService] compareProducts error:', error);
      throw error;
    }
  },

  /**
   * Get product statistics
   */
  async getProductStats() {
    try {
      const response = await api.get('/products/stats');
      
      if (response.data?.success) {
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch stats');
    } catch (error) {
      console.error('[ProductService] getProductStats error:', error);
      throw error;
    }
  },
};

export default productService;

// Named exports for convenience
export {
  transformProduct,
  transformProducts,
};

