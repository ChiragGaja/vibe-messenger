import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// We no longer need to attach a JWT manually since it is stored in an HttpOnly cookie
api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh') {
                // If the error occurred during login or refresh itself, reject immediately
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return api(originalRequest);
                }).catch((err) => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the token using the HttpOnly refresh token cookie
                await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
                isRefreshing = false;
                processQueue(null);
                return api(originalRequest);
            } catch (err) {
                isRefreshing = false;
                processQueue(err, null);
                // Refresh token expired or invalid, log user out
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
