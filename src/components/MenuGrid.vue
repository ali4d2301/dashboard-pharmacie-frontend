<template>
  <main class="container">
    <div class="grid">
      <button
        v-for="item in visibleItems"
        :key="item.path"
        class="btn"
        :class="{ wide: item.wide }"
        @click="router.push(item.path)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const userRole = window.localStorage.getItem("pharmacie_user_role") || ""

const READ_ROLES = ["admin", "viewer"]
const ADMIN_ROLES = ["admin"]
const PATH_ROLES = {
  "/enregistrer-medicament": ADMIN_ROLES,
  "/enregistrer-mouvement": ADMIN_ROLES,
  "/editer-medicament": ADMIN_ROLES,
  "/historique": READ_ROLES,
  "/synthese": READ_ROLES,
}

const items = [
  { label: "Enregistrer un médicament", path: "/enregistrer-medicament", icon: "💊" },
  { label: "Enregistrer un mouvement", path: "/enregistrer-mouvement", icon: "➕" },

  { label: "Editer un médicament", path: "/editer-medicament", icon: "✏️" },
  { label: "Voir mouvements de produit", path: "/historique", icon: "📝" },
  //{ label: "Editer un mouvement", path: "/editer-mouvement", icon: "📝" },

  { label: "Tableau de bord", path: "/synthese", icon: "📊", wide: true },
]
const visibleItems = computed(() =>
  items.filter((item) => (PATH_ROLES[item.path] || READ_ROLES).includes(userRole))
)
</script>

<style scoped>
.container {
  width: min(700px, 80%);
  margin: 0 auto;
}

.grid {
  padding: 12px 0 20px; /* moins d’espace en haut */
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 350px));  /* 2 colonnes de largeur contrôlée */
  column-gap: 14px;       /* espace horizontal entre colonnes */
  row-gap: 14px;          /* espace vertical */
  gap: 14px 18px;         /* espace entre colonnes */
  justify-items: center;  /* centre tout le bloc de colonnes */
}

/* Bouton */
.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #e46f36;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn:hover {
  filter: brightness(0.98);
}

.btn:active {
  transform: translateY(1px);
}

/* Dernier bouton centré et plus large */
.btn.wide {
  grid-column: 1 / -1;
  width: min(460px, 100%);
  justify-self: center;
}

/* Mobile */
@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .btn,
  .btn.wide {
    max-width: 520px;
  }
}
</style>
