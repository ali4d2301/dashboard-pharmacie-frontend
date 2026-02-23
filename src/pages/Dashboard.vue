<template>
  <div class="dashboard-page page">
    <div class="dashboard-header">
      <div class="header-bar">
        <a class="back" href="/" @click.prevent="handleBack">&larr; Retour</a>
        <h1 class="title">Dashboard Pharmacie</h1>
      </div>

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

      <div class="divider"></div>
    </div>

    <!-- DASHBOARD -->
    <div v-show="activeTab === 'synthese'" class="stack">
      <!-- Filtres -->
      <section class="card filter-card">
        <div class="filter-grid">
          <!-- Période -->
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

          <!-- Classe thérapeutique -->
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

      <!-- KPI -->
      <section class="kpis">
        <div class="card kpi">
          <div class="kpi-title">Nombre de produits</div>
          <div class="kpi-value">{{ kpis.nb_produits }}</div>
        </div>

        <div class="card kpi">
          <div class="kpi-title">Taux de disponibilité</div>
          <div class="kpi-value">{{ kpis.tx_dispo }}</div>
        </div>

        <div class="card kpi">
          <div class="kpi-title">Chiffre d'affaires</div>
          <div class="kpi-value">{{ kpis.soldeNet }}</div>
        </div>
      </section>

      <!-- Charts -->
      <section class="grid-2">
        <div class="card chart">
          <h2 class="chart-title">Répartition des états de stock</h2>
          <div class="chart-area">
            <EtatStockDonut :items="etatStockShare" />
          </div>
        </div>

        <div class="card chart">
          <h2 class="chart-title">Nombre de mouvements (entrée & sortie)</h2>
          <div class="chart-area">
            <MovementTypeBarChart :items="movementHist" />
          </div>
        </div>
      </section>

      <section class="card pad">
        <MonthlyStockTable :items="monthlyTable" :loading="monthlyTableLoading" />
      </section>
    </div>

    <!-- CATALOGUE PRODUITS -->
    <div v-if="hasMountedListe" v-show="activeTab === 'liste'" class="card pad">
      <ProductCatalogTable />
    </div>

    <!-- HISTORIQUE -->
    <div v-if="hasMountedMvts" v-show="activeTab === 'mvts'" class="card pad">
      <MovementsHistory />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useDashboardLogic } from "./Dashboard_page/Dashboard.logic";
import "./Dashboard_page/Dashboard.css";
import EtatStockDonut from "../components/EtatStockDonut.vue";
import MovementTypeBarChart from "../components/MovementTypeBarChart.vue";
import MonthlyStockTable from "../components/MonthlyStockTable.vue";
import ProductCatalogTable from "../components/ProductCatalogTable.vue";
import MovementsHistory from "../components/MovementsHistory.vue";

const router = useRouter();

const AUTH_KEYS = [
  "pharmacie_access_token",
  "pharmacie_token_type",
  "pharmacie_user_role",
  "pharmacie_username",
];

const {
  activeTab,
  months,
  years,
  periodMonth,
  periodYear,
  theraClass,
  theraClasses,
  kpis,
  etatStockShare,
  movementHist,
  monthlyTable,
  monthlyTableLoading,
  reset,
} = useDashboardLogic();

const hasMountedListe = ref(activeTab.value === "liste");
const hasMountedMvts = ref(activeTab.value === "mvts");

watch(activeTab, (tab) => {
  if (tab === "liste") hasMountedListe.value = true;
  if (tab === "mvts") hasMountedMvts.value = true;
});

function handleBack() {
  const role = (window.localStorage.getItem("pharmacie_user_role") || "")
    .trim()
    .toLowerCase();

  if (role === "viewer") {
    for (const key of AUTH_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.dispatchEvent(new Event("pharmacie-auth-changed"));
    router.replace("/");
    return;
  }

  router.push("/accueil");
}
</script>
