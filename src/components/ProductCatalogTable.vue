<template>
  <div ref="catalogShell" class="page" :style="pageStyle">
    <div class="topbar">
      <div class="titleRow">
        <h2 class="title">Référentiel produits</h2>
      </div>

      <div class="filters">
        <div class="filtersLeft">
          <button type="button" class="fsBtn" @click="toggleFullscreen">
            {{ isFullscreen ? "Quitter plein écran" : "Plein écran" }}
          </button>

          <input
            v-model="q"
            class="inp"
            placeholder="Rechercher (code, produit, classe...)"
          />
        </div>

        <div class="filtersRight">
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
    </div>

    <div class="tableHead" ref="headEl" :style="tableHeadStyle">
      <table class="tbl" :style="tableStyle">
        <colgroup>
          <col v-for="col in columns" :key="col" :style="colStyle(col)" />
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col"
              :class="thClass(col)"
              :style="stickyStyle(col)"
              @click="toggleSort(col)"
              role="button"
              tabindex="0"
            >
              <span class="thWrap">
                {{ label(col) }}
                <span class="sortIcon" :class="sortIconClass(col)"></span>
              </span>
              <button
                type="button"
                class="colResizeHandle"
                tabindex="-1"
                :aria-label="`Ajuster la largeur de la colonne ${label(col)}`"
                @pointerdown="startColumnResize(col, $event)"
                @click.stop
                @dblclick.stop="resetColumnWidth(col)"
              ></button>
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <div class="tableWrap">
      <div class="tableScroll" ref="bodyEl" @scroll="syncScroll">
        <table class="tbl" :style="tableStyle">
          <colgroup>
            <col v-for="col in columns" :key="col" :style="colStyle(col)" />
          </colgroup>
          <tbody>
            <tr
              v-for="(r, idx) in filteredRows"
              :key="getRowKey(r, idx)"
              class="tableRow"
              :class="{ 'tableRow--selected': isRowSelected(r, idx) }"
              :aria-selected="isRowSelected(r, idx) ? 'true' : 'false'"
              tabindex="0"
              @click="handleRowClick($event, r, idx)"
              @keydown.enter.prevent="toggleRowSelection(r, idx)"
              @keydown.space.prevent="toggleRowSelection(r, idx)"
            >
              <td v-for="col in columns" :key="col" :class="tdClass(col)" :style="stickyStyle(col)">
                <template v-if="col === 'statut'">
                  <span class="badge" :class="badgeClass(r.statut)">{{ r.statut || "" }}</span>
                </template>
                <template v-else-if="col === 'prochaine_peremption'">
                  <span
                    class="expiry-date"
                    :class="expiryDateClasses(r.prochaine_peremption)"
                    :style="expiryDateStyle(r.prochaine_peremption)"
                  >
                    {{ formatCell(col, r[col]) || "-" }}
                  </span>
                </template>
                <template v-else-if="col === 'stock_actuel'">
                  <span class="stock-current-value">{{ formatCell(col, r[col]) }}</span>
                </template>
                <template v-else-if="col === 'stock_peremption_proche'">
                  <span class="stock-expiring-value">{{ formatCell(col, r[col]) }}</span>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import api from "@/services/api";

const columns = ref([]);
const rows = ref([]);
const q = ref("");
const classe = ref("ALL");
const statut = ref("ALL");
const sortBy = ref("");
const sortDir = ref("asc");
const selectedRowKeys = ref([]);
const headEl = ref(null);
const bodyEl = ref(null);
const headScrollbarWidth = ref(0);
const catalogShell = ref(null);
const isFullscreen = ref(false);
const savedPageScrollY = ref(0);
const savedPageScrollX = ref(0);
const shellHeight = ref(null);
const columnWidths = ref({});

