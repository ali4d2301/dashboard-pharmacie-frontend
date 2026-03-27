<template>
  <div
    class="dashboard-page page"
    :class="{
      'dashboard-page--catalog': activeTab === 'liste',
      'dashboard-page--movements': activeTab === 'mvts',
    }"
  >
    <div class="dashboard-header">
      <div class="header-top">
        <a class="back" href="/" @click.prevent="handleBack">&larr; Retour</a>

        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'synthese' }" @click="activeTab = 'synthese'">
            Dashboard
          </button>
          <button class="tab" :class="{ active: activeTab === 'liste' }" @click="activeTab = 'liste'">
            Catalogue produits
          </button>
          <button class="tab" :class="{ active: activeTab === 'mvts' }" @click="activeTab = 'mvts'">
            Historiques des mouvements
          </button>
        </div>
      </div>

      <div class="header-bar">
        <div class="hero-copy">
          <div class="hero-topline">
            <div class="hero-main">
              <p v-if="headerContent.eyebrow" class="hero-eyebrow">{{ headerContent.eyebrow }}</p>
              <h1 class="title">{{ headerContent.title }}</h1>
            </div>

            <div v-if="headerContent.showSummary" class="header-summary hero-summary">
              <div class="summary-pill">
                <span class="summary-label">Période</span>
                <strong>{{ currentPeriodLabel }}</strong>
              </div>
              <div class="summary-pill">
                <span class="summary-label">Classe</span>
                <strong>{{ currentClassLabel }}</strong>
              </div>
            </div>

            <div
              v-else-if="activeTab === 'mvts'"
              class="header-summary hero-summary hero-period-controls"
            >
              <div class="summary-pill summary-pill--range">
                <span class="summary-label">Période</span>

                <div class="summary-range-grid">
                  <label class="summary-range-field">
                    <span class="summary-range-caption">Du</span>
                    <input
                      class="summary-date-control"
                      type="date"
                      v-model="movementDateFrom"
                      :max="movementDateTo || null"
                      @change="normalizeMovementDateRange('from')"
                    />
                  </label>

                  <label class="summary-range-field">
                    <span class="summary-range-caption">Au</span>
                    <input
                      class="summary-date-control"
                      type="date"
                      v-model="movementDateTo"
                      :min="movementDateFrom || null"
                      @change="normalizeMovementDateRange('to')"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <p class="title-subtitle">
            {{ headerContent.subtitle }}
          </p>
        </div>
      </div>

      <div class="divider"></div>
      <p v-if="dashboardError" class="dashboard-alert" role="alert">
        {{ dashboardError }}
      </p>
    </div>

    <div v-show="activeTab === 'synthese'" class="stack">
      <section class="card filter-card">
        <div class="filter-card-head">
          <div>
            <p class="filter-eyebrow">Filtres de synthèse</p>
            <p class="filter-caption">
              Choisissez une période et, si besoin, une classe thérapeutique.
            </p>
          </div>
        </div>

        <div class="filter-grid">
          <div class="field">
            <label>Période</label>
            <div class="period">
              <select v-model.number="periodYear">
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>

              <select v-model.number="periodMonth">
                <option v-for="m in months" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="field small">
            <label>Classe thérapeutique</label>
            <select v-model="theraClass">
              <option value="ALL">Tout</option>
              <option v-for="c in theraClasses" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <button class="btn" @click="reset">Réinitialiser</button>
        </div>
      </section>

      <section class="kpis">
        <div class="card kpi kpi-expiry">
          <div class="kpi-head">
            <div class="kpi-title">Produits périmant ce mois</div>
            <div class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 3v3M17 3v3M4 9h16" />
                <path d="M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                <path d="M12 12v3" />
                <path d="M12 18h.01" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">
            <span>{{ kpis.nb_produits_perimant }}</span>
            <span class="kpi-context">sur {{ kpis.nb_produits_actifs }} actifs</span>
          </div>
        </div>

        <div class="card kpi kpi-availability" :style="availabilityKpiStyle">
          <div class="kpi-head">
            <div class="kpi-title">Taux de disponibilité</div>
            <div class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 5 6v5c0 4.7 2.9 8.6 7 10 4.1-1.4 7-5.3 7-10V6l-7-3Z" />
                <path d="m9.5 12.5 1.8 1.8 3.7-4" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ kpis.tx_dispo }}</div>
        </div>

        <div class="card kpi kpi-movement">
          <div class="kpi-head">
            <div class="kpi-title">Produits avec mouvements du mois</div>
            <div class="kpi-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 7h11" />
                <path d="m14 4 4 3-4 3" />
                <path d="M18 17H7" />
                <path d="m10 14-4 3 4 3" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">
            <span>{{ kpis.nb_produits_mouvement }}</span>
            <span class="kpi-context">sur {{ kpis.nb_produits_actifs }} actifs</span>
          </div>
        </div>
      </section>

      <section class="grid-2">
        <div
          ref="stockChartShell"
          class="card chart chart-stock"
          :class="{ 'is-fullscreen': fullscreenChartKey === 'stock' }"
        >
          <div class="chart-head">
            <h2 class="chart-title">Répartition des états de stock</h2>
            <button type="button" class="chart-fullscreen-btn" @click="toggleChartFullscreen('stock')">
              {{ fullscreenChartKey === "stock" ? "Quitter plein écran" : "Plein écran" }}
            </button>
          </div>
          <div class="chart-area">
            <EtatStockDonut :items="etatStockShare" :expanded="fullscreenChartKey === 'stock'" />
          </div>
        </div>

        <div
          ref="movementChartShell"
          class="card chart chart-movement"
          :class="{ 'is-fullscreen': fullscreenChartKey === 'movement' }"
        >
          <div class="chart-head">
            <h2 class="chart-title">Nombre de mouvements (entrée & sortie)</h2>
            <button type="button" class="chart-fullscreen-btn" @click="toggleChartFullscreen('movement')">
              {{ fullscreenChartKey === "movement" ? "Quitter plein écran" : "Plein écran" }}
            </button>
          </div>
          <div class="chart-area">
            <MovementTypeBarChart :items="movementHist" :expanded="fullscreenChartKey === 'movement'" />
          </div>
        </div>
      </section>

      <section class="card pad">
        <MonthlyStockTable
          :items="monthlyTable"
          :loading="monthlyTableLoading"
          :period-label="currentPeriodLabel"
          :class-label="currentClassLabel"
          :is-class-filtered="isClassFiltered"
          @clear-class-filter="theraClass = 'ALL'"
        />
      </section>
    </div>

    <div v-if="hasMountedListe" v-show="activeTab === 'liste'" class="card pad">
      <ProductCatalogTable />
    </div>

    <div v-if="hasMountedMvts" v-show="activeTab === 'mvts'" class="card pad">
      <MovementsHistory
        v-model:date-from="movementDateFrom"
        v-model:date-to="movementDateTo"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDashboardLogic } from "./Dashboard_page/Dashboard.logic";
