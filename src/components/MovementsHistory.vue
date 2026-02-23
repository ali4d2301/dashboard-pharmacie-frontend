<template>
  <div ref="historyShell" class="page">

    <div class="header">

      <!-- Filtres: Grid = zéro chevauchement + mêmes hauteurs -->
      <div class="filters">
        <button class="btn fs-btn" type="button" @click="toggleFullscreen">
          <span v-if="isFullscreen">Quitter<br />plein écran</span>
          <span v-else>Plein<br />écran</span>
        </button>

        <div class="period">
          <div class="field">
            <label>Du</label>
            <input
              class="control control--sm"
              type="date"
              v-model="dateFrom"
              :max="dateTo || null"
              @change="normalizeDateRange('from')"
            />
          </div>

          <div class="field">
            <label>Au</label>
            <input
              class="control control--sm"
              type="date"
              v-model="dateTo"
              :min="dateFrom || null"
              @change="normalizeDateRange('to')"
            />
          </div>
        </div>

        <div class="field field--classe">
          <label>Classe</label>
          <select class="control" v-model="classe">
            <option value="ALL">Tout</option>
            <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="field field--cible">
          <label>Cible</label>
          <select class="control" v-model="cible">
            <option value="ALL">Tout</option>
            <option v-for="c in cibles" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="field field--product">
          <label>Produit</label>
          <input
            class="control"
            type="text"
            v-model="q"
            placeholder="Rechercher par nom produit"
          />
        </div>

        <button class="btn primary" @click="exportExcel" :disabled="rows.length === 0">
          Export Excel
        </button>
        <span class="pill">
          {{ loading ? "Chargement..." : rows.length + " lignes" }} 
        </span>
      </div>

    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th
              v-for="(col, colIndex) in cols"
              :key="col.key"
              :class="[
                'th',
                'sortable',
                { 'sticky-col': colIndex < 2, 'sticky-col-1': colIndex === 0, 'sticky-col-2': colIndex === 1 }
              ]"
              :style="getHeaderCellStyle(col, colIndex)"
              @click="toggleSort(col.key)"
            >
              <div class="th-inner">
                <span>{{ col.label }}</span>
                <span class="sort" v-if="sortBy === col.key">
                  {{ sortDir === "asc" ? "▲" : "▼" }}
                </span>
              </div>
              <span
                class="col-resizer"
                role="separator"
                aria-hidden="true"
                @pointerdown.stop.prevent="startColResize($event, colIndex)"
                @click.stop
              ></span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="sticky-col sticky-col-1">{{ fmtDateISOToFR(r.date_mvt) }}</td>
            <td class="strong sticky-col sticky-col-2" :style="getBodyCellStyle(1)">{{ r.nom_produit }}</td>
            <td>{{ r.forme || "" }}</td>
            <td>{{ r.dosage || "" }}</td>
            <td>{{ r.classe || "" }}</td>
            <td>{{ r.cible || "" }}</td>
            <td>{{ r.unite || "" }}</td>
            <td class="num">{{ fmtInt(r.prix_achat) }}</td>
            <td class="num">{{ fmtInt(r.prix_vente) }}</td>
            <td>{{ r.type_mouvement }}</td>
            <td>{{ r.mouvement }}</td>
            <td class="num">{{ fmtInt(r.quantite) }}</td>
            <td class="num">{{ fmtInt(r.stock_apres) }}</td>
            <td class="comment">{{ r.commentaire || "" }}</td>
          </tr>

          <tr v-if="!loading && rows.length === 0">
            <td :colspan="cols.length" class="empty">Aucune donnée sur cette période.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from "vue"
import * as XLSX from "xlsx"
import api from "@/services/api";

const rows = ref([])
const loading = ref(false)

const limit = ref(5000)

const dateFrom = ref("")
const dateTo = ref("")
const q = ref("")
const classe = ref("ALL")
const cible = ref("ALL")

const classes = ref([])
const cibles = ref([])

const sortBy = ref("date_mvt")
const sortDir = ref("desc")
const historyShell = ref(null)
const isFullscreen = ref(false)
let colResizeState = null

function toISODate(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function setDefault90Days() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 90)
  dateTo.value = toISODate(now)
  dateFrom.value = toISODate(start)
}

function normalizeDateRange(changedSide) {
  if (!dateFrom.value || !dateTo.value) return
  if (dateFrom.value <= dateTo.value) return

  if (changedSide === "from") {
    dateTo.value = dateFrom.value
    return
  }
  if (changedSide === "to") {
    dateFrom.value = dateTo.value
  }
}

