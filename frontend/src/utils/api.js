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
    // Retrieve token from localStorage (Standard for MERN stack)
    const token = localStorage.getItem('token'); 
    if (token) {
      // Attach token using standard Bearer format
      config.headers.Authorization = `Bearer ${token}`;
    }
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
        localStorage.removeItem('token'); // Clear invalid token
        
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

export default api;