import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true // send/receive httpOnly refresh cookie
});

// Request interceptor to ensure token is always included if available
api.interceptors.request.use(
  (config) => {
    // If there's already an Authorization header, keep it
    if (!config.headers['Authorization'] && api.defaults.headers.common['Authorization']) {
      config.headers['Authorization'] = api.defaults.headers.common['Authorization'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// response interceptor to refresh token when access token expired
let isRefreshing = false;
let failedQueue: any[] = [];
let refreshDisabled = false; // after a failed refresh (e.g., no cookie), don't keep trying

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;
    const reqUrl: string = originalRequest?.url || '';
    // Don't attempt refresh for the refresh call itself or when we've already determined no refresh is possible
    if (status === 401 && !originalRequest._retry && !refreshDisabled && !reqUrl.includes('/api/auth/refresh')) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const r = await api.post('/api/auth/refresh');
        const newToken = r.data.accessToken;
        // set default authorization header so subsequent requests include access token
        if (newToken) api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        return api(originalRequest);
      } catch (e) {
          // Narrow Axios error shape safely
          const maybeAxiosErr = e as any;
          const status = maybeAxiosErr?.response?.status;
          if (status === 401) {
            refreshDisabled = true; // disable further refresh attempts until a manual login sets token
          }
          processQueue(maybeAxiosErr, null);
          return Promise.reject(maybeAxiosErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
