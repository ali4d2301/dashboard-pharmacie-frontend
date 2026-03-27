<template>
  <div ref="historyShell" class="page">
    <div class="header">
      <div class="filters">
        <div class="filters-row" :class="{ 'filters-row--fullscreen': isFullscreen }">
          <button class="btn fs-btn" type="button" @click="toggleFullscreen">
            {{ isFullscreen ? "Quitter plein écran" : "Plein écran" }}
          </button>

          <div v-if="isFullscreen" class="field field--period">
            <label>Période</label>

            <div class="period-inline">
              <div class="period-part">
                <span class="period-part-label">Du</span>
                <input
                  class="control control--date"
                  type="date"
                  v-model="dateFrom"
                  :max="dateTo || null"
                  @change="normalizeDateRange('from')"
                />
              </div>

              <div class="period-part">
                <span class="period-part-label">Au</span>
                <input
                  class="control control--date"
                  type="date"
                  v-model="dateTo"
                  :min="dateFrom || null"
                  @change="normalizeDateRange('to')"
                />
              </div>
            </div>
          </div>

          <div class="field field--product">
            <label>Produit</label>
            <input
              class="control"
              type="text"
              v-model="q"
              placeholder="Rechercher par produit ou numéro de lot"
            />
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

          <button
            v-if="!isFullscreen"
            class="btn primary"
            @click="exportExcel"
            :disabled="rows.length === 0"
          >
            Export Excel
          </button>

          <span class="pill">
            {{ loading ? "Chargement..." : rows.length + " lignes" }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="notice notice--error" role="alert">
      {{ errorMessage }}
    </p>

    <div class="table-wrap">
      <div ref="tableHeadEl" class="table-head-scroll" :style="tableHeadStyle">
        <table class="tbl tbl-head">
          <colgroup>
            <col v-for="col in cols" :key="col.key" :style="getColumnWidthStyle(col)" />
          </colgroup>
          <thead>
            <tr>
              <th
                v-for="(col, colIndex) in cols"
                :key="col.key"
                :class="[
                  'th',
                  'sortable',
                  { 'th--numeric': isNumericColumn(col.key) },
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
        </table>
      </div>

      <div ref="tableBodyEl" class="table-body-scroll" @scroll="syncScroll">
        <table class="tbl tbl-body">
          <colgroup>
            <col v-for="col in cols" :key="col.key" :style="getColumnWidthStyle(col)" />
          </colgroup>
          <tbody>
            <tr
              v-for="(r, idx) in rows"
              :key="getRowKey(r, idx)"
              class="data-row"
              :class="{ 'data-row--selected': isRowSelected(r, idx) }"
              :aria-selected="isRowSelected(r, idx) ? 'true' : 'false'"
              tabindex="0"
              @click="handleRowClick($event, r, idx)"
              @keydown.enter.prevent="toggleRowSelection(r, idx)"
              @keydown.space.prevent="toggleRowSelection(r, idx)"
            >
              <td class="sticky-col sticky-col-1" :style="getBodyCellStyle(0)">
                {{ fmtDateISOToFR(r.date_mvt) }}
              </td>
              <td class="strong sticky-col sticky-col-2" :style="getBodyCellStyle(1)">{{ r.nom_produit }}</td>
              <td>{{ r.code_prod || "" }}</td>
              <td>{{ r.numero_lot || "" }}</td>
              <td>{{ fmtDateISOToFR(r.date_peremption) }}</td>
              <td>{{ r.forme || "" }}</td>
              <td>{{ r.dosage || "" }}</td>
              <td>{{ r.classe || "" }}</td>
              <td>{{ r.unite || "" }}</td>
              <td class="num">{{ fmtInt(r.stock_initial) }}</td>
              <td>{{ formatTypeLabel(r.type_mouvement) }}</td>
              <td>{{ formatMovementLabel(r.mouvement) }}</td>
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
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import api from "@/services/api";

const props = defineProps({
  dateFrom: {
    type: String,
    default: "",
  },
  dateTo: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:dateFrom", "update:dateTo"]);

const rows = ref([]);
const loading = ref(false);
const errorMessage = ref("");

const limit = ref(5000);

const dateFrom = computed({
  get: () => props.dateFrom,
  set: (value) => emit("update:dateFrom", value),
});

const dateTo = computed({
  get: () => props.dateTo,
  set: (value) => emit("update:dateTo", value),
});

const q = ref("");
const classe = ref("ALL");
const cible = ref("ALL");

const classes = ref([]);
const cibles = ref([]);

const sortBy = ref("date_mvt");
const sortDir = ref("desc");
const selectedRowKeys = ref([]);
const historyShell = ref(null);
const tableHeadEl = ref(null);
const tableBodyEl = ref(null);
const headScrollbarWidth = ref(0);
const isFullscreen = ref(false);
const savedPageScrollY = ref(0);
const savedPageScrollX = ref(0);
let colResizeState = null;
const tableHeadStyle = computed(() => ({
  "--head-scrollbar-width": `${headScrollbarWidth.value}px`,
}));

const TYPE_LABELS = {
  entree: "Entrée",
  sortie: "Sortie",
};

const MOUVEMENT_LABELS = {
  acquision: "Acquision",
  achat: "Acquision",
  don: "Acquision",
  "ajustement positif": "Ajustement positif",
  dispensation: "Dispensation",
  vente: "Dispensation",
  perte: "Perte",
  peremption: "Péremption",
  "ajustement negatif": "Ajustement négatif",
};

function fmtDateISOToFR(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function fmtInt(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("fr-FR");
}

function getRowKey(row, idx) {
  if (row?.id_mvt_source !== null && row?.id_mvt_source !== undefined && row?.id_mvt_source !== "") {
    return String(row.id_mvt_source);
  }

  return JSON.stringify([
    row?.date_mvt ?? "",
    row?.nom_produit ?? "",
    row?.code_prod ?? "",
    row?.numero_lot ?? "",
    row?.date_peremption ?? "",
    row?.type_mouvement ?? "",
    row?.mouvement ?? "",
    row?.quantite ?? "",
    row?.stock_initial ?? "",
    row?.stock_apres ?? "",
    idx,
  ]);
}

function isRowSelected(row, idx) {
  return selectedRowKeys.value.includes(getRowKey(row, idx));
}

function toggleRowSelection(row, idx, { additive = false } = {}) {
  const rowKey = getRowKey(row, idx);
  const hasRow = selectedRowKeys.value.includes(rowKey);

  if (additive) {
    selectedRowKeys.value = hasRow
      ? selectedRowKeys.value.filter((key) => key !== rowKey)
      : [...selectedRowKeys.value, rowKey];
    return;
  }

  if (hasRow) {
    selectedRowKeys.value = selectedRowKeys.value.filter((key) => key !== rowKey);
    return;
  }

  selectedRowKeys.value = [rowKey];
}

function handleRowClick(event, row, idx) {
  toggleRowSelection(row, idx, {
    additive: Boolean(event?.ctrlKey || event?.metaKey),
  });
}

function formatTypeLabel(value) {
  return TYPE_LABELS[value] ?? value ?? "";
}

function formatMovementLabel(value) {
  return MOUVEMENT_LABELS[value] ?? value ?? "";
}

function isNumericColumn(key) {
  return ["stock_initial", "quantite", "stock_apres"].includes(key);
}

function normalizeDateRange(changedSide) {
  if (!dateFrom.value || !dateTo.value) return;
  if (dateFrom.value <= dateTo.value) return;

  if (changedSide === "from") {
    dateTo.value = dateFrom.value;
    return;
  }

  dateFrom.value = dateTo.value;
}

function handleFullscreenChange() {
  const wasFullscreen = isFullscreen.value;
  isFullscreen.value = document.fullscreenElement === historyShell.value;

  requestAnimationFrame(() => {
    updateHeadScrollbarWidth();
    syncScroll();
  });

  if (!isFullscreen.value && wasFullscreen) {
    setTimeout(() => {
      window.scrollTo({
        top: savedPageScrollY.value,
        left: savedPageScrollX.value,
        behavior: "auto",
      });
    }, 0);
  }
}

async function toggleFullscreen() {
  const el = historyShell.value;
  if (!el || !document?.fullscreenEnabled) return;

  try {
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    savedPageScrollY.value = window.scrollY || window.pageYOffset || 0;
    savedPageScrollX.value = window.scrollX || window.pageXOffset || 0;
    await el.requestFullscreen();
  } catch {
    // no-op
  }
}

const queryParams = computed(() => ({
  date_from: dateFrom.value,
  date_to: dateTo.value,
  q: q.value.trim(),
  classe: classe.value,
  cible: cible.value,
  sort_by: sortBy.value,
  sort_dir: sortDir.value,
  limit: limit.value,
}));

const queryKey = computed(() => JSON.stringify(queryParams.value));
const filtersQueryKey = computed(() =>
  JSON.stringify({
    date_from: dateFrom.value,
    date_to: dateTo.value,
  })
);

function isRequestCanceled(err) {
  return err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
}

function getRequestErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => String(item?.msg || item || "").trim())
      .filter(Boolean)
      .join(" ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  return fallback;
}

function useAutoRemoteMovements({ keyRef, filtersKeyRef, paramsRef }) {
  let debounceTimer = null;
  let rowsAbortCtrl = null;
  let filtersAbortCtrl = null;
  let requestId = 0;
  let hasLoadedFilters = false;

  async function fetchRows({ refreshFilters = false } = {}) {
    requestId += 1;
    const currentRequestId = requestId;

    if (rowsAbortCtrl) rowsAbortCtrl.abort();
    if (filtersAbortCtrl) filtersAbortCtrl.abort();

    rowsAbortCtrl = new AbortController();
    filtersAbortCtrl = refreshFilters ? new AbortController() : null;

    loading.value = true;
    errorMessage.value = "";
    try {
      const rowsRequest = api.get("/api/dashboard/movements", {
        params: paramsRef.value,
        signal: rowsAbortCtrl.signal,
      });

      const filtersRequest = refreshFilters
        ? api.get("/api/dashboard/movements/filters", {
            params: {
              date_from: paramsRef.value.date_from || "",
              date_to: paramsRef.value.date_to || "",
            },
            signal: filtersAbortCtrl.signal,
          })
        : Promise.resolve(null);

      const [rowsResult, filtersResult] = await Promise.allSettled([
        rowsRequest,
        filtersRequest,
      ]);

      if (currentRequestId !== requestId) return;

      if (rowsResult.status === "rejected") {
        throw rowsResult.reason;
      }

      rows.value = rowsResult.value.data.items || [];

      if (filtersResult.status === "fulfilled" && filtersResult.value) {
        classes.value = filtersResult.value.data.classes || [];
        cibles.value = filtersResult.value.data.cibles || [];
        hasLoadedFilters = true;
      } else if (
        filtersResult.status === "rejected" &&
        !isRequestCanceled(filtersResult.reason)
      ) {
        errorMessage.value =
          "Les mouvements sont affiches, mais les filtres n'ont pas pu etre mis a jour.";
      }

      await nextTick();
      updateHeadScrollbarWidth();
      syncScroll();
    } catch (err) {
      if (!isRequestCanceled(err)) {
        rows.value = [];
        errorMessage.value = getRequestErrorMessage(
          err,
          "Chargement de l'historique impossible pour le moment."
        );
        console.error("Erreur chargement dashboard:", err);
      }
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false;
      }
    }
  }

  function scheduleFetch(options = {}) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchRows(options);
    }, 250);
  }

  watch(
    [keyRef, filtersKeyRef],
    ([nextKey, nextFiltersKey], [prevKey, prevFiltersKey]) => {
      const refreshFilters = !hasLoadedFilters || nextFiltersKey !== prevFiltersKey;

      if (nextKey === prevKey && !refreshFilters) {
        return;
      }

      scheduleFetch({ refreshFilters });
    },
    { immediate: true }
  );

  function dispose() {
    clearTimeout(debounceTimer);
    if (rowsAbortCtrl) rowsAbortCtrl.abort();
    if (filtersAbortCtrl) filtersAbortCtrl.abort();
  }

  return { dispose };
}

