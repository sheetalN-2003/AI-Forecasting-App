import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('retailpulse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('retailpulse_token');
      localStorage.removeItem('retailpulse_user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register:            (username, email, password, role) =>
    api.post('/auth/register', { username, email, password, role }),
  me:                  () => api.get('/auth/me'),
  requestVerification: (email) => api.post('/auth/request-verification', { email }),
  verifyCode:          (email, code) => api.post('/auth/verify-code', { email, code }),
  forgotPassword:      (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:       (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  googleLogin:         (token) => api.post('/auth/google-login', { token }),
  verify2FA:           (username, code) => api.post('/auth/2fa/verify-login', { username, code }),
};

// ─── Analytics ─────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboardMetrics:  () => api.get('/analytics/dashboard-metrics'),
  getRevenueByMonth:    () => api.get('/analytics/revenue-by-month'),
  getSalesByCategory:   () => api.get('/analytics/sales-by-category'),
  getSalesByRegion:     () => api.get('/analytics/sales-by-region'),
  getRecentTransactions:(limit = 10) => api.get(`/analytics/recent-transactions?limit=${limit}`),
  getGrowthMetrics:     () => api.get('/analytics/growth-metrics'),
  getSeasonalTrends:    () => api.get('/analytics/seasonal-trends'),
  getAutomatedInsights: () => api.get('/analytics/automated-insights'),
  getUserMetrics:       () => api.get('/analytics/user-metrics'),
  exportCSV:            () => api.get('/analytics/export-csv', { responseType: 'blob' }),
  exportPDF:            () => api.get('/analytics/export-pdf', { responseType: 'blob' }),
};

// ─── Inventory ─────────────────────────────────────────────────────────────
export const inventoryAPI = {
  getStatus:      () => api.get('/inventory/status'),
  getAlerts:      () => api.get('/inventory/alerts'),
  createReorder:  (category, quantity, priority = 'MEDIUM') =>
    api.post('/inventory/reorder', { category, quantity, priority }),
  approveReorder: (id) => api.post(`/inventory/reorder/${id}/approve`),
  rejectReorder:  (id) => api.post(`/inventory/reorder/${id}/reject`),
};

// ─── Forecasting ────────────────────────────────────────────────────────────
export const forecastingAPI = {
  predictSales:  (payload) => api.post('/forecasting/predict-sales', payload),
  getModelStatus:() => api.get('/forecasting/model-status'),
  getHistory:    () => api.get('/forecasting/history'),
  deleteHistory: (id) => api.delete(`/forecasting/history/${id}`),
};

// ─── Data & Bulk ─────────────────────────────────────────────────────────────
export const dataAPI = {
  uploadTrainingData: (formData) =>
    api.post('/data/upload-training-data', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  batchPredict: (formData) =>
    api.post('/data/batch-predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    }),
};

// ─── Insights ─────────────────────────────────────────────────────────────
export const insightsAPI = {
  chat:           (message) => api.post('/insights/chat', { message }),
  getAutoInsights:() => api.get('/insights/auto-insights'),
};

// ─── Notifications ────────────────────────────────────────────────────────
export const notificationsAPI = {
  get:         () => api.get('/notifications/'),
  markAsRead:  (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete:      (id) => api.delete(`/notifications/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getMetrics:   () => api.get('/admin/metrics'),
  getUsers:     () => api.get('/admin/users'),
  toggleVerify: (id) => api.patch(`/admin/users/${id}/toggle-verify`),
  changeRole:   (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser:   (id) => api.delete(`/admin/users/${id}`),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  createUser:   (username, email, role) => api.post('/auth/admin/create-user', { username, email, role }),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

export default api;