import "./Dashboard_page/Dashboard.css";
import EtatStockDonut from "../components/EtatStockDonut.vue";
import MovementTypeBarChart from "../components/MovementTypeBarChart.vue";
import MonthlyStockTable from "../components/MonthlyStockTable.vue";
import {
  clearStoredAuth,
  getStoredRole,
  notifyAuthChanged,
} from "@/utils/auth";

const ProductCatalogTable = defineAsyncComponent(() => import("../components/ProductCatalogTable.vue"));
const MovementsHistory = defineAsyncComponent(() => import("../components/MovementsHistory.vue"));

const router = useRouter();

const {
  activeTab,
  months,
  years,
  periodMonth,
  periodYear,
  theraClass,
  theraClasses,
  dashboardError,
  kpis,
  etatStockShare,
  movementHist,
  monthlyTable,
  monthlyTableLoading,
  reset,
} = useDashboardLogic();

const hasMountedListe = ref(activeTab.value === "liste");
const hasMountedMvts = ref(activeTab.value === "mvts");
const stockChartShell = ref(null);
const movementChartShell = ref(null);
const fullscreenChartKey = ref(null);
const savedPageScrollY = ref(0);
const savedPageScrollX = ref(0);

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultMovementPeriod() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);

  return {
    from: toISODate(start),
    to: toISODate(end),
  };
}

const defaultMovementPeriod = createDefaultMovementPeriod();
const movementDateFrom = ref(defaultMovementPeriod.from);
const movementDateTo = ref(defaultMovementPeriod.to);

