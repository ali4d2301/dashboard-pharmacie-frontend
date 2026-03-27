export const AUTH_KEYS = [
  "pharmacie_access_token",
  "pharmacie_token_type",
  "pharmacie_user_role",
  "pharmacie_username",
];

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

export function isKnownRole(role) {
  return role === "admin" || role === "viewer";
}

export function getDefaultRouteForRole(role = getStoredRole()) {
  return role === "viewer" ? "/synthese" : "/accueil";
}
