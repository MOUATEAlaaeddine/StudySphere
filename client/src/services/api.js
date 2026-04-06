import axios from 'axios';

/**
 * api.js — Axios Instance
 * Defines a centralized axios instance for all API calls.
 * Configured with baseURL if needed and withCredentials for sessions.
 */
const api = axios.create({
    baseURL: '/api',          // Vite proxy will handle this
    withCredentials: true,    // Send cookies with every request
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // If we get a 401, handle it centrally (optional)
        if (error.response?.status === 401) {
            // Could trigger logout or redirect here
        }
        return Promise.reject(error.response?.data || error);
    }
);

export default api;
