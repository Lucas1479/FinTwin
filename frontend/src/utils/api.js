import axios from 'axios';

// 1. Create Axios instance
const api = axios.create({
  baseURL: '/api', // Matches Vite proxy configuration
  withCredentials: true, // Allow cookies to be sent with requests
  timeout: 10000, // 10-second timeout
  // REMOVED: headers: { 'Content-Type': 'application/json' } 
  // Reason: Let Axios/Browser automatically detect content type (JSON vs FormData).
  // Setting it explicitly here would break FormData uploads.
});

// 2. Request Interceptor
// Automatically injects token before the request is sent
api.interceptors.request.use(
  (config) => {
    // Note: We primarily use httpOnly cookies for auth.
    // However, if we ever needed to switch back to headers, this is where we'd add it.
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

// 3. Response Interceptor
// Centralized response processing and error handling
api.interceptors.response.use(
  (response) => {
    // Return the response object directly
    return response; 
  },
  (error) => {
    // Global Error Handling
    if (error.response) {
      const status = error.response.status;
      
      // 401: Unauthorized / Token Expired -> Redirect to login
      if (status === 401) {
        localStorage.removeItem('userInfo'); // Clear user state
        localStorage.removeItem('token'); // Clear legacy token if any
        
        // Force redirect if not already on login page
        if (window.location.pathname !== '/login') {
           window.location.href = '/login';
        }
      }
      
      // 403: Forbidden
      if (status === 403) {
        console.error('Permission denied');
      }
      
      // 500: Server Error
      if (status >= 500) {
        console.error('Server error, please try again later');
      }
    }
    
    return Promise.reject(error);
  }
);

// Mock fetch functions until backend endpoints are ready or located
export const fetchProducts = async () => {
    // TODO: Replace with actual API call
    // return api.get('/products').then(res => res.data);
    return Promise.resolve([
        { id: 1, name: 'Growth Fund', provider: 'Milford', riskLevel: 'Growth', fees: 1.05, returns: { '1y': 12, '5y': 8.5 }, category: 'ManagedFund' },
        { id: 2, name: 'Conservative Fund', provider: 'ANZ', riskLevel: 'Conservative', fees: 0.8, returns: { '1y': 4, '5y': 3.5 }, category: 'KiwiSaver' },
        { id: 3, name: 'Balanced Fund', provider: 'Fisher Funds', riskLevel: 'Balanced', fees: 0.95, returns: { '1y': 7, '5y': 6.0 }, category: 'ManagedFund' }
    ]);
};

export const fetchCurrentUserProfile = async () => {
    // TODO: Replace with actual API call
    // return api.get('/users/profile').then(res => res.data);
     return Promise.resolve({
        riskTolerance: 'Balanced',
        income: 80000,
        currentSavings: 20000
    });
};

export default api;