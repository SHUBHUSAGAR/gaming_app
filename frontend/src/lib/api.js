import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, { withCredentials: true });
        return API(err.config);
      } catch {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(err);
  }
);

export default API;

export const getWsUrl = (path) => {
  const base = BACKEND_URL || '';
  return base.replace(/^http/, 'ws') + path;
};

export const formatINR = (amount) => {
  return `${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).filter(Boolean).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}
