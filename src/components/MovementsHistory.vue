<template>
  <div class="page">

    <div class="header">

      <!-- Filtres: Grid = zéro chevauchement + mêmes hauteurs -->
      <div class="filters">

        <div class="period">
          <div class="field">
            <label>Du</label>
            <input class="control control--sm" type="date" v-model="dateFrom" />
          </div>

          <div class="field">
            <label>Au</label>
            <input class="control control--sm" type="date" v-model="dateTo" />
          </div>
        </div>

        <div class="field">
          <label>Classe</label>
          <select class="control" v-model="classe">
            <option value="ALL">Tout</option>
            <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="field">
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
              v-for="col in cols"
              :key="col.key"
              class="th sortable"
              :style="{ width: col.width }"
              @click="toggleSort(col.key)"
            >
              <span>{{ col.label }}</span>
              <span class="sort" v-if="sortBy === col.key">
                {{ sortDir === "asc" ? "▲" : "▼" }}
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td>{{ fmtDateISOToFR(r.date_mvt) }}</td>
            <td class="strong">{{ r.nom_produit }}</td>
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
import { ref, computed, onMounted } from "vue"
import * as XLSX from "xlsx"

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
    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()

    loading.value = true
    try {
      // --- mouvements ---
      const u = new URL(import.meta.env.VITE_API_BASE + "/api/dashboard/movements")
      Object.entries(paramsRef.value).forEach(([k, v]) => {
        if (v === null || v === undefined) return
        if (typeof v === "string" && v.trim() === "") return
        u.searchParams.set(k, v)
      })

      const res = await fetch(u.toString(), { signal: abortCtrl.signal })
      const data = await res.json()
      rows.value = data.items || []

      // --- filtres (dépendent surtout de la période) ---
      const uf = new URL(import.meta.env.VITE_API_BASE + "/api/dashboard/movements/filters")
      uf.searchParams.set("date_from", paramsRef.value.date_from || "")
      uf.searchParams.set("date_to", paramsRef.value.date_to || "")

      const resF = await fetch(uf.toString(), { signal: abortCtrl.signal })
      const dataF = await resF.json()
      classes.value = dataF.classes || []
      cibles.value = dataF.cibles || []
    } finally {
      loading.value = false
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
  setDefault90Days()
  remote.startAuto()   // <- auto-reload “comme ProductCatalogTable”
  await remote.fetchRows() // premier chargement immédiat
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
const cols = [
  { key: "date_mvt", label: "Date", width: "110px" },
  { key: "nom_produit", label: "Produit", width: "240px" },
  { key: "forme", label: "Forme", width: "160px" },
  { key: "dosage", label: "Dosage", width: "120px" },
  { key: "classe", label: "Classe", width: "200px" },
  { key: "cible", label: "Cible", width: "200px" },
  { key: "unite", label: "Unité", width: "90px" },
  { key: "prix_achat", label: "Prix achat", width: "110px" },
  { key: "prix_vente", label: "Prix vente", width: "110px" },
  { key: "type_mouvement", label: "Type", width: "90px" },
  { key: "mouvement", label: "Mouvement", width: "130px" },
  { key: "quantite", label: "Qté", width: "80px" },
  { key: "stock_apres", label: "Stock après", width: "120px" },
  { key: "commentaire", label: "Commentaire", width: "260px" },
]

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
  margin: 0 0 12px;
}

.period{
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

/* Badge 5000 lignes à droite */
.pill{
  height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.12);
  background: #fff;
  font-size: 13px;
  white-space: nowrap;
}

/* Champs: harmonisation (même police/hauteur) */
.field{ display: grid; gap: 6px; }

label{
  font-size: 13px;
  opacity: 0.75;
  line-height: 1;
}

.control{
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
.control--sm{
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

/* Largeur date fixe = pas de chevauchement */
.period .control{
  min-width: 0;
  max-width: 130px;
}

/* Filtres: grid => zéro chevauchement garanti */
.filters{
  display: grid;
  grid-template-columns: auto auto auto 1fr auto auto;
  gap: 8px;
  align-items: end;
  margin: 0;
  flex: 0 0 auto;
}

/* Table: doit prendre tout l'espace restant */
.table-wrap{
  flex: 1;            /* <-- prend le reste de la hauteur */
  min-height: 0;      /* <-- indispensable pour que le scroll marche en flex */
  overflow: auto;     /* <-- scroll interne */

  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.10);
  background: #fff;
}

.field--product{
  min-width: 0;
}

.btn{
  height: 46px;
  min-width: 0px;
  padding: 0 10px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.14);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  font-weight: 700;
  white-space: nowrap;
}

.btn.primary{
  background: #0b1220;
  color: #fff;
  border-color: #0b1220;
}


.tbl{
  width: 100%;
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
  padding: 12px 12px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.th:first-child{ border-top-left-radius: 14px; }
.th:last-child{ border-top-right-radius: 14px; }

tbody td{
  padding: 12px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  vertical-align: top;
}

tbody tr:hover{
  background: rgba(15, 23, 42, 0.04);
}

.sortable{ cursor: pointer; user-select: none; }
.sort{ margin-left: 8px; font-size: 12px; opacity: 0.9; }

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
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: auto;
  }

  .btn{
    width: 100%;
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

  .period{
    width: 100%;
    flex-wrap: wrap;
  }

  .period .control{
    width: 100%;
    min-width: 0;
  }

  .filters{
    grid-template-columns: 1fr;
  }
}
</style>
