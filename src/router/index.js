import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"

import InsertProduct from "../pages/InsertProduct.vue"
import InsertMove from "../pages/InsertMove.vue"
import EditProduct from "../pages/EditProduct.vue"
//import EditMove from "../pages/EditMove.vue"
import MovementsHistory from "../pages/HistMove.vue"
import Dashboard from "../pages/Dashboard.vue"

const routes = [
  { path: "/", component: Home },

  { path: "/enregistrer-medicament", component: InsertProduct },
  { path: "/enregistrer-mouvement", component: InsertMove },
  { path: "/editer-medicament", component: EditProduct },
  { path: "/historique", component: MovementsHistory },
  { path: "/synthese", component: Dashboard },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
