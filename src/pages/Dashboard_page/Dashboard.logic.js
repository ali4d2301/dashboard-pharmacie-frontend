//import axios from "axios";
import api from "@/services/api";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

export function useDashboardLogic() {
  const TAB_STORAGE_KEY = "dashboard_active_tab";
  const VALID_TABS = ["synthese", "liste", "mvts"];
  const DEFAULT_PERIOD_MONTH = 12;
  const DEFAULT_PERIOD_YEAR = 2025;
  const DEFAULT_THERA_CLASS = "ALL";
  const currentYear = new Date().getFullYear();

  function getInitialTab() {
    if (typeof window === "undefined") return "synthese";
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    return VALID_TABS.includes(saved) ? saved : "synthese";
  }

  const activeTab = ref(getInitialTab());
  const periodMonth = ref(DEFAULT_PERIOD_MONTH);
  const periodYear = ref(DEFAULT_PERIOD_YEAR);
  const theraClass = ref(DEFAULT_THERA_CLASS);
  const theraClasses = ref([]);

  const months = [
    { value: 1, label: "Janvier" },
    { value: 2, label: "Février" },
    { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" },
    { value: 8, label: "Août" },
    { value: 9, label: "Septembre" },
    { value: 10, label: "Octobre" },
    { value: 11, label: "Novembre" },
    { value: 12, label: "Décembre" },
  ];

  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const kpis = ref({
    nb_produits_perimant: 0,
    tx_dispo: "0 %",
    taux_disponibilite_value: 0,
    nb_produits_mouvement: 0,
    nb_produits_actifs: 0,
  });

  const etatStockShare = ref([]);
  const syntheseLoaded = ref(false);
  let syntheseAbortCtrl = null;
  let monthlyTableAbortCtrl = null;
  let syntheseRequestId = 0;

  function reset() {
    periodMonth.value = DEFAULT_PERIOD_MONTH;
    periodYear.value = DEFAULT_PERIOD_YEAR;
    theraClass.value = DEFAULT_THERA_CLASS;
  }

  function buildSyntheseParams() {
    return {
      annee: periodYear.value,
      mois: periodMonth.value,
      classe: theraClass.value,
    };
  }

  function isRequestCanceled(err) {
    return err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
  }

  async function fetchClasses() {
    //const { data } = await axios.get(`${API}/api/dashboard/classes`);
    const { data } = await api.get("/api/dashboard/classes");
    theraClasses.value = data.classes || [];
  }

  const movementHist = ref([]);

  const monthlyTable = ref([]);
  const monthlyTableLoading = ref(false);

  async function fetchSyntheseBundle() {
    if (activeTab.value !== "synthese") return;

    syntheseRequestId += 1;
    const currentRequestId = syntheseRequestId;
    const params = buildSyntheseParams();

    if (syntheseAbortCtrl) {
      syntheseAbortCtrl.abort();
    }
    if (monthlyTableAbortCtrl) {
      monthlyTableAbortCtrl.abort();
    }

    syntheseAbortCtrl = new AbortController();
    monthlyTableAbortCtrl = new AbortController();
    monthlyTableLoading.value = true;
    const monthlyTablePromise = api.get("/api/dashboard/tableau_mensuel", {
      params,
      signal: monthlyTableAbortCtrl.signal,
    });

    try {
      const [kpisResponse, etatStockResponse, movementHistResponse] = await Promise.all([
        api.get("/api/dashboard/kpis", {
          params,
          signal: syntheseAbortCtrl.signal,
        }),
        api.get("/api/dashboard/etat_stock_share", {
          params,
          signal: syntheseAbortCtrl.signal,
        }),
        api.get("/api/dashboard/movement_hist", {
          params,
          signal: syntheseAbortCtrl.signal,
        }),
      ]);

      if (currentRequestId !== syntheseRequestId) return;

      const kpisData = kpisResponse.data ?? {};
      kpis.value.nb_produits_perimant = kpisData.nb_produits_perimant ?? 0;
      kpis.value.taux_disponibilite_value = Number(kpisData.taux_disponibilite ?? 0) || 0;
      kpis.value.tx_dispo = `${kpis.value.taux_disponibilite_value} %`;
      kpis.value.nb_produits_mouvement = kpisData.nb_produits_mouvement ?? 0;
      kpis.value.nb_produits_actifs = kpisData.nb_produits_actifs ?? 0;

      etatStockShare.value = etatStockResponse.data?.items || [];
      movementHist.value = movementHistResponse.data?.items || [];
      syntheseLoaded.value = true;
    } catch (err) {
      if (!isRequestCanceled(err)) {
        console.error("Erreur chargement synthese:", err);
      }
    }

    try {
      const monthlyTableResponse = await monthlyTablePromise;

      if (currentRequestId !== syntheseRequestId) return;

      monthlyTable.value = monthlyTableResponse.data?.data || [];
    } catch (err) {
      if (!isRequestCanceled(err)) {
        console.error("Erreur chargement tableau mensuel:", err);
      }
    } finally {
      if (currentRequestId === syntheseRequestId) {
        monthlyTableLoading.value = false;
      }
    }
  }

  watch(
    [periodYear, periodMonth, theraClass],
    async () => {
      syntheseLoaded.value = false;
      await fetchSyntheseBundle();
    },
    { immediate: true }
  );

  watch(activeTab, async (tab) => {
    if (tab !== "synthese") {
      if (syntheseAbortCtrl) syntheseAbortCtrl.abort();
      if (monthlyTableAbortCtrl) monthlyTableAbortCtrl.abort();
      return;
    }
    if (syntheseLoaded.value) return;
    await fetchSyntheseBundle();
  });

  watch(activeTab, (tab) => {
    if (typeof window === "undefined") return;
    if (!VALID_TABS.includes(tab)) return;
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  });

  onMounted(async () => {
    theraClass.value = DEFAULT_THERA_CLASS;
    await fetchClasses();
  });

  onBeforeUnmount(() => {
    if (syntheseAbortCtrl) syntheseAbortCtrl.abort();
    if (monthlyTableAbortCtrl) monthlyTableAbortCtrl.abort();
  });

  return {
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
  };
}
