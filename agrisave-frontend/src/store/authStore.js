/**
 * AGRISAVE.IO - Auth Store (Zustand)
 * Global state untuk autentikasi.
 * Access token disimpan di memory (bukan localStorage) untuk keamanan.
 */
import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,        // In-memory only (tidak di localStorage)
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  setAccessToken: (token) => set({ accessToken: token }),

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      set({
        user: data.data.user,
        accessToken: data.data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login gagal. Coba lagi.';
      const attemptsLeft = err.response?.data?.attemptsLeft;
      set({ isLoading: false, error: msg });
      return { success: false, message: msg, attemptsLeft };
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    set({ user: null, accessToken: null, isAuthenticated: false, error: null });
  },

  refreshAuth: async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      set({ accessToken: data.data.accessToken });
      // Fetch user data
      const me = await api.get('/auth/me');
      set({ user: me.data.data, isAuthenticated: true });
      return true;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
