<template>
  <div class="page">
    <div class="topbar">
      <h2 class="title">Catalogue Produits</h2>

      <div class="filters">
        <input
          v-model="q"
          class="inp"
          placeholder="Rechercher (code, produit, classe...)"
        />

        <select v-model="classe" class="sel">
          <option value="ALL">Toutes classes</option>
          <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
        </select>

        <select v-model="statut" class="sel">
          <option value="ALL">Tous statuts</option>
          <option value="Actif">Actif</option>
          <option value="Inactif">Inactif</option>
        </select>

        <div class="count">{{ filteredRows.length }} produits</div>
      </div>
    </div>

    <div class="tableWrap">
      <!-- ✅ ENTÊTE hors scroll -->
      <div class="tableHead" ref="headEl">
        <table class="tbl">
          <colgroup>
            <col v-for="col in columns" :key="col" :style="colStyle(col)" />
          </colgroup>
          <thead>
            <tr>
              <th
                v-for="col in columns"
                :key="col"
                :class="thClass(col)"
                @click="toggleSort(col)"
                role="button"
                tabindex="0"
              >
                <span class="thWrap">
                  {{ label(col) }}
                  <span class="sortIcon" :class="sortIconClass(col)"></span>
                </span>
              </th>

            </tr>
          </thead>
        </table>
      </div>

      <!-- ✅ BODY scrollable -->
      <div class="tableScroll" ref="bodyEl" @scroll="syncScroll">
        <table class="tbl">
          <colgroup>
            <col v-for="col in columns" :key="col" :style="colStyle(col)" />
          </colgroup>
          <tbody>
            <tr v-for="r in filteredRows" :key="r.code">
              <td v-for="col in columns" :key="col" :class="tdClass(col)">
                <template v-if="col === 'statut'">
                  <span class="badge" :class="badgeClass(r.statut)">{{ r.statut || "" }}</span>
                </template>
                <template v-else>
                  {{ formatCell(col, r[col]) }}
                </template>
              </td>
            </tr>

            <tr v-if="!filteredRows.length">
              <td :colspan="columns.length" class="empty">Aucun produit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import axios from "axios";
import { computed, onMounted, ref } from "vue";

const API = import.meta.env.VITE_API_BASE ;
const ENDPOINT = `${API}/api/dashboard/list_products`;

const columns = ref([]);
const rows = ref([]);

const q = ref("");
const classe = ref("ALL");
const statut = ref("ALL");

/** Options classe */
const classes = computed(() => {
  const set = new Set(rows.value.map((r) => r.classe).filter(Boolean));
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
});

/** Filtrage */
const filteredRows = computed(() => {
  const query = q.value.trim().toLowerCase();

  let out = rows.value.filter((r) => {
    if (classe.value !== "ALL" && (r.classe ?? "") !== classe.value) return false;
    if (statut.value !== "ALL" && (r.statut ?? "") !== statut.value) return false;

    if (!query) return true;

    return columns.value.some((col) =>
      String(r[col] ?? "").toLowerCase().includes(query)
    );
  });

  // ---- applique le tri
  if (sortBy.value) {
    const key = sortBy.value;
    const dir = sortDir.value === "asc" ? 1 : -1;

    out = [...out].sort((ra, rb) => dir * cmp(ra[key], rb[key]));
  }

  return out;
});

// ---- TRI (state)
const sortBy = ref("");      // colonne triée
const sortDir = ref("asc");  // "asc" | "desc"

// Colonnes numériques (pour trier correctement)
const NUM_COLS = new Set(["prix_achat", "prix_vente", "stock_actuel"]);

// Helpers de tri
function toggleSort(col) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = col;
    sortDir.value = "asc";
  }
}

function sortIconClass(col) {
  if (sortBy.value !== col) return "none";
  return sortDir.value === "asc" ? "asc" : "desc";
}

function cmp(a, b) {
  if (a == null) a = "";
  if (b == null) b = "";

  // tri numérique si colonne numérique
  if (NUM_COLS.has(sortBy.value)) {
    const na = Number(String(a).replace(/\s/g, ""));
    const nb = Number(String(b).replace(/\s/g, ""));
    const va = Number.isFinite(na) ? na : 0;
    const vb = Number.isFinite(nb) ? nb : 0;
    return va - vb;
  }

  // tri texte
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base" });
}


function colStyle(col) {
  // mets ici tes largeurs (px)
  const w = {
    code: 80,
    produit: 160,
    cible: 140,
    classe: 160,
    date_creation: 100,
  }[col] || 100;

  return { width: w + "px", minWidth: w + "px" };
}

