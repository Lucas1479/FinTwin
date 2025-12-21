import axios from 'axios';

// ==========================================
// Axios Instance Configuration
// ==========================================

const api = axios.create({
  baseURL: '/api', // Matches Vite proxy configuration
  withCredentials: true, // Allow cookies to be sent with requests
  timeout: 60000, // 60-second timeout for LLM calls
  // REMOVED: headers: { 'Content-Type': 'application/json' } 
  // Reason: Let Axios/Browser automatically detect content type (JSON vs FormData).
  // Setting it explicitly here would break FormData uploads.
});

// ==========================================
// Request Interceptor
// ==========================================

api.interceptors.request.use(
  (config) => {
    // We use httpOnly cookies for auth, no need to manually inject token.
    // If switching to header-based auth:
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// Response Interceptor
// ==========================================

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // 401: Unauthorized / Token Expired
      if (status === 401) {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');

        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // 403: Forbidden
      if (status === 403) {
        console.error('[API] Permission denied');
      }

      // 500+: Server Error
      if (status >= 500) {
        console.error('[API] Server error:', error.response.data?.message || 'Unknown error');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout');
    } else {
      console.error('[API] Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

// ==========================================
// Legacy Exports (For backward compatibility)
// ==========================================
// These are deprecated. Use dedicated services instead:
// - productService.js for products
// - authService.js for auth
// - goalService.js for goals

/**
 * @deprecated Use productService.getProducts() instead
 */
export const fetchProducts = async () => {
  console.warn('[DEPRECATED] fetchProducts() is deprecated. Use productService.getProducts() instead.');
  try {
    const response = await api.get('/products');
    // Return raw data array for backward compatibility
    return response.data?.data || [];
  } catch (error) {
    console.error('[API] fetchProducts error:', error);
    return [];
  }
};

/**
 * @deprecated Use userService or authService instead
 */
export const fetchCurrentUserProfile = async () => {
  console.warn('[DEPRECATED] fetchCurrentUserProfile() is deprecated.');
  try {
    const response = await api.get('/users/profile');
    return response.data || null;
  } catch (error) {
    console.error('[API] fetchCurrentUserProfile error:', error);
    // Return default profile on error
    return {
      riskTolerance: 'Balanced',
      income: 80000,
      currentSavings: 20000,
    };
  }
};

export default api;