function fmtDateISOToFR(iso) {
  if (!iso) return ""
  const s = String(iso).slice(0, 10)
  const [y, m, d] = s.split("-")
  if (!y || !m || !d) return s
  return `${d}/${m}/${y}`
}

function fmtInt(v) {
  if (v === null || v === undefined || v === "") return ""
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString("fr-FR")
}

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === historyShell.value
}

async function toggleFullscreen() {
  const el = historyShell.value
  if (!el || !document?.fullscreenEnabled) return

  try {
    if (document.fullscreenElement === el) {
      await document.exitFullscreen()
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }

    await el.requestFullscreen()
  } catch {
    // no-op
  }
}

/*-> Dès que ces refs changent, ce computed change aussi.
========================= */
const queryParams = computed(() => ({
  date_from: dateFrom.value,
  date_to: dateTo.value,
  q: q.value?.trim() || "",
  classe: classe.value,
  cible: cible.value,
  sort_by: sortBy.value,
  sort_dir: sortDir.value,
  limit: limit.value,
}))

/* Petite clé stable : si elle change => on recharge (sans @change, sans watch dans le composant) */
const queryKey = computed(() => JSON.stringify(queryParams.value))

/* =========================
   2) COMPOSABLE INTERNE “PULL”
   -> C’est lui qui gère l’auto-reload.
   -> Ton composant, lui, reste “propre”.
========================= */
function useAutoRemoteMovements({ keyRef, paramsRef }) {
  let debounceTimer = null
  let abortCtrl = null
  let lastKey = ""
  
  async function fetchRows() {
    // Annule l'appel précédent si l'utilisateur change vite les filtres
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    loading.value = true;

    try {
      // --- mouvements ---
      const res = await api.get("/api/dashboard/movements", {
        params: paramsRef.value,
        signal: abortCtrl.signal,
      });

      rows.value = res.data.items || [];

      // --- filtres (dépendent surtout de la période) ---
      const resF = await api.get("/api/dashboard/movements/filters", {
        params: {
          date_from: paramsRef.value.date_from || "",
          date_to: paramsRef.value.date_to || "",
        },
        signal: abortCtrl.signal,
      });

      classes.value = resF.data.classes || [];
      cibles.value = resF.data.cibles || [];

    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("Erreur chargement dashboard:", err);
      }
    } finally {
      loading.value = false;
    }
  }


  // IMPORTANT :
  // - Aucun watch dans le composant
  // - Mais on “branche” un micro-cycle de polling intelligent
  //   qui détecte les changements de keyRef (comme certains composants de table le font)
  function startAuto() {
    const tick = () => {
      const k = keyRef.value
      if (k !== lastKey) {
        lastKey = k
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(fetchRows, 250) // debounce global
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return { startAuto, fetchRows }
}

/* =========================
   3) BOOTSTRAP
========================= */
const remote = useAutoRemoteMovements({ keyRef: queryKey, paramsRef: queryParams })

onMounted(async () => {
  document.addEventListener("fullscreenchange", handleFullscreenChange)
  handleFullscreenChange()
  setDefault90Days()
  remote.startAuto()   // <- auto-reload “comme ProductCatalogTable”
  await remote.fetchRows() // premier chargement immédiat
})

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange)
  stopColResize()
})

/* =========================
   Actions UI (tri + export)
   -> On NE rappelle PLUS reload() : changer sortBy/sortDir suffit.
========================= */
function toggleSort(key) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc"
  } else {
    sortBy.value = key
    sortDir.value = "asc"
  }
  // pas de reload() ici : queryKey change => auto
}

function startColResize(event, colIndex) {
  const col = cols.value[colIndex]
  if (!col) return

  colResizeState = {
    colIndex,
    startX: event.clientX,
    startWidth: col.width,
  }

  window.addEventListener("pointermove", onColResizeMove)
  window.addEventListener("pointerup", stopColResize)
  window.addEventListener("pointercancel", stopColResize)
  document.body.style.userSelect = "none"
  document.body.style.cursor = "col-resize"
}

function onColResizeMove(event) {
  if (!colResizeState) return

  const col = cols.value[colResizeState.colIndex]
  if (!col) return

  const deltaX = event.clientX - colResizeState.startX
  const minWidth = col.minWidth ?? 80
  col.width = Math.max(minWidth, colResizeState.startWidth + deltaX)
}

function stopColResize() {
  if (!colResizeState) return

  colResizeState = null
  window.removeEventListener("pointermove", onColResizeMove)
  window.removeEventListener("pointerup", stopColResize)
  window.removeEventListener("pointercancel", stopColResize)
  document.body.style.userSelect = ""
  document.body.style.cursor = ""
}