function normalizeMovementDateRange(changedSide) {
  if (!movementDateFrom.value || !movementDateTo.value) return;
  if (movementDateFrom.value <= movementDateTo.value) return;

  if (changedSide === "from") {
    movementDateTo.value = movementDateFrom.value;
    return;
  }

  movementDateFrom.value = movementDateTo.value;
}

const currentPeriodLabel = computed(() => {
  const monthLabel =
    months.find((month) => month.value === periodMonth.value)?.label ?? `Mois ${periodMonth.value}`;
  return `${monthLabel} ${periodYear.value}`;
});

const currentClassLabel = computed(() =>
  theraClass.value === "ALL" ? "Toutes les classes" : theraClass.value
);

const isClassFiltered = computed(() => theraClass.value !== "ALL");

const availabilityPercent = computed(() => {
  const rawValue =
    kpis.value.taux_disponibilite_value ??
    Number.parseFloat(String(kpis.value.tx_dispo ?? "0").replace(",", "."));

  if (!Number.isFinite(rawValue)) return 0;
  return Math.min(100, Math.max(0, rawValue));
});

const availabilityKpiStyle = computed(() => {
  const hue = Math.round((availabilityPercent.value / 100) * 120);
  const accentHue = Math.min(120, hue + 6);

  return {
    "--availability-accent": `hsl(${hue}, 80%, 44%)`,
    "--availability-accent-soft": `hsl(${accentHue}, 72%, 58%)`,
    "--availability-glow": `hsla(${hue}, 78%, 48%, 0.18)`,
    "--availability-icon-border": `hsla(${hue}, 72%, 42%, 0.24)`,
    "--availability-icon-bg-from": `hsla(${hue}, 100%, 97%, 0.98)`,
    "--availability-icon-bg-to": `hsla(${hue}, 86%, 90%, 0.92)`,
    "--availability-value": `hsl(${hue}, 68%, 24%)`,
  };
});

function getChartShell(key) {
  if (key === "stock") return stockChartShell.value;
  if (key === "movement") return movementChartShell.value;
  return null;
}

function syncFullscreenChart() {
  const activeElement = document.fullscreenElement;
  const previousKey = fullscreenChartKey.value;

  if (activeElement === stockChartShell.value) {
    fullscreenChartKey.value = "stock";
  } else if (activeElement === movementChartShell.value) {
    fullscreenChartKey.value = "movement";
  } else {
    fullscreenChartKey.value = null;
  }

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });

  if (fullscreenChartKey.value || !previousKey) return;

  setTimeout(() => {
    window.scrollTo({
      top: savedPageScrollY.value,
      left: savedPageScrollX.value,
      behavior: "auto",
    });
  }, 0);
}

async function toggleChartFullscreen(key) {
  const el = getChartShell(key);
  if (!el || !document?.fullscreenEnabled) return;

  try {
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      return;
    }

    savedPageScrollY.value = window.scrollY || window.pageYOffset || 0;
    savedPageScrollX.value = window.scrollX || window.pageXOffset || 0;
    await el.requestFullscreen();
  } catch {
    // no-op
  }
}

const headerContent = computed(() => {
  if (activeTab.value === "liste") {
    return {
      eyebrow: "",
      title: "Catalogue produits",
      subtitle: "Consultation du catalogue, des caractéristiques produit et des informations de stock.",
      showSummary: false,
    };
  }

  if (activeTab.value === "mvts") {
    return {
      eyebrow: "Traçabilité",
      title: "Historiques des mouvements",
      subtitle: "Suivi détaillé des entrées, sorties et opérations enregistrées dans la pharmacie.",
      showSummary: false,
    };
  }

  return {
    eyebrow: "Vue mensuelle",
    title: "Tableau de bord des stocks",
    subtitle: "Suivi synthétique des stocks, mouvements et alertes de péremption.",
    showSummary: true,
  };
});

watch(activeTab, async (tab) => {
  if (tab === "liste") hasMountedListe.value = true;
  if (tab === "mvts") hasMountedMvts.value = true;

  await nextTick();
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
});

onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreenChart);
  syncFullscreenChart();
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenChart);
});

function handleBack() {
  const role = getStoredRole();

  if (role === "viewer") {
    clearStoredAuth();
    notifyAuthChanged();
    router.replace("/");
    return;
  }

  router.push("/accueil");
}
</script>
