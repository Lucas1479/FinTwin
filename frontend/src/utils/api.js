import axios from 'axios';

// ==========================================
// Axios Instance Configuration
// ==========================================

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBaseUrl, // Defaults to Vite proxy path
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
        // Allow certain requests to handle 401 themselves (e.g., password change modal)
        if (error.config?.skipAuthRedirect) {
          return Promise.reject(error);
        }

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

export default api;