function getStickyLeft(colIndex) {
  let left = 0
  for (let i = 0; i < colIndex; i++) {
    left += Number(cols.value[i]?.width || 0)
  }
  return left
}

function getHeaderCellStyle(col, colIndex) {
  const style = {
    width: `${col.width}px`,
    minWidth: `${col.width}px`,
  }
  if (colIndex < 2) {
    style.left = `${getStickyLeft(colIndex)}px`
  }
  return style
}

function getBodyCellStyle(colIndex) {
  return { left: `${getStickyLeft(colIndex)}px` }
}

function exportExcel() {
  const mapped = rows.value.map(r => ({
    Date: fmtDateISOToFR(r.date_mvt),
    Produit: r.nom_produit,
    Forme: r.forme,
    Dosage: r.dosage,
    Classe: r.classe,
    Cible: r.cible,
    "Unité": r.unite,
    "Prix achat": r.prix_achat,
    "Prix vente": r.prix_vente,
    Type: r.type_mouvement,
    Mouvement: r.mouvement,
    "Quantité": r.quantite,
    "Stock après": r.stock_apres,
    Commentaire: r.commentaire,
  }))

  const ws = XLSX.utils.json_to_sheet(mapped)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Historique")
  XLSX.writeFile(wb, `historique_mouvements_${dateFrom.value}_au_${dateTo.value}.xlsx`)
}

/* Expose au template (si besoin) */
const cols = ref([
  { key: "date_mvt", label: "Date", width: 100, minWidth: 80 },
  { key: "nom_produit", label: "Produit", width: 180, minWidth: 120 },
  { key: "forme", label: "Forme", width: 100, minWidth: 80 },
  { key: "dosage", label: "Dosage", width: 112, minWidth: 86 },
  { key: "classe", label: "Classe", width: 188, minWidth: 145 },
  { key: "cible", label: "Cible", width: 188, minWidth: 145 },
  { key: "unite", label: "Unité", width: 84, minWidth: 74 },
  { key: "prix_achat", label: "Prix achat", width: 102, minWidth: 90 },
  { key: "prix_vente", label: "Prix vente", width: 102, minWidth: 90 },
  { key: "type_mouvement", label: "Type", width: 80, minWidth: 70 },
  { key: "mouvement", label: "Mouvement", width: 122, minWidth: 104 },
  { key: "quantite", label: "Qté", width: 74, minWidth: 66 },
  { key: "stock_apres", label: "Stock après", width: 112, minWidth: 92 },
  { key: "commentaire", label: "Commentaire", width: 240, minWidth: 165 },
])

</script>


<style scoped>
/* Page: pas d’espace inutile en haut */
.page{
  padding: 0px 16px 16px;
  height: 100vh;          /* hauteur EXACTE de l’écran */
  overflow:hidden;        /* empêche le scroll de la page */
  display: flex;          /* permet aux enfants d’utiliser flex */
  flex-direction: column; /* empile header, filtres, tableau */
}

/* Header: titre + bloc à droite */
.header{
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 6px;
}

.period{
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex: 0 0 288px;
  min-width: 0;
}

/* Badge 5000 lignes à droite */
.pill{
  height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.12);
  background: #fff;
  font-size: 11px;
  white-space: nowrap;
}

/* Champs: harmonisation (même police/hauteur) */
.field{ display: grid; gap: 6px; min-width: 0; }

.filters .field label{
  font-size: 13px;
  opacity: 0.75;
  line-height: 1;
}

.filters .control{
  height: 46px;                 /* hauteur identique partout */
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(30,60,120,0.18);
  background: #fff;
  outline: none;
  font-size: 15px;
  box-sizing: border-box;
}

/* Dates plus petites mais mêmes styles (harmonisation demandée) */
.filters .control--sm{
  height: 45px;                 /* <- dates plus basses */
  font-size: 14px;
}

/* Harmoniser le texte dans les <input type="date"> (Chrome/Windows) */
.period input[type="date"]{
  font-family: inherit;
  font-size: 15px;          /* ajuste si tu veux */
  font-weight: 700;
  letter-spacing: 0;
  font-variant-numeric: normal;
  -webkit-font-smoothing: antialiased;
}

