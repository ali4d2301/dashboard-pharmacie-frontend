<template>
  <main class="container">
    <div class="grid">
      <button
        v-for="item in visibleItems"
        :key="item.path"
        class="btn"
        :class="{
          wide: item.wide,
          'is-featured': item.featured,
        }"
        @click="openItem(item)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const userRole = window.localStorage.getItem("pharmacie_user_role") || "";

const READ_ROLES = ["admin", "viewer"];
const ADMIN_ROLES = ["admin"];
const PATH_ROLES = {
  "/enregistrer-medicament": ADMIN_ROLES,
  "/enregistrer-mouvement": ADMIN_ROLES,
  "/editer-medicament": ADMIN_ROLES,
  "/historique": READ_ROLES,
  "/synthese": READ_ROLES,
};

const items = [
  {
    label: "Enregistrer un m\u00e9dicament",
    path: "/enregistrer-medicament",
    icon: "\u{1F48A}",
    featured: true,
  },
  {
    label: "Enregistrer un mouvement",
    path: "/enregistrer-mouvement",
    icon: "\u2795",
    featured: true,
  },
  {
    label: "Editer un m\u00e9dicament",
    path: "/editer-medicament",
    icon: "\u270F\uFE0F",
  },
  {
    label: "Voir mouvements de produit",
    path: "/synthese",
    icon: "\u{1F4DD}",
    targetTab: "mvts",
  },
  {
    label: "Tableau de bord",
    path: "/synthese",
    icon: "\u{1F4CA}",
    wide: true,
    featured: true,
    targetTab: "synthese",
  },
];

const visibleItems = computed(() =>
  items.filter((item) => (PATH_ROLES[item.path] || READ_ROLES).includes(userRole))
);

function openItem(item) {
  if (item.targetTab) {
    window.localStorage.setItem("dashboard_active_tab", item.targetTab);
  }
  router.push(item.path);
}
</script>

<style scoped>
.container {
  width: min(700px, 80%);
  margin: 0 auto;
}

.grid {
  padding: 0 0 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 350px));
  gap: 14px 18px;
  justify-items: center;
}

.btn {
  width: 100%;
  min-height: 58px;
  padding: 10px 16px;
  border: 1px solid rgba(191, 93, 40, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(135deg, #ef8f53 0%, #e37537 58%, #d85f27 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 12px 20px rgba(210, 98, 39, 0.16),
    0 6px 12px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    filter 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}

.btn::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.12) 50%, transparent 100%);
  transform: translateX(-120%);
  transition: transform 0.35s ease;
}

.btn::after {
  content: "";
  position: absolute;
  inset: auto -18% -58% auto;
  width: 180px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 224, 198, 0.26) 0%, rgba(255, 224, 198, 0) 72%);
  pointer-events: none;
  opacity: 0.8;
}

.btn:not(.is-featured) {
  filter: saturate(0.94) brightness(0.98);
}

.btn.is-featured {
  border-color: rgba(205, 105, 47, 0.36);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 34%),
    radial-gradient(circle at top left, rgba(255, 214, 173, 0.28) 0%, rgba(255, 214, 173, 0) 34%),
    linear-gradient(135deg, #f4a15c 0%, #ea7c32 46%, #df621e 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 18px 30px rgba(221, 102, 35, 0.24),
    0 8px 16px rgba(15, 23, 42, 0.08);
}

.btn.is-featured .icon {
  background: rgba(255, 255, 255, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 6px 12px rgba(197, 86, 27, 0.18);
}

.btn:hover {
  transform: translateY(-2px);
  border-color: rgba(191, 93, 40, 0.36);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    0 18px 28px rgba(210, 98, 39, 0.22),
    0 8px 14px rgba(15, 23, 42, 0.1);
}

.btn.is-featured:hover {
  filter: saturate(1.03);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    0 22px 34px rgba(221, 102, 35, 0.28),
    0 10px 18px rgba(15, 23, 42, 0.1);
}

.btn:hover::before {
  transform: translateX(120%);
}

.btn:active {
  transform: translateY(1px);
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
  font-size: 17px;
  line-height: 1;
}

.label {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(149, 63, 23, 0.2);
}

.btn.wide {
  grid-column: 1 / -1;
  width: min(460px, 100%);
  justify-self: center;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .btn,
  .btn.wide {
    max-width: 520px;
  }

  .btn {
    min-height: 56px;
    padding: 10px 14px;
    border-radius: 14px;
  }
}
</style>
