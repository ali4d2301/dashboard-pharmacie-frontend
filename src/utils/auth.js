export const AUTH_KEYS = [
  "pharmacie_access_token",
  "pharmacie_token_type",
  "pharmacie_user_role",
  "pharmacie_username",
];

export const AUTH_CHANGED_EVENT = "pharmacie-auth-changed";
export const AUTH_NOTICE_KEY = "pharmacie_auth_notice";

export function getStoredRole() {
  return String(window.localStorage.getItem("pharmacie_user_role") || "")
    .trim()
    .toLowerCase();
}

export function getStoredAuth() {
  return {
    token: window.localStorage.getItem("pharmacie_access_token") || "",
    role: getStoredRole(),
  };
}

export function clearStoredAuth() {
  for (const key of AUTH_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAuthNotice(message) {
  const text = String(message || "").trim();
  if (!text) return;
  window.sessionStorage.setItem(AUTH_NOTICE_KEY, text);
}

export function consumeAuthNotice() {
  const message = window.sessionStorage.getItem(AUTH_NOTICE_KEY) || "";
  if (!message) return "";
  window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}

export function isKnownRole(role) {
  return role === "admin" || role === "viewer";
}

export function getDefaultRouteForRole(role = getStoredRole()) {
  return role === "viewer" ? "/synthese" : "/accueil";
}