const NUM_COLS = new Set([
  "prix_achat",
  "prix_vente",
  "stock_actuel",
  "lots_count",
  "stock_peremption_proche",
]);
const CENTER_COLS = new Set([
  "lots_count",
  "prochaine_peremption",
  "stock_peremption_proche",
  "statut",
  "date_mise_a_jour",
]);
const pageStyle = computed(() => ({
  "--catalog-shell-height": shellHeight.value ? `${shellHeight.value}px` : "auto",
}));
const tableHeadStyle = computed(() => ({
  "--head-scrollbar-width": `${headScrollbarWidth.value}px`,
}));

const DEFAULT_WIDTH_MAP = {
  code: 90,
  produit: 196,
  forme: 120,
  dosage: 118,
  classe: 165,
  cible: 150,
  unite: 110,
  prix_achat: 112,
  prix_vente: 112,
  stock_actuel: 108,
  lots_count: 92,
  prochaine_peremption: 132,
  stock_peremption_proche: 118,
  statut: 110,
  date_mise_a_jour: 118,
};
const tableStyle = computed(() => ({
  width: `${columns.value.reduce((sum, col) => sum + getColumnWidth(col), 0)}px`,
}));

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
  lots_count: "Nb lots",
  prochaine_peremption: "Prochaine péremption",
  stock_peremption_proche: "Stock périmant",
  statut: "Statut",
  date_mise_a_jour: "Date mise à jour",
};

const classes = computed(() => {
  const set = new Set(rows.value.map((r) => r.classe).filter(Boolean));
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "fr"));
});

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

  if (sortBy.value) {
    const key = sortBy.value;
    const dir = sortDir.value === "asc" ? 1 : -1;
    out = [...out].sort((ra, rb) => dir * compareValues(key, ra[key], rb[key]));
  }

  return out;
});

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value) {
  const s = normalizeDate(value);
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
}

function parseIsoDate(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function daysUntilDate(value) {
  const target = parseIsoDate(value);
  if (!target) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function expiryDateClasses(value) {
  if (!value) return { "is-empty": true };
  const days = daysUntilDate(value);
  if (days === null) return {};
  if (days < 0) return { "is-overdue": true };
  if (days > 183) return { "is-safe": true };
  return { "is-urgent": true };
}

function expiryDateStyle(value) {
  if (!value) return {};

  const days = daysUntilDate(value);
  if (days === null) return {};

  if (days < 0) {
    return {
      "--expiry-border": "#f9a8d4",
      "--expiry-bg":
        "linear-gradient(180deg, rgba(253, 242, 248, 0.98) 0%, rgba(252, 231, 243, 0.96) 100%)",
    };
  }

  const maxDays = 183;
  const ratio = Math.min(1, days / maxDays);
  const hue = 6 + ratio * 128;
  const borderLightness = 72 + ratio * 10;
  const bgLightnessTop = 95 + ratio * 1.5;
  const bgLightnessBottom = 90 + ratio * 3;

  return {
    "--expiry-border": `hsl(${hue}, 78%, ${borderLightness}%)`,
    "--expiry-bg": `linear-gradient(180deg, hsl(${hue}, 88%, ${bgLightnessTop}%) 0%, hsl(${hue}, 82%, ${bgLightnessBottom}%) 100%)`,
  };
}

function compareValues(key, a, b) {
  if (a == null) a = "";
  if (b == null) b = "";

  if (NUM_COLS.has(key)) {
    const na = Number(String(a).replace(/\s/g, ""));
    const nb = Number(String(b).replace(/\s/g, ""));
    return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0);
  }

  if (key === "prochaine_peremption" || key === "date_mise_a_jour") {
    return normalizeDate(a).localeCompare(normalizeDate(b), "fr");
  }

  return String(a).localeCompare(String(b), "fr", { sensitivity: "base" });
}

function toggleSort(col) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
    return;
  }

  sortBy.value = col;
  sortDir.value = "asc";
}

