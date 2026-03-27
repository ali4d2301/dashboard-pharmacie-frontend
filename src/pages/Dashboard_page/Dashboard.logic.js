//import axios from "axios";
import api from "@/services/api";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

export function useDashboardLogic() {
  const TAB_STORAGE_KEY = "dashboard_active_tab";
  const VALID_TABS = ["synthese", "liste", "mvts"];
  const DEFAULT_THERA_CLASS = "ALL";
  const today = new Date();
  const currentYear = today.getFullYear();
  const DEFAULT_PERIOD_MONTH = today.getMonth() + 1;
  const DEFAULT_PERIOD_YEAR = currentYear;

  function createDefaultKpis() {
    return {
      nb_produits_perimant: 0,
      tx_dispo: "0 %",
      taux_disponibilite_value: 0,
      nb_produits_mouvement: 0,
      nb_produits_actifs: 0,
    };
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

  const kpis = ref(createDefaultKpis());

  const etatStockShare = ref([]);
  const syntheseLoaded = ref(false);
  const dashboardError = ref("");
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
    dashboardError.value = "";

    try {
      const { data } = await api.get("/api/dashboard/classes");
      theraClasses.value = data.classes || [];
    } catch (err) {
      if (isRequestCanceled(err)) return;

      theraClasses.value = [];
      dashboardError.value = getRequestErrorMessage(
        err,
        "Chargement des classes du dashboard impossible pour le moment."
      );
    }
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
    dashboardError.value = "";

    const [kpisResult, etatStockResult, movementHistResult, monthlyTableResult] =
      await Promise.allSettled([
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
        api.get("/api/dashboard/tableau_mensuel", {
          params,
          signal: monthlyTableAbortCtrl.signal,
        }),
      ]);

    if (currentRequestId !== syntheseRequestId) return;

    let hasError = false;

    if (kpisResult.status === "fulfilled") {
      const kpisData = kpisResult.value.data ?? {};
      kpis.value.nb_produits_perimant = kpisData.nb_produits_perimant ?? 0;
      kpis.value.taux_disponibilite_value = Number(kpisData.taux_disponibilite ?? 0) || 0;
      kpis.value.tx_dispo = `${kpis.value.taux_disponibilite_value} %`;
      kpis.value.nb_produits_mouvement = kpisData.nb_produits_mouvement ?? 0;
      kpis.value.nb_produits_actifs = kpisData.nb_produits_actifs ?? 0;
    } else if (!isRequestCanceled(kpisResult.reason)) {
      kpis.value = createDefaultKpis();
      hasError = true;
      console.error("Erreur chargement synthese:", kpisResult.reason);
    }

    if (etatStockResult.status === "fulfilled") {
      etatStockShare.value = etatStockResult.value.data?.items || [];
    } else if (!isRequestCanceled(etatStockResult.reason)) {
      etatStockShare.value = [];
      hasError = true;
      console.error("Erreur chargement etat de stock:", etatStockResult.reason);
    }

    if (movementHistResult.status === "fulfilled") {
      movementHist.value = movementHistResult.value.data?.items || [];
    } else if (!isRequestCanceled(movementHistResult.reason)) {
      movementHist.value = [];
      hasError = true;
      console.error("Erreur chargement historique mouvements:", movementHistResult.reason);
    }

    if (monthlyTableResult.status === "fulfilled") {
      monthlyTable.value = monthlyTableResult.value.data?.data || [];
    } else if (!isRequestCanceled(monthlyTableResult.reason)) {
      monthlyTable.value = [];
      hasError = true;
      console.error("Erreur chargement tableau mensuel:", monthlyTableResult.reason);
    }

    syntheseLoaded.value = !hasError;
    if (hasError) {
      dashboardError.value = getRequestErrorMessage(
        kpisResult.status === "rejected" && !isRequestCanceled(kpisResult.reason)
          ? kpisResult.reason
          : etatStockResult.status === "rejected" && !isRequestCanceled(etatStockResult.reason)
            ? etatStockResult.reason
            : movementHistResult.status === "rejected" &&
                !isRequestCanceled(movementHistResult.reason)
              ? movementHistResult.reason
              : monthlyTableResult.status === "rejected" &&
                  !isRequestCanceled(monthlyTableResult.reason)
                ? monthlyTableResult.reason
                : null,
        "Certaines donnees du dashboard n'ont pas pu etre chargees."
      );
    }

    if (currentRequestId === syntheseRequestId) {
      monthlyTableLoading.value = false;
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
    dashboardError,
    kpis,
    etatStockShare,
    movementHist,
    monthlyTable,
    monthlyTableLoading,
    reset,
  };
}
