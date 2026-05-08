/**
 * AGRISAVE.IO - Axios API Service
 * Centralized HTTP client dengan auto token refresh.
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // untuk HttpOnly cookie (refresh token)
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Sisipkan Access Token ───
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ─── Response Interceptor: Auto Refresh Token ───
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      // Jika token expired, coba refresh
      if (err.response?.data?.error === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
            .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); })
            .catch((e) => Promise.reject(e));
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
          const newToken = data.data.accessToken;
          useAuthStore.getState().setAccessToken(newToken);
          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          useAuthStore.getState().logout();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