const headEl = ref(null);
const bodyEl = ref(null);

function syncScroll() {
  if (!headEl.value || !bodyEl.value) return;
  headEl.value.scrollLeft = bodyEl.value.scrollLeft; // ✅ header suit le scroll horizontal
}

/** Label colonne (joli) ✅ Tu changes ici les libellés comme tu veux */
const COL_LABELS = {
  code: "Code",
  produit: "Produit",
  forme: "Forme",
  dosage: "Dosage",
  classe: "Classe thérapeutique",
  cible: "Cible",
  unite: "Unité",
  prix_achat: "Prix achat",
  prix_vente: "Prix vente",
  stock_actuel: "Stock actuel",
  date_creation: "Date création",
  statut: "Statut",
};
function label(col) {
  return COL_LABELS[col] ?? String(col).replaceAll("_", " ");
}

/** Formatage cellule */
function formatCell(col, val) {
  if (val == null) return "";

  if (col === "code") return String(val);
  
  if (col === "date_creation") {
  // attend "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM..."
  const s = String(val).slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = s.split("-");
  return (d && m && y) ? `${d}/${m}/${y}` : s;
}


  if (col === "prix_achat" || col === "prix_vente") {
    const n = Number(val);
    return Number.isFinite(n) ? n.toLocaleString("fr-FR") : String(val);
  }

  if (col === "stock_actuel") {
    const n = Number(val);
    return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "";
  }

  return String(val);
}

function thClass(col) {
  return [
    col === "code" ? "col-code" : "",
    col === "produit" ? "col-produit" : "",
    col === "date_creation" ? "col-date" : "",
  ].join(" ");
}

function tdClass(col) {
  return [
    col === "code" ? "col-code codeCell" : "",
    ["prix_achat", "prix_vente", "stock_actuel"].includes(col) ? "numCell" : "",
    col === "produit" ? "col-produit" : "",
    col === "date_creation" ? "col-date" : "",
  ].join(" ");
}

/** Badges statut */
function badgeClass(s) {
  if (s === "Actif") return "badgeOk";
  if (s === "Inactif") return "badgeOff";
  return "badgeNeutral";
}

/** Classes de cellule (optionnel: align numbers) */
function cellClass(col, val) {
  return {
    codeCell: col === "code",
    numCell: ["prix_achat", "prix_vente", "stock_actuel"].includes(col),
  };
}

async function load() {
  const { data } = await axios.get(ENDPOINT);
  columns.value = data.columns || [];
  rows.value = data.rows || [];
}

onMounted(load);
</script>

<style scoped>
/* =========================================================
   ProductCatalogTable.vue — CSS FINAL (header fixe + body scroll)
   Objectif :
   - Coins arrondis parfaits
   - Entête hors scroll (le scroll commence à la 1ère ligne)
   - Tableau "pro" (zebra, hover, typo, spacing)
   - Scroll vertical + horizontal propre
   ========================================================= */

/* Page = layout vertical : topbar + table qui prend le reste */
.page {
  /* ✅ réduit l’espace au-dessus du titre (ajuste si besoin) */
  padding: 0px 8px 10px;

  /* ✅ permet à la zone tableau de prendre tout l’espace restant */
  display: flex;
  flex-direction: column;

  /* ✅ IMPORTANT : si ta page est dans un layout déjà contraint,
     tu peux enlever height:100vh. Sinon, laisse. */
  height: 100vh;
}

.title{
  margin: 0;
  font-size: 30px;     /* plus petit */
  font-weight: 900;
  /*line-height: 1.05;   /* supprime l’air au-dessus */
  line-height: 1;          /* supprime l’air interne */
  letter-spacing: -0.3px;
  position: relative;
  top: -10px;               /* ← REMONTE LE TITRE UNIQUEMENT */
}

/* Bandeau titre + filtres */
.topbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.topbar h2 {
  margin: 0;
  line-height: 1.1;
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
}

/* Filtres (responsive) */
.filters {
  display: grid;
  grid-template-columns: 1fr 220px 180px auto;
  gap: 12px;
  align-items: center;
}

.inp,
.sel {
  height: 44px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  outline: none;
  background: #fff;
  font-size: 15px;
}

.inp:focus,
.sel:focus {
  border-color: #cbd5e1;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.18);
}

.count {
  justify-self: end;
  font-weight: 800;
  font-size: 20px;
  color: #0f172a;
}

