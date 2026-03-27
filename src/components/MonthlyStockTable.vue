<template>
  <div ref="tableShell" class="table-shell" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="table-topbar">
      <div class="table-title">
        <h2>Synthèse par produit</h2>
      </div>

      <div class="table-context" :class="{ 'is-filtered': isClassFiltered }">
        <div class="table-context-item">
          <span class="table-context-label">Période globale</span>
          <strong>{{ periodLabel }}</strong>
        </div>
        <div class="table-context-item">
          <span class="table-context-label">Classe globale</span>
          <strong>{{ classLabel }}</strong>
        </div>
        <p v-if="isClassFiltered" class="table-context-note">
          Le tableau est actuellement limité à cette classe thérapeutique.
        </p>
        <button
          v-if="isClassFiltered"
          type="button"
          class="table-context-btn"
          @click="emit('clear-class-filter')"
        >
          Revenir à toutes les classes
        </button>
      </div>
    </div>

    <div class="table-head">
      <div class="table-left-actions">
        <button
          type="button"
          class="table-fullscreen-btn"
          :disabled="loading"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? "Quitter plein écran" : "Plein écran" }}
        </button>
        <input
          class="table-search"
          type="search"
          v-model="q"
          placeholder="Rechercher un produit..."
          :disabled="loading"
        />
      </div>

      <div class="table-right-cluster">
        <div class="table-toolbar">
          <MultiSelectChips
            label="Cible"
            placeholder="Toutes"
            :options="optionsCibles"
            v-model="selectedCibles"
            :disabled="loading"
          />
          <MultiSelectChips
            label="État"
            placeholder="Tous"
            :options="optionsEtats"
            v-model="selectedEtats"
            :disabled="loading"
          />
        </div>
        <span class="table-hint" :class="{ 'is-loading': loading }">
          {{ loading ? "Chargement..." : `${rows.length} Produits` }}
        </span>
      </div>
    </div>

    <div ref="tableGridEl" class="table-grid-month" :style="tableGridStyle">
      <div
        ref="tableHeadEl"
        class="table-head-scroll-month"
        :class="{ 'is-viewport-sticky': !isFullscreen && isViewportStickyActive }"
      >
        <table class="nice-table nice-table-head" :style="tableStyle">
          <colgroup>
            <col v-for="col in columns" :key="col.key" :style="columnStyle(col.key)" />
          </colgroup>
          <thead>
            <tr>
              <th
                :class="sortHeaderClass('produit', 'sticky-col sticky-col-1')"
                @click="setSort('produit')"
              >
                Produit
                <span class="sort-indicator">{{ sortIndicator("produit") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Produit"
                  @pointerdown="startColumnResize('produit', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('produit')"
                ></button>
              </th>
              <th :class="sortHeaderClass('dosage')" @click="setSort('dosage')">
                Dosage
                <span class="sort-indicator">{{ sortIndicator("dosage") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Dosage"
                  @pointerdown="startColumnResize('dosage', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('dosage')"
                ></button>
              </th>
              <th :class="sortHeaderClass('forme', 'th-form')" @click="setSort('forme')">
                Forme
                <span class="sort-indicator">{{ sortIndicator("forme") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Forme"
                  @pointerdown="startColumnResize('forme', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('forme')"
                ></button>
              </th>
              <th :class="sortHeaderClass('unite')" @click="setSort('unite')">
                Unité
                <span class="sort-indicator">{{ sortIndicator("unite") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Unité"
                  @pointerdown="startColumnResize('unite', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('unite')"
                ></button>
              </th>
              <th :class="sortHeaderClass('quantite_initiale', 'num')" @click="setSort('quantite_initiale')">
                Quantité initiale
                <span class="sort-indicator">{{ sortIndicator("quantite_initiale") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Quantité initiale"
                  @pointerdown="startColumnResize('quantite_initiale', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('quantite_initiale')"
                ></button>
              </th>
              <th :class="sortHeaderClass('quantite_entree', 'num')" @click="setSort('quantite_entree')">
                Quantité entrée
                <span class="sort-indicator">{{ sortIndicator("quantite_entree") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Quantité entrée"
                  @pointerdown="startColumnResize('quantite_entree', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('quantite_entree')"
                ></button>
              </th>
              <th :class="sortHeaderClass('quantite_sortie', 'num')" @click="setSort('quantite_sortie')">
                Quantité sortie
                <span class="sort-indicator">{{ sortIndicator("quantite_sortie") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Quantité sortie"
                  @pointerdown="startColumnResize('quantite_sortie', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('quantite_sortie')"
                ></button>
              </th>
              <th :class="sortHeaderClass('sdu', 'num')" @click="setSort('sdu')">
                SDU
                <span class="sort-indicator">{{ sortIndicator("sdu") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne SDU"
                  @pointerdown="startColumnResize('sdu', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('sdu')"
                ></button>
              </th>
              <th :class="sortHeaderClass('cmm', 'num')" @click="setSort('cmm')">
                CMM
                <span class="sort-indicator">{{ sortIndicator("cmm") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne CMM"
                  @pointerdown="startColumnResize('cmm', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('cmm')"
                ></button>
              </th>
              <th :class="sortHeaderClass('msd', 'num')" @click="setSort('msd')">
                MSD
                <span class="sort-indicator">{{ sortIndicator("msd") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne MSD"
                  @pointerdown="startColumnResize('msd', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('msd')"
                ></button>
              </th>
              <th :class="sortHeaderClass('etat_stock', 'th-status')" @click="setSort('etat_stock')">
                <span>État de<br />stock</span>
                <span class="sort-indicator">{{ sortIndicator("etat_stock") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne État de stock"
                  @pointerdown="startColumnResize('etat_stock', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('etat_stock')"
                ></button>
              </th>
              <th :class="sortHeaderClass('prochaine_peremption', 'th-expiry')" @click="setSort('prochaine_peremption')">
                Péremption proche
                <span class="sort-indicator">{{ sortIndicator("prochaine_peremption") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Péremption proche"
                  @pointerdown="startColumnResize('prochaine_peremption', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('prochaine_peremption')"
                ></button>
              </th>
              <th
                :class="sortHeaderClass('quantite_prochaine_peremption', 'num th-expiry-qty')"
                @click="setSort('quantite_prochaine_peremption')"
              >
                <span>Qté à cette<br />date</span>
                <span class="sort-indicator">{{ sortIndicator("quantite_prochaine_peremption") }}</span>
                <button
                  type="button"
                  class="col-resize-handle"
                  tabindex="-1"
                  aria-label="Ajuster la largeur de la colonne Quantité à cette date"
                  @pointerdown="startColumnResize('quantite_prochaine_peremption', $event)"
                  @click.stop
                  @dblclick.stop="resetColumnWidth('quantite_prochaine_peremption')"
                ></button>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref="tableBodyEl"
        class="table-wrap-month"
        :class="{ 'has-viewport-sticky-head': isViewportStickyActive }"
        @scroll="syncTableScroll"
      >
        <table class="nice-table nice-table-body" :style="tableStyle">
          <colgroup>
            <col v-for="col in columns" :key="col.key" :style="columnStyle(col.key)" />
          </colgroup>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i">
              <td class="prod sticky-col sticky-col-1" :title="r.produit">
                <span class="prod-name">{{ r.produit }}</span>
              </td>
              <td>{{ r.dosage || "-" }}</td>
              <td class="cell-form">
                <span class="form-value">{{ r.forme || "-" }}</span>
              </td>
              <td>{{ r.unite || "-" }}</td>

              <td class="num">{{ fmtInt(r.quantite_initiale) }}</td>
              <td class="num">{{ fmtInt(r.quantite_entree) }}</td>
              <td class="num">{{ fmtInt(r.quantite_sortie) }}</td>
              <td class="num strong">{{ fmtInt(r.sdu) }}</td>
              <td class="num strong cell-cmm">{{ fmtCmm(r.cmm) }}</td>
              <td class="num strong cell-msd">{{ fmtMsd(r.msd) }}</td>

              <td class="cell-status">
                <span class="badge" :class="badgeClass(r.etat_stock)">
                  {{ r.etat_stock || "-" }}
                </span>
              </td>
              <td class="cell-expiry">
                <span
                  class="expiry-date"
                  :class="expiryDateClasses(r.prochaine_peremption)"
                  :style="expiryDateStyle(r.prochaine_peremption)"
                >
                  {{ fmtDateISOToFR(r.prochaine_peremption) || "-" }}
                </span>
              </td>
              <td class="num cell-expiry-qty">
                {{ r.prochaine_peremption ? fmtInt(r.quantite_prochaine_peremption) : "-" }}
              </td>
            </tr>

            <tr v-if="!loading && rows.length === 0">
              <td colspan="13" class="empty">Aucune donnée.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MultiSelectChips from "@/components/MultiSelectChips.vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  periodLabel: { type: String, default: "" },
  classLabel: { type: String, default: "" },
  isClassFiltered: { type: Boolean, default: false },
});

const emit = defineEmits(["clear-class-filter"]);

const q = ref("");
const selectedCibles = ref([]);
const selectedEtats = ref([]);
const sortKey = ref("produit");
const sortDir = ref("asc");
const tableShell = ref(null);
const tableGridEl = ref(null);
const tableHeadEl = ref(null);
const tableBodyEl = ref(null);
const headScrollbarWidth = ref(0);
const stickyTopOffset = ref(0);
const tableHeadHeight = ref(0);
const stickyBodyOffset = ref(0);
const isViewportStickyActive = ref(false);
const isFullscreen = ref(false);
const savedPageScrollY = ref(0);
const savedPageScrollX = ref(0);
const savedTableScrollTop = ref(0);
const DEFAULT_COLUMNS = [
  { key: "produit", width: 208, minWidth: 140 },
  { key: "dosage", width: 118, minWidth: 90 },
  { key: "forme", width: 104, minWidth: 74 },
  { key: "unite", width: 96, minWidth: 74 },
  { key: "quantite_initiale", width: 128, minWidth: 100 },
  { key: "quantite_entree", width: 128, minWidth: 100 },
  { key: "quantite_sortie", width: 128, minWidth: 100 },
  { key: "sdu", width: 96, minWidth: 74 },
  { key: "cmm", width: 96, minWidth: 74 },
  { key: "msd", width: 92, minWidth: 72 },
  { key: "etat_stock", width: 104, minWidth: 78 },
  { key: "prochaine_peremption", width: 120, minWidth: 84 },
  { key: "quantite_prochaine_peremption", width: 96, minWidth: 78 },
];
const columns = ref(DEFAULT_COLUMNS.map((column) => ({ ...column })));
const columnMap = computed(() =>
  Object.fromEntries(columns.value.map((column) => [column.key, column]))
);
const tableStyle = computed(() => ({
  width: `${columns.value.reduce((sum, column) => sum + column.width, 0)}px`,
}));
const tableGridStyle = computed(() => ({
  "--head-scrollbar-width": `${headScrollbarWidth.value}px`,
  "--monthly-table-head-height": `${tableHeadHeight.value}px`,
  "--monthly-table-body-offset": `${stickyBodyOffset.value}px`,
  "--monthly-table-sticky-top": `${stickyTopOffset.value}px`,
}));

let resizeState = null;

function norm(s) {
  return String(s ?? "").toLowerCase().trim();
}

function normalizeStatus(status) {
  const raw = String(status ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (raw.includes("rupture")) return "rupture";
  if (raw.includes("dormant")) return "stock dormant";
  if (raw.includes("sous")) return "sous-stock";
  if (raw.includes("bon")) return "bon stock";
  if (raw.includes("sur")) return "sur-stock";
  return raw;
}

function fmtInt(v) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtCmm(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  const up1 = Math.ceil(n * 10) / 10;
  return up1.toFixed(1).replace(".", ",");
}

function fmtMsd(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateISOToFR(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function parseIsoDate(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function daysUntilDate(iso) {
  const target = parseIsoDate(iso);
  if (!target) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function expiryDateClasses(iso) {
  if (!iso) return { "is-empty": true };
  const days = daysUntilDate(iso);
  if (days === null) return {};
  if (days < 0) return { "is-overdue": true };
  if (days > 183) return { "is-safe": true };
  return { "is-urgent": true };
}

function expiryDateStyle(iso) {
  if (!iso) return {};

  const days = daysUntilDate(iso);
  if (days === null) return {};

  if (days < 0) {
    return {
      "--expiry-text": "#7f1d1d",
      "--expiry-border": "#f9a8d4",
      "--expiry-bg": "linear-gradient(180deg, rgba(253, 242, 248, 0.98) 0%, rgba(252, 231, 243, 0.96) 100%)",
    };
  }

  const maxDays = 183;
  const ratio = Math.min(1, days / maxDays);
  const hue = 6 + ratio * 128;
  const saturation = 76;
  const textLightness = 28 + ratio * 6;
  const borderLightness = 72 + ratio * 10;
  const bgLightnessTop = 95 + ratio * 1.5;
  const bgLightnessBottom = 90 + ratio * 3;

  return {
    "--expiry-text": `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
    "--expiry-border": `hsl(${hue}, 78%, ${borderLightness}%)`,
    "--expiry-bg": `linear-gradient(180deg, hsl(${hue}, 88%, ${bgLightnessTop}%) 0%, hsl(${hue}, 82%, ${bgLightnessBottom}%) 100%)`,
  };
}

function badgeClass(etat) {
  const status = normalizeStatus(etat);

  if (status === "rupture") return "etat-rupture";
  if (status === "stock dormant") return "etat-dormant";
  if (status === "sous-stock") return "etat-sous-stock";
  if (status === "bon stock") return "etat-bon-stock";
  if (status === "sur-stock") return "etat-sur-stock";
  return "";
}

function columnStyle(key) {
  const column = columnMap.value[key];
  if (!column) return {};
  return { width: `${column.width}px` };
}

function startColumnResize(key, event) {
  if (event.button !== 0) return;
  const column = columnMap.value[key];
  if (!column) return;

  resizeState = {
    key,
    startX: event.clientX,
    startWidth: column.width,
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
  const column = columnMap.value[resizeState.key];
  if (!column) return;

  const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX);
  column.width = Math.max(column.minWidth, Math.round(nextWidth));
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

function resetColumnWidth(key) {
  const next = DEFAULT_COLUMNS.find((column) => column.key === key);
  const current = columnMap.value[key];
  if (!next || !current) return;
  current.width = next.width;
}

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
}

function sortIndicator(key) {
  if (sortKey.value !== key) return "▾";
  return sortDir.value === "asc" ? "▴" : "▾";
}

function sortHeaderClass(key, extra = "") {
  return [extra, "th-sort", sortKey.value === key ? "is-active" : ""]
    .filter(Boolean)
    .join(" ");
}

function syncTableScroll() {
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

function updateTableHeadHeight() {
  tableHeadHeight.value = tableHeadEl.value?.offsetHeight || 0;
}

function updateStickyTopOffset() {
  if (isFullscreen.value) {
    stickyTopOffset.value = 0;
    return;
  }

  const dashboardPage = tableShell.value?.closest(".dashboard-page");
  const dashboardHeader = dashboardPage?.querySelector(".dashboard-header");

  if (!dashboardHeader) {
    stickyTopOffset.value = 8;
    return;
  }

  stickyTopOffset.value = Math.ceil(dashboardHeader.getBoundingClientRect().height) + 8;
}

function updateViewportStickyState() {
  if (isFullscreen.value || !tableHeadEl.value || !tableBodyEl.value) {
    isViewportStickyActive.value = false;
    stickyBodyOffset.value = 0;
    return;
  }

  const headRect = tableHeadEl.value.getBoundingClientRect();
  const bodyRect = tableBodyEl.value.getBoundingClientRect();
  const gridRect = tableGridEl.value?.getBoundingClientRect() ?? headRect;
  const stickyTop = stickyTopOffset.value;
  const headHeight = tableHeadHeight.value || tableHeadEl.value.offsetHeight || 0;
  const stickyReleaseBuffer = 12;

  isViewportStickyActive.value =
    gridRect.top <= stickyTop && bodyRect.bottom > stickyTop + headHeight + stickyReleaseBuffer;

  stickyBodyOffset.value = isViewportStickyActive.value
    ? Math.max(0, Math.round(stickyTop - gridRect.top))
    : 0;
}

function handleFullscreenChange() {
  const active = document.fullscreenElement === tableShell.value;
  isFullscreen.value = active;

  if (active) {
    requestAnimationFrame(() => {
      updateTableHeadHeight();
      updateStickyTopOffset();
      updateViewportStickyState();
      if (tableBodyEl.value) {
        tableBodyEl.value.scrollTop = savedTableScrollTop.value;
        syncTableScroll();
        updateHeadScrollbarWidth();
      }
    });
    return;
  }

  requestAnimationFrame(() => {
    updateTableHeadHeight();
    updateStickyTopOffset();
    updateHeadScrollbarWidth();
    updateViewportStickyState();
    syncTableScroll();
  });

  setTimeout(() => {
    window.scrollTo({
      top: savedPageScrollY.value,
      left: savedPageScrollX.value,
      behavior: "auto",
    });
  }, 0);
}

async function toggleFullscreen() {
  const el = tableShell.value;
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
    savedTableScrollTop.value = tableBodyEl.value?.scrollTop || 0;

    await el.requestFullscreen();
  } catch {
    // no-op
  }
}

const optionsCibles = computed(() => {
  const set = new Set();
  for (const r of props.items) {
    const v = String(r?.cible ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
});

const optionsEtats = computed(() => {
  const set = new Set();
  for (const r of props.items) {
    const v = String(r?.etat_stock ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
});

const filtered = computed(() => {
  const qq = norm(q.value);

  return props.items
    .filter((r) => {
      if (selectedCibles.value.length === 0) return true;
      return selectedCibles.value.includes(String(r?.cible ?? "").trim());
    })
    .filter((r) => {
      if (selectedEtats.value.length === 0) return true;
      return selectedEtats.value.includes(String(r?.etat_stock ?? "").trim());
    })
    .filter((r) => {
      if (!qq) return true;
      return norm(r?.produit).includes(qq);
    });
});

function cmp(a, b) {
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;

  const va = a?.[key];
  const vb = b?.[key];

  const na = Number(va);
  const nb = Number(vb);
  const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);
  if (bothNumeric) return (na - nb) * dir;

  return String(va ?? "").localeCompare(String(vb ?? ""), "fr", { sensitivity: "base" }) * dir;
}

const rows = computed(() => [...filtered.value].sort(cmp));

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  window.addEventListener("resize", updateHeadScrollbarWidth);
  window.addEventListener("resize", updateTableHeadHeight);
  window.addEventListener("resize", updateStickyTopOffset);
  window.addEventListener("resize", updateViewportStickyState);
  window.addEventListener("scroll", updateViewportStickyState, { passive: true });
  handleFullscreenChange();
  requestAnimationFrame(() => {
    updateTableHeadHeight();
    updateStickyTopOffset();
    updateHeadScrollbarWidth();
    updateViewportStickyState();
    syncTableScroll();
  });
});

onBeforeUnmount(() => {
  stopColumnResize();
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  window.removeEventListener("resize", updateHeadScrollbarWidth);
  window.removeEventListener("resize", updateTableHeadHeight);
  window.removeEventListener("resize", updateStickyTopOffset);
  window.removeEventListener("resize", updateViewportStickyState);
  window.removeEventListener("scroll", updateViewportStickyState);
});

watch(
  rows,
  async () => {
    await nextTick();
    updateTableHeadHeight();
    updateStickyTopOffset();
    updateHeadScrollbarWidth();
    updateViewportStickyState();
    syncTableScroll();
  },
  { flush: "post" }
);
</script>