const remote = useAutoRemoteMovements({
  keyRef: queryKey,
  filtersKeyRef: filtersQueryKey,
  paramsRef: queryParams,
});

watch(rows, (nextRows) => {
  if (selectedRowKeys.value.length === 0) return;

  const availableKeys = new Set(nextRows.map((row, idx) => getRowKey(row, idx)));
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => availableKeys.has(key));
});

onMounted(async () => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  window.addEventListener("resize", updateHeadScrollbarWidth);
  handleFullscreenChange();
  requestAnimationFrame(() => {
    updateHeadScrollbarWidth();
    syncScroll();
  });
});

onBeforeUnmount(() => {
  remote.dispose();
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  window.removeEventListener("resize", updateHeadScrollbarWidth);
  stopColResize();
});

function toggleSort(key) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortDir.value = "asc";
  }
}

function startColResize(event, colIndex) {
  const col = cols.value[colIndex];
  if (!col) return;

  colResizeState = {
    colIndex,
    startX: event.clientX,
    startWidth: col.width,
  };

  window.addEventListener("pointermove", onColResizeMove);
  window.addEventListener("pointerup", stopColResize);
  window.addEventListener("pointercancel", stopColResize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
}

function onColResizeMove(event) {
  if (!colResizeState) return;

  const col = cols.value[colResizeState.colIndex];
  if (!col) return;

  const deltaX = event.clientX - colResizeState.startX;
  const minWidth = col.minWidth ?? 80;
  col.width = Math.max(minWidth, colResizeState.startWidth + deltaX);
}

function stopColResize() {
  if (!colResizeState) return;

  colResizeState = null;
  window.removeEventListener("pointermove", onColResizeMove);
  window.removeEventListener("pointerup", stopColResize);
  window.removeEventListener("pointercancel", stopColResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

function getStickyLeft(colIndex) {
  let left = 0;
  for (let i = 0; i < colIndex; i += 1) {
    left += Number(cols.value[i]?.width || 0);
  }
  return left;
}

function getColumnWidthStyle(col) {
  return {
    width: `${col.width}px`,
    minWidth: `${col.width}px`,
  };
}

function getHeaderCellStyle(col, colIndex) {
  const style = getColumnWidthStyle(col);

  if (colIndex < 2) {
    style.left = `${getStickyLeft(colIndex)}px`;
  }

  return style;
}

function getBodyCellStyle(colIndex) {
  return {
    left: `${getStickyLeft(colIndex)}px`,
  };
}

function syncScroll() {
  if (!tableHeadEl.value || !tableBodyEl.value) return;
  tableHeadEl.value.scrollLeft = tableBodyEl.value.scrollLeft;
}

function updateHeadScrollbarWidth() {
  if (!tableBodyEl.value) return;
  const styles = window.getComputedStyle(tableBodyEl.value);
  const borders =
    (parseFloat(styles.borderLeftWidth || "0") || 0) +
    (parseFloat(styles.borderRightWidth || "0") || 0);

  headScrollbarWidth.value = Math.max(
    0,
    tableBodyEl.value.offsetWidth - tableBodyEl.value.clientWidth - borders
  );
}

async function exportExcel() {
  const XLSX = await import("xlsx");
  const mapped = rows.value.map((r) => ({
    Date: fmtDateISOToFR(r.date_mvt),
    Produit: r.nom_produit,
    Code: r.code_prod,
    "Numéro de lot": r.numero_lot,
    "Date de péremption": fmtDateISOToFR(r.date_peremption),
    Forme: r.forme,
    Dosage: r.dosage,
    Classe: r.classe,
    Cible: r.cible,
    Unité: r.unite,
    "Stock lot initial": r.stock_initial,
    "Prix achat": r.prix_achat,
    "Prix vente": r.prix_vente,
    Type: formatTypeLabel(r.type_mouvement),
    Mouvement: formatMovementLabel(r.mouvement),
    Quantité: r.quantite,
    "Stock lot après": r.stock_apres,
    Commentaire: r.commentaire,
  }));

  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Historique");
  XLSX.writeFile(wb, `historique_mouvements_${dateFrom.value}_au_${dateTo.value}.xlsx`);
}

const cols = ref([
  { key: "date_mvt", label: "Date", width: 100, minWidth: 80 },
  { key: "nom_produit", label: "Produit", width: 180, minWidth: 120 },
  { key: "code_prod", label: "Code", width: 102, minWidth: 84 },
  { key: "numero_lot", label: "Lot", width: 150, minWidth: 120 },
  { key: "date_peremption", label: "Péremption", width: 122, minWidth: 110 },
  { key: "forme", label: "Forme", width: 100, minWidth: 80 },
  { key: "dosage", label: "Dosage", width: 112, minWidth: 86 },
  { key: "classe", label: "Classe", width: 188, minWidth: 145 },
  { key: "unite", label: "Unité", width: 84, minWidth: 74 },
  { key: "stock_initial", label: "Stock lot initial", width: 132, minWidth: 112 },
  { key: "type_mouvement", label: "Type", width: 80, minWidth: 70 },
  { key: "mouvement", label: "Mouvement", width: 122, minWidth: 104 },
  { key: "quantite", label: "Qté", width: 74, minWidth: 66 },
  { key: "stock_apres", label: "Stock lot après", width: 134, minWidth: 114 },
  { key: "commentaire", label: "Commentaire", width: 240, minWidth: 165 },
]);
</script>

<style scoped>
.page {
  width: 100%;
  min-height: 0;
  height: 100%;
  padding: 2px 0 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 10px;
}

.notice {
  margin: 0 0 10px;
  padding: 11px 13px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 700;
}

.notice--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.filters {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid #edf2f7;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.filters-row {
  display: grid;
  width: 100%;
  grid-template-columns:
    max-content
    minmax(220px, 1.35fr)
    minmax(132px, 0.72fr)
    minmax(132px, 0.72fr)
    max-content
    max-content;
  gap: 10px 12px;
  align-items: end;
}

.filters-row--fullscreen {
  grid-template-columns:
    max-content
    minmax(244px, 292px)
    minmax(180px, 1fr)
    minmax(168px, 0.92fr)
    minmax(168px, 0.92fr)
    max-content;
  gap: 8px 10px;
}

.filters-row > * {
  min-width: 0;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field--period {
  min-width: 0;
}

.period-inline {
  display: grid;
  grid-template-columns: repeat(2, minmax(118px, 1fr));
  gap: 6px;
}

.period-part {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.period-part-label {
  display: block;
  padding-left: 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.filters .field label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #64748b;
  line-height: 1;
}

.filters .control {
  width: 100%;
  height: 44px;
  min-width: 0;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.filters .control--date {
  height: 38px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  color: #0f172a;
  letter-spacing: 0;
  font-variant-numeric: normal;
}

.filters .control--date::-webkit-datetime-edit {
  font: inherit;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  color: inherit;
  letter-spacing: 0;
}

.filters .btn {
  height: 44px;
  min-width: 0;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid #dbe2ea;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  font-weight: 800;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.filters .btn.fs-btn {
  width: auto;
  min-width: 0;
  color: #334155;
  justify-self: start;
}

.filters .btn.fs-btn:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.16);
}

.filters .btn.fs-btn:focus-visible {
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
}

.filters .btn.primary {
  width: auto;
  min-width: 0;
  background: #0b1220;
  color: #fff;
  border-color: #0b1220;
  justify-self: start;
}

.pill {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 0;
  max-width: 100%;
  padding: 0 14px;
  justify-self: start;
  border-radius: 999px;
  border: 1px solid #e5edf6;
  background: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #475569;
  white-space: nowrap;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-head-scroll {
  flex: 0 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  padding-right: var(--head-scrollbar-width, 0px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom: none;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f7fc 100%);
}

.table-body-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-top: none;
  border-radius: 0 0 5px 5px;
  background: #fff;
}

.page:fullscreen {
  padding: 18px;
  background: #f8fafc;
}

.page:fullscreen .filters .btn.fs-btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 700;
}

.page:fullscreen .pill {
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.tbl {
  width: max-content;
  min-width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.th {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f7fc 100%);
  color: #475569;
  padding: 12px 16px 12px 12px;
  text-align: left;
  white-space: nowrap;
  border-right: 1px solid #e6edf5;
  border-bottom: 1px solid #d7e0ec;
  transition: background 0.16s ease, color 0.16s ease;
}

.th-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.th--numeric {
  text-align: center;
}

.th--numeric .th-inner {
  width: 100%;
  justify-content: center;
}

.th:hover {
  background: linear-gradient(180deg, #f2f7ff 0%, #eaf2ff 100%);
  color: #1d4ed8;
}

.th:focus-visible,
.th:active {
  background: linear-gradient(180deg, #eef5ff 0%, #e5efff 100%);
  color: #1d4ed8;
}

.th:last-child {
  border-right: none;
}

.col-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
}

.col-resizer::after {
  content: "";
  position: absolute;
  top: 25%;
  bottom: 25%;
  right: 3px;
  width: 2px;
  border-radius: 2px;
  background: rgba(59, 130, 246, 0.28);
  opacity: 0;
  transition: opacity 0.14s ease;
}

.th:hover .col-resizer::after {
  opacity: 1;
}

.th:first-child {
  border-top-left-radius: 14px;
}

.th:last-child {
  border-top-right-radius: 14px;
}

.th.sticky-col,
tbody td.sticky-col {
  position: sticky;
  background-clip: padding-box;
}

.th.sticky-col {
  position: sticky;
  z-index: 4;
}

.th.sticky-col-1 {
  left: 0;
  z-index: 5;
}

.th.sticky-col-2 {
  z-index: 5;
  box-shadow: 8px 0 10px -10px rgba(148, 163, 184, 0.55);
}

tbody td.sticky-col {
  background: #fff;
  z-index: 3;
  box-sizing: border-box;
}

tbody td.sticky-col-1 {
  left: 0;
  z-index: 4;
}

tbody td.sticky-col-2 {
  z-index: 4;
  box-shadow: 8px 0 10px -10px rgba(148, 163, 184, 0.32);
}

.data-row {
  cursor: pointer;
}

.data-row td {
  box-sizing: border-box;
  padding: 13px 12px;
  border-bottom: 1px solid #eef2f7;
  color: #334155;
  vertical-align: top;
  transition: background 0.16s ease, color 0.16s ease;
}

.data-row:hover td {
  background: #f6faff;
}

.data-row:hover td.sticky-col {
  background: #f6faff;
}

.data-row:focus-visible td,
.data-row.data-row--selected td {
  background: #dbeafe;
  color: #1e3a8a;
}

.data-row:focus-visible td.sticky-col,
.data-row.data-row--selected td.sticky-col {
  background: #dbeafe;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sort {
  margin-left: 0;
  font-size: 11px;
  color: #1d4ed8;
  opacity: 0.9;
}

.num {
  text-align: center;
  white-space: nowrap;
}

.strong {
  font-weight: 900;
}

.comment {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
}

.empty {
  text-align: center;
  padding: 22px;
  color: #64748b;
  font-weight: 800;
}

@media (max-width: 1240px) {
  .filters-row {
    grid-template-columns: 168px minmax(220px, 1fr) minmax(150px, 0.85fr) minmax(150px, 0.85fr);
  }

  .filters-row--fullscreen {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field--period {
    grid-column: 1 / -1;
  }

  .filters .btn.primary,
  .pill {
    grid-column: auto;
  }
}

@media (max-width: 1100px) {
  .filters-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .period-inline {
    grid-template-columns: 1fr;
  }

  .filters .btn.fs-btn,
  .filters .btn.primary,
  .pill {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .filters-row {
    grid-template-columns: 1fr;
  }
}
</style>