/* =========================================================
   WRAPPER GLOBAL : coins arrondis + header fixe + body scroll
   ========================================================= */
.tableWrap {
  /* ✅ Style “card” */
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;

  /* ✅ Coins toujours propres (pas de header qui dépasse) */
  overflow: hidden;

  /* ✅ la table prend tout l’espace restant sous les filtres */
  flex: 1;
  min-height: 0;

  /* ✅ header + body empilés verticalement */
  display: flex;
  flex-direction: column;

  /* petit effet “pro” */
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

/* =========================================================
   HEADER FIXE (HORS SCROLL)
   ========================================================= */
.tableHead {
  flex: 0 0 auto;

  overflow: hidden; /* masque scrollbar */

  /* ✅ séparation visuelle header/body */
  border-bottom: 1px solid #0b1220;

  /* ✅ garde le fond sombre comme sur ta capture */
  background: #0f172a;
}

/* =========================================================
   BODY SCROLLABLE (LE SCROLL EST ICI)
   ========================================================= */
.tableScroll {
  flex: 1;
  min-height: 0;

  /* ✅ scroll vertical + horizontal */
  overflow: auto;

  /* ✅ scroll plus doux */
  scroll-behavior: smooth;

  /* optionnel : améliore le rendu sur certains navigateurs */
  -webkit-overflow-scrolling: touch;
}

/* =========================================================
   TABLE (mêmes règles pour la table du header et du body)
   NOTE : colgroup + table-layout: fixed = alignement parfait
   ========================================================= */
.tbl {
  width: 100%;

  /* ✅ important pour que les largeurs colgroup soient respectées */
  table-layout: fixed;

  /* ✅ permet zebra + bordures clean */
  border-collapse: separate;
  border-spacing: 0;

  /* ✅ scroll horizontal si écran petit */
  min-width: 1100px;
}

/* =========================================================
   ENTÊTE (thead) - compacte et lisible
   ========================================================= */
.tbl thead th { /* entête cliquable */
  color: #ffffff;
  background: transparent; /* le fond est sur .tableHead */
  text-align: center;
  cursor: pointer;
  user-select: none;

  /* ✅ hauteur entête plus petite */
  padding: 10px 14px;

  /* ✅ rend le texte compact */
  line-height: 1.1;

  font-weight: 900;
  font-size: 14px;

  /* ✅ séparation entre colonnes */
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}


.tbl thead th:hover {
  background: rgba(255, 255, 255, 0.06);
}

.thWrap{
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

/* icône de tri (petit chevron) */
.sortIcon{
  width: 0;
  height: 0;
  opacity: 0.85;
}

.sortIcon.none{
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(255,255,255,0.35); /* petit indicateur neutre */
  transform: translateY(1px);
}

.sortIcon.asc{
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 7px solid #ffffff;
}

.sortIcon.desc{
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid #ffffff;
}

.tbl thead th:last-child {
  border-right: none;
}

/* =========================================================
   LIGNES DU BODY
   ========================================================= */
.tbl tbody td {
  padding: 18px 14px;
  border-bottom: 1px solid #eef2f7;
  color: #0f172a;
  background: #ffffff;

  /* évite des retours à la ligne “agressifs” */
  vertical-align: middle;
}

/* Zebra doux */
.tbl tbody tr:nth-child(odd) td {
  background: #fbfdff;
}

/* Hover (ça fait très “pro”) */
.tbl tbody tr:hover td {
  background: #f1f5ff;
}

/* Colonne code (si tu l’utilises) */
.codeCell {
  font-weight: 900;
}

/* Nombres alignés à droite (prix, stock) */
.numCell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* =========================================================
   BADGES (statut)
   ========================================================= */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 900;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badgeOk {
  background: #eafff0;
  border-color: #86efac;
  color: #065f46;
}

.badgeOff {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #9f1239;
}

.badgeNeutral {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #0f172a;
}

/* Ligne vide */
.empty {
  text-align: center;
  padding: 26px;
  color: #64748b;
  font-weight: 800;
}

/* =========================================================
   SCROLLBAR (optionnel, joli)
   NOTE: marche surtout sur Chrome/Edge
   ========================================================= */
.tableScroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.tableScroll::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.tableScroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.tableScroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */
@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr;
  }
  .count {
    justify-self: start;
  }
  .topbar h2 {
    font-size: 22px;
  }
  .tbl {
    min-width: 900px; /* un peu moins large sur mobile */
  }
}

</style>
