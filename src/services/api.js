import axios from "axios";
import {
  clearStoredAuth,
  getDefaultRouteForRole,
  getStoredAuth,
  isKnownRole,
  notifyAuthChanged,
  setAuthNotice,
} from "@/utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 45000,
});

let authRedirectPending = false;

function getRequestPath(config) {
  const rawUrl = String(config?.url || "");
  if (!rawUrl) return "";

  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      return new URL(rawUrl).pathname;
    } catch {
      return rawUrl;
    }
  }

  return rawUrl.split("?")[0];
}

function scheduleBrowserRedirect(path) {
  if (!path || typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === path) return;

  window.setTimeout(() => {
    window.location.assign(path);
  }, 0);
}

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("pharmacie_access_token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const requestPath = getRequestPath(error?.config);
    const isAuthBootstrapRequest =
      requestPath === "/api/auth/login" || requestPath === "/api/auth/ready";

    if (!isAuthBootstrapRequest && (status === 401 || status === 403)) {
      const { token, role } = getStoredAuth();
      const fallbackPath = isKnownRole(role) ? getDefaultRouteForRole(role) : "/";

      if (token && !authRedirectPending) {
        authRedirectPending = true;

        if (status === 401) {
          clearStoredAuth();
          setAuthNotice("Votre session a expire. Merci de vous reconnecter.");
          notifyAuthChanged();
          scheduleBrowserRedirect("/");
        } else {
          setAuthNotice("Cette page n'est pas accessible avec votre profil.");
          scheduleBrowserRedirect(fallbackPath);
        }

        window.setTimeout(() => {
          authRedirectPending = false;
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