function getRowKey(row, idx) {
  if (row?.code !== null && row?.code !== undefined && row?.code !== "") {
    return String(row.code);
  }

  return JSON.stringify([
    row?.produit ?? "",
    row?.forme ?? "",
    row?.dosage ?? "",
    row?.classe ?? "",
    row?.cible ?? "",
    row?.unite ?? "",
    row?.stock_actuel ?? "",
    row?.lots_count ?? "",
    row?.prochaine_peremption ?? "",
    row?.stock_peremption_proche ?? "",
    row?.statut ?? "",
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

function sortIconClass(col) {
  if (sortBy.value !== col) return "none";
  return sortDir.value === "asc" ? "asc" : "desc";
}

function getDefaultWidth(col) {
  return DEFAULT_WIDTH_MAP[col] || 110;
}

function getColumnWidth(col) {
  return columnWidths.value[col] ?? getDefaultWidth(col);
}

function colStyle(col) {
  const width = getColumnWidth(col);
  return { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };
}

function label(col) {
  return COL_LABELS[col] ?? String(col).replaceAll("_", " ");
}

function formatCell(col, value) {
  if (value == null) return "";

  if (["prix_achat", "prix_vente", "stock_actuel", "lots_count", "stock_peremption_proche"].includes(col)) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("fr-FR") : String(value);
  }

  if (col === "prochaine_peremption" || col === "date_mise_a_jour") {
    return formatDate(value);
  }

  return String(value);
}

function thClass(col) {
  return [
    col === "code" ? "col-code sticky-col sticky-col-1" : "",
    col === "produit" ? "col-produit sticky-col sticky-col-2" : "",
    ["prochaine_peremption", "date_mise_a_jour"].includes(col) ? "col-date" : "",
  ].join(" ");
}

function tdClass(col) {
  return [
    col === "code" ? "codeCell sticky-col sticky-col-1" : "",
    ["prix_achat", "prix_vente", "stock_actuel", "lots_count", "stock_peremption_proche"].includes(col)
      ? "numCell"
      : "",
    col === "produit" ? "col-produit sticky-col sticky-col-2" : "",
    ["prochaine_peremption", "date_mise_a_jour"].includes(col) ? "col-date" : "",
    CENTER_COLS.has(col) ? "centerCell" : "",
    col === "stock_actuel" ? "stockCurrentCell" : "",
    col === "stock_peremption_proche" ? "stockExpiringCell" : "",
  ].join(" ");
}

function stickyStyle(col) {
  if (col === "code") {
    const width = getColumnWidth("code");
    return {
      left: "0px",
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    };
  }

  if (col === "produit") {
    const width = getColumnWidth("produit");
    return {
      left: `${getColumnWidth("code")}px`,
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    };
  }

  return {};
}

function badgeClass(value) {
  if (value === "Actif") return "badgeOk";
  if (value === "Inactif") return "badgeOff";
  return "badgeNeutral";
}

let syncScrollRaf = 0;

function syncScroll() {
  if (!headEl.value || !bodyEl.value) return;
  if (syncScrollRaf) return;

  syncScrollRaf = requestAnimationFrame(() => {
    syncScrollRaf = 0;
    if (!headEl.value || !bodyEl.value) return;
    headEl.value.scrollLeft = bodyEl.value.scrollLeft;
  });
}

function updateHeadScrollbarWidth() {
  if (!bodyEl.value) return;

  const styles = window.getComputedStyle(bodyEl.value);
  const borders =
    (parseFloat(styles.borderLeftWidth || "0") || 0) +
    (parseFloat(styles.borderRightWidth || "0") || 0);

  headScrollbarWidth.value = Math.max(
    0,
    bodyEl.value.offsetWidth - bodyEl.value.clientWidth - borders
  );
}

let resizeState = null;

function startColumnResize(col, event) {
  if (event.button !== 0) return;

  resizeState = {
    col,
    startX: event.clientX,
    startWidth: getColumnWidth(col),
    pointerId: event.pointerId,
    handle: event.currentTarget,
  };

  event.currentTarget?.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-resizing-columns");
  window.addEventListener("pointermove", onColumnResize);
  window.addEventListener("pointerup", stopColumnResize);
  window.addEventListener("pointercancel", stopColumnResize);
  event.stopPropagation();
  event.preventDefault();
}

function onColumnResize(event) {
  if (!resizeState) return;
  if (event.pointerId !== undefined && event.pointerId !== resizeState.pointerId) return;

  const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX);
  columnWidths.value = {
    ...columnWidths.value,
    [resizeState.col]: Math.max(72, Math.round(nextWidth)),
  };
}

function stopColumnResize() {
  if (resizeState?.handle && resizeState.pointerId !== undefined) {
    resizeState.handle.releasePointerCapture?.(resizeState.pointerId);
  }

  resizeState = null;
  document.body.classList.remove("is-resizing-columns");
  window.removeEventListener("pointermove", onColumnResize);
  window.removeEventListener("pointerup", stopColumnResize);
  window.removeEventListener("pointercancel", stopColumnResize);
}

function resetColumnWidth(col) {
  columnWidths.value = {
    ...columnWidths.value,
    [col]: getDefaultWidth(col),
  };
}

function updateLayoutMetrics() {
  if (!catalogShell.value) return;

  if (isFullscreen.value) {
    shellHeight.value = Math.max(520, window.innerHeight - 36);
    return;
  }

  const rect = catalogShell.value.getBoundingClientRect();
  const bottomGap = 16;
  const available = window.innerHeight - rect.top - bottomGap;
  shellHeight.value = Math.max(460, Math.floor(available));
}

function handleFullscreenChange() {
  const wasFullscreen = isFullscreen.value;
  isFullscreen.value = document.fullscreenElement === catalogShell.value;
  updateLayoutMetrics();

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
  const el = catalogShell.value;
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

async function load() {
  const { data } = await api.get("/api/dashboard/list_products");
  columns.value = (data.columns || []).filter(
    (col) => !["prix_achat", "prix_vente"].includes(col)
  );
  columnWidths.value = Object.fromEntries(columns.value.map((col) => [col, getDefaultWidth(col)]));
  rows.value = data.rows || [];
}

onMounted(async () => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  window.addEventListener("resize", updateLayoutMetrics);
  window.addEventListener("resize", updateHeadScrollbarWidth);
  handleFullscreenChange();
  await load();
  await nextTick();
  requestAnimationFrame(() => {
    updateLayoutMetrics();
    updateHeadScrollbarWidth();
    syncScroll();
  });
});

onBeforeUnmount(() => {
  stopColumnResize();
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  window.removeEventListener("resize", updateLayoutMetrics);
  window.removeEventListener("resize", updateHeadScrollbarWidth);
  if (syncScrollRaf) {
    cancelAnimationFrame(syncScrollRaf);
    syncScrollRaf = 0;
  }
});

watch(rows, (nextRows) => {
  if (selectedRowKeys.value.length === 0) return;

  const availableKeys = new Set(nextRows.map((row, idx) => getRowKey(row, idx)));
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => availableKeys.has(key));
});

