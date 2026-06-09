import axios from 'axios';

export const ADMIN_SESSION_KEY = 'litflow-admin-token';
export const ADMIN_SESSION_META_KEY = 'litflow-admin-session-meta';

function clearAdminSessionStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_META_KEY);
}

function notifyAdminSessionExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event('litflow-admin-session-expired'));
}

function getDefaultApiBaseUrl(pathname) {
  return pathname;
}

function normalizeBaseUrl(value, fallbackPath) {
  const resolved = value?.trim() || fallbackPath;
  return resolved.replace(/\/$/, '');
}

export const adminApi = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_ADMIN_API_BASE_URL, getDefaultApiBaseUrl('/api/admin')),
  timeout: 15000
});

export const publicApi = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_PUBLIC_API_BASE_URL, getDefaultApiBaseUrl('/api')),
  timeout: 15000
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_SESSION_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isLoginRequest = requestUrl.includes('/login');

    if ((status === 401 || status === 403) && !isLoginRequest) {
      clearAdminSessionStorage();
      notifyAdminSessionExpired();
    }

    return Promise.reject(error);
  }
);

export const adminClient = {
  login(payload) {
    return adminApi.post('/login', payload);
  },
  me() {
    return adminApi.get('/me');
  },
  dashboard() {
    return adminApi.get('/dashboard');
  },
  users(params) {
    return adminApi.get('/users', { params });
  },
  userDetails(userId) {
    return adminApi.get(`/users/${userId}`);
  },
  toggleUserBlock(userId, blocked) {
    return adminApi.patch(`/users/${userId}/block`, { blocked });
  },
  updateUserPlan(userId, payload) {
    return adminApi.patch(`/users/${userId}/plan`, payload);
  },
  deleteUser(userId) {
    return adminApi.delete(`/users/${userId}`);
  },
  payments(params) {
    return adminApi.get('/payments', { params });
  },
  createManualPayment(payload) {
    return adminApi.post('/payments/manual', payload);
  },
  deletePayment(paymentId) {
    return adminApi.delete(`/payments/${paymentId}`);
  },
  analytics(params) {
    return adminApi.get('/analytics', { params });
  },
  aiAnalytics(params) {
    return adminApi.get('/analytics/ai', { params });
  },
  controls() {
    return adminApi.get('/controls');
  },
  updateFeature(key, payload) {
    return adminApi.patch(`/controls/${key}`, payload);
  },
  updateSetting(key, value) {
    return adminApi.patch(`/settings/${key}`, { value });
  },
  deleteSetting(key) {
    return adminApi.delete(`/settings/${key}`);
  },
  content(params) {
    return adminApi.get('/content', { params });
  },
  saveContent(payload) {
    return adminApi.post('/content', payload);
  },
  deleteContent(id) {
    return adminApi.delete(`/content/${id}`);
  },
  deleteSavedPaper(id) {
    return adminApi.delete(`/content/saved/${id}`);
  },
  logs(params) {
    return adminApi.get('/logs', { params });
  }
};

export const publicClient = {
  siteConfig() {
    return publicApi.get('/site-config');
  }
};