/* Optionnel: certains navigateurs utilisent un sous-champ interne */
.period input[type="date"]::-webkit-datetime-edit{
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

/* Dates lisibles */
.period .field{
  flex: 1 1 0;
  min-width: 0;
}

.period .control{
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  max-width: none;
}

/* Filtres: flex maitrisé pour garder tous les éléments visibles */
.filters{
  display: flex;
  width: 100%;
  gap: 6px;
  align-items: end;
  margin: 0;
  flex: 0 0 auto;
}

.filters > *{
  min-width: 0;
}

.field--classe{
  flex: 0 0 168px;
}

.field--cible{
  flex: 0 0 156px;
}

/* Table: doit prendre tout l'espace restant */
.table-wrap{
  flex: 1;            /* <-- prend le reste de la hauteur */
  min-height: 0;      /* <-- indispensable pour que le scroll marche en flex */
  overflow: auto;     /* <-- scroll interne */

  border-radius: 5px;
  border: 1px solid rgba(0,0,0,0.10);
  background: #fff;
}

.field--product{
  flex: 0 1 220px;
  min-width: 0;
}

.filters .btn{
  height: 44px;
  min-width: 0px;
  padding: 0 8px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.14);
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
}

.filters .btn.fs-btn{
  width: 80px;
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 500;
  white-space: normal;
  line-height: 1.05;
  text-align: center;
}

.filters .btn.fs-btn:hover{
  border-color: #1d4ed8;
  background: #dbeafe;
  box-shadow: 0 3px 10px rgba(29, 78, 216, 0.18);
}

.filters .btn.fs-btn:focus-visible{
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
}

.filters .btn.primary{
  width: 90px;
  padding: 0 6px;
  font-size: 11px;
  background: #0b1220;
  color: #fff;
  border-color: #0b1220;
}

.page:fullscreen{
  padding-top: 22px;
  background: #f8fafc;
}

.pill{
  margin-left: auto;
  justify-self: auto;
}


.tbl{
  width: max-content;
  min-width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 15px;
}


.th{
  position: sticky;
  top: 0;
  z-index: 2;
  background: #0b1220;
  color: #fff;
  padding: 12px 16px 12px 12px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.th-inner{
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.col-resizer{
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
}

.col-resizer::after{
  content: "";
  position: absolute;
  top: 25%;
  bottom: 25%;
  right: 3px;
  width: 2px;
  border-radius: 2px;
  background: rgba(255,255,255,0.32);
  opacity: 0;
  transition: opacity 0.14s ease;
}

.th:hover .col-resizer::after{
  opacity: 1;
}

.th:first-child{ border-top-left-radius: 14px; }
.th:last-child{ border-top-right-radius: 14px; }

/* Colonnes figées (Date + Produit) */
.th.sticky-col,
tbody td.sticky-col{
  position: sticky;
  background-clip: padding-box;
}

.th.sticky-col{
  z-index: 4;
}

.th.sticky-col-1{
  left: 0;
  z-index: 5;
}

.th.sticky-col-2{
  z-index: 5;
  box-shadow: 8px 0 10px -10px rgba(11, 18, 32, 0.45);
}

tbody td.sticky-col{
  background: #fff;
  z-index: 3;
}

tbody td.sticky-col-1{
  left: 0;
  z-index: 4;
}

tbody td.sticky-col-2{
  z-index: 4;
  box-shadow: 8px 0 10px -10px rgba(11, 18, 32, 0.2);
}

tbody td{
  padding: 12px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  vertical-align: top;
}

tbody tr:hover td{
  background: #f6f8fb;
}

tbody tr:hover td.sticky-col{
  background: #f6f8fb;
}

.sortable{ cursor: pointer; user-select: none; }
.sort{ margin-left: 0; font-size: 12px; opacity: 0.9; }

.num{ text-align: right; white-space: nowrap; }
.strong{ font-weight: 900; }

.comment{
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
}

.empty{
  text-align: center;
  padding: 18px;
  opacity: 0.7;
}

/* Responsive tablette */
@media (max-width: 1100px){
  .title{ font-size: 28px; }

  .headerRight{
    flex-wrap: wrap;         /* badge + dates passent proprement */
    justify-content: flex-end;
  }

  .filters{
    flex-wrap: wrap;
  }

  .period,
  .field--classe,
  .field--cible,
  .field--product{
    flex: 1 1 260px;
  }

  .filters .btn{
    width: auto;
  }

  .filters .btn.fs-btn,
  .filters .btn.primary{
    width: 160px;
  }

  .period{
    flex-wrap: nowrap;
  }

  .period .control{
    width: 100%;
    max-width: none;
  }

  .pill{
    margin-left: 0;
  }
}

/* Mobile */
@media (max-width: 640px){
  .header{
    flex-direction: column;
    align-items: flex-start;
  }

  .headerRight{
    width: 100%;
    justify-content: flex-start;
  }

  .filters{
    flex-direction: column;
    align-items: stretch;
  }

  .period,
  .field--classe,
  .field--cible,
  .field--product,
  .filters .btn,
  .filters .btn.fs-btn,
  .filters .btn.primary{
    width: 100%;
    flex: 0 0 auto;
  }
}
</style>