watch([columns, columnWidths], async () => {
  await nextTick();
  updateHeadScrollbarWidth();
  syncScroll();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: var(--catalog-shell-height, auto);
  min-height: 460px;
  padding: 2px 0 6px;
  position: relative;
  overflow: hidden;
}

.title {
  margin: 0;
  font-size: clamp(20px, 2.1vw, 28px);
  font-weight: 900;
  line-height: 1.06;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1d4ed8;
}

.titleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
}

.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 14px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid #edf2f7;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.filtersLeft,
.filtersRight {
  display: flex;
  align-items: center;
  gap: 10px 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.filtersLeft {
  flex: 1 1 360px;
}

.filtersRight {
  flex: 0 1 auto;
  margin-left: auto;
}

.fsBtn,
.inp,
.sel,
.count {
  height: 44px;
  border-radius: 12px;
  font-size: 14px;
}

.fsBtn {
  padding: 0 14px;
  border: 1px solid #dbe2ea;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #334155;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
}

.fsBtn:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.16);
}

.inp,
.sel {
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  outline: none;
  background: #fff;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.inp {
  width: min(520px, 100%);
  flex: 1 1 320px;
}

.sel {
  min-width: 200px;
}

.inp:focus,
.sel:focus {
  border-color: #93c5fd;
  background: #fdfefe;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid #e5edf6;
  border-radius: 999px;
  background: #ffffff;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: #475569;
  white-space: nowrap;
}

