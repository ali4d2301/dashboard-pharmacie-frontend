import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import Login from "../pages/Login.vue";

import InsertProduct from "../pages/InsertProduct.vue";
import InsertMove from "../pages/InsertMove.vue";
import EditProduct from "../pages/EditProduct.vue";
import MovementsHistory from "../pages/HistMove.vue";
import Dashboard from "../pages/Dashboard.vue";

const READ_ROLES = ["admin", "viewer"];
const ADMIN_ROLES = ["admin"];

function getStoredAuth() {
  const token = window.localStorage.getItem("pharmacie_access_token");
  const role = window.localStorage.getItem("pharmacie_user_role");
  return { token, role };
}

const routes = [
  {
    path: "/",
    alias: ["/connexion", "/login"],
    component: Login,
    meta: { public: true },
  },
  { path: "/accueil", alias: "/menu", component: Home, meta: { roles: ADMIN_ROLES } },

  { path: "/enregistrer-medicament", component: InsertProduct, meta: { roles: ADMIN_ROLES } },
  { path: "/enregistrer-mouvement", component: InsertMove, meta: { roles: ADMIN_ROLES } },
  { path: "/editer-medicament", component: EditProduct, meta: { roles: ADMIN_ROLES } },
  { path: "/historique", component: MovementsHistory, meta: { roles: READ_ROLES } },
  { path: "/synthese", component: Dashboard, meta: { roles: READ_ROLES } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const { token, role } = getStoredAuth();
  const isPublic = Boolean(to.meta.public);
  const isKnownRole = role === "admin" || role === "viewer";

  if (!token || !isKnownRole) {
    if (isPublic) return true;
    return { path: "/" };
  }

  if (isPublic) {
    return { path: role === "viewer" ? "/synthese" : "/accueil" };
  }

  const allowedRoles = Array.isArray(to.meta.roles) ? to.meta.roles : [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return { path: role === "viewer" ? "/synthese" : "/accueil" };
  }

  return true;
});

export default router;