.tableWrap {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  padding: 0 0 16px;
  border: 1px solid #e8eef6;
  border-top: none;
  border-radius: 0 0 10px 10px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.tableHead {
  flex: 0 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  padding-right: var(--head-scrollbar-width, 0px);
  border: 1px solid #e8eef6;
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid #d7e0ec;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f7fc 100%);
  box-shadow: none;
}

.tableScroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  scrollbar-width: auto;
  scrollbar-color: #475569 #dbe5f0;
  margin-bottom: 8px;
  padding-bottom: 0;
  border-radius: 0 0 10px 10px;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff calc(100% - 30px), #eef4fb 100%);
  -webkit-overflow-scrolling: touch;
}

.tbl {
  width: max-content;
  min-width: max(100%, 1450px);
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.tbl thead th {
  position: relative;
  box-sizing: border-box;
  padding: 10px 14px;
  border-right: 1px solid #e6edf5;
  color: #475569;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: background 0.16s ease, color 0.16s ease;
}

.tbl thead th:hover {
  background: rgba(59, 130, 246, 0.06);
  color: #1d4ed8;
}

.tbl thead th:last-child {
  border-right: none;
}

.thWrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.colResizeHandle {
  position: absolute;
  top: 0;
  right: -6px;
  width: 12px;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  z-index: 7;
}

.colResizeHandle::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 50%;
  width: 3px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: transparent;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

.tbl thead th:hover .colResizeHandle::before,
.colResizeHandle:hover::before,
.colResizeHandle:focus-visible::before {
  background: rgba(59, 130, 246, 0.22);
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.18);
}

.sortIcon {
  width: 0;
  height: 0;
  opacity: 0.85;
}

.sortIcon.none {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(148, 163, 184, 0.75);
  transform: translateY(1px);
}

.sortIcon.asc {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 7px solid #2563eb;
}

.sortIcon.desc {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid #2563eb;
}

.tbl tbody td {
  box-sizing: border-box;
  padding: 14px 14px;
  border-bottom: 1px solid #eef2f7;
  color: #334155;
  background: #ffffff;
  vertical-align: middle;
}

.tbl tbody tr:nth-child(odd) td {
  background: #fbfdff;
}

.tbl tbody tr:hover td {
  background: #f6faff;
}

.tableRow {
  cursor: pointer;
  outline: none;
}

.tbl tbody tr.tableRow:focus-visible td,
.tbl tbody tr.tableRow.tableRow--selected td {
  background: #dbeafe;
  color: #1e3a8a;
}

.tbl thead th.sticky-col,
.tbl tbody td.sticky-col {
  position: sticky;
  background-clip: padding-box;
}

.tbl thead th.sticky-col {
  z-index: 5;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f7fc 100%);
}

.tbl thead th.sticky-col-1,
.tbl tbody td.sticky-col-1 {
  left: 0;
}

.tbl thead th.sticky-col-2,
.tbl tbody td.sticky-col-2 {
  left: 90px;
}

.tbl thead th.sticky-col-1 {
  z-index: 6;
}

.tbl thead th.sticky-col-2 {
  z-index: 6;
  box-shadow: 8px 0 10px -10px rgba(148, 163, 184, 0.55);
}

.tbl tbody td.sticky-col {
  z-index: 3;
  background: #ffffff;
}

.tbl tbody tr:nth-child(odd) td.sticky-col {
  background: #fbfdff;
}

.tbl tbody tr:hover td.sticky-col {
  background: #f6faff;
}

.tbl tbody tr.tableRow:focus-visible td.sticky-col,
.tbl tbody tr.tableRow.tableRow--selected td.sticky-col {
  background: #dbeafe;
}

.tbl tbody td.sticky-col-1 {
  z-index: 4;
}

.tbl tbody td.sticky-col-2 {
  z-index: 4;
  box-shadow: 8px 0 10px -10px rgba(148, 163, 184, 0.32);
}

.codeCell {
  font-weight: 800;
  color: #0f172a;
}

.col-produit {
  color: #0f172a;
  font-weight: 800;
}

.numCell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.centerCell {
  text-align: center !important;
}

.centerCell.numCell {
  text-align: center !important;
}

.col-date {
  text-align: center;
}

.expiry-date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid var(--expiry-border, #edf2f7);
  border-radius: 10px;
  background: var(--expiry-bg, rgba(248, 250, 252, 0.9));
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.expiry-date.is-empty {
  padding: 0;
  border-color: transparent;
  background: transparent;
  color: #94a3b8;
  font-weight: 600;
}

.expiry-date.is-safe {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.expiry-date.is-urgent {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.expiry-date.is-overdue {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.stock-current-value,
.stock-expiring-value {
  font-variant-numeric: tabular-nums;
}

.stock-current-value {
  font-weight: 900;
  color: #334155;
}

.stock-expiring-value {
  font-weight: 900;
  color: #b45309;
}

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

.tbl tbody tr.tableRow:focus-visible .badge,
.tbl tbody tr.tableRow.tableRow--selected .badge,
.tbl tbody tr.tableRow:focus-visible .expiry-date,
.tbl tbody tr.tableRow.tableRow--selected .expiry-date {
  background: rgba(255, 255, 255, 0.62);
  border-color: rgba(59, 130, 246, 0.26);
  color: inherit;
  box-shadow: none;
}

.tbl tbody tr.tableRow:focus-visible .stock-current-value,
.tbl tbody tr.tableRow.tableRow--selected .stock-current-value,
.tbl tbody tr.tableRow:focus-visible .stock-expiring-value,
.tbl tbody tr.tableRow.tableRow--selected .stock-expiring-value {
  color: inherit;
}

.empty {
  padding: 26px;
  text-align: center;
  color: #64748b;
  font-weight: 800;
}

.tableScroll::-webkit-scrollbar {
  width: 14px;
  height: 20px;
}

.tableScroll::-webkit-scrollbar:horizontal {
  height: 20px;
}

.tableScroll::-webkit-scrollbar-track {
  background: linear-gradient(180deg, #edf3fa 0%, #e2e8f0 100%);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
}

.tableScroll::-webkit-scrollbar-track:horizontal {
  background: linear-gradient(180deg, #edf4fc 0%, #dbe5f0 100%);
  border-radius: 999px;
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.24),
    inset 0 4px 8px rgba(148, 163, 184, 0.12);
}

.tableScroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
  border-radius: 999px;
  border: 3px solid #edf3fa;
  min-height: 48px;
  min-width: 48px;
}

.tableScroll::-webkit-scrollbar-thumb:horizontal {
  background: linear-gradient(180deg, #64748b 0%, #334155 100%);
  border: 4px solid #edf4fc;
  min-width: 72px;
  box-shadow: 0 2px 8px rgba(51, 65, 85, 0.2);
}

.tableScroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #64748b 0%, #475569 100%);
}

.tableScroll::-webkit-scrollbar-thumb:horizontal:hover {
  background: linear-gradient(180deg, #475569 0%, #1e293b 100%);
}

.tableScroll::-webkit-scrollbar-corner {
  background: #e2e8f0;
}

@media (max-width: 900px) {
  .filters {
    padding: 10px;
  }

  .filtersLeft,
  .filtersRight {
    width: 100%;
    margin-left: 0;
  }

  .inp,
  .sel {
    width: 100%;
  }

  .count {
    justify-self: start;
  }
}

.page:fullscreen {
  padding: 18px;
  background: #f8fafc;
}

.page:fullscreen .title {
  color: #0f172a;
}
</style>
