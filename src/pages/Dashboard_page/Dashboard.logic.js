import axios from "axios";
import { ref, watch, onMounted } from "vue";

export function useDashboardLogic() {
  const API = import.meta.env.VITE_API_BASE;

  const activeTab = ref("synthese");

  const now = new Date();

  // on recule d’un mois
  now.setMonth(now.getMonth() - 1)
  const periodMonth = ref(now.getMonth() + 1);
  const periodYear = ref(now.getFullYear()); //Changement d’année géré tout seul

  const theraClass = ref("ALL");
  const theraClasses = ref([]);

  const months = [
    { value: 1, label: "Janvier" }, { value: 2, label: "Février" }, { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },   { value: 5, label: "Mai" },     { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" }, { value: 8, label: "Août" },    { value: 9, label: "Septembre" },
    { value:10, label: "Octobre" }, { value:11, label: "Novembre" },{ value:12, label: "Décembre" },
  ];

  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i);

  const kpis = ref({
    nb_produits: 0,
    tx_dispo: "0 %",
    soldeNet: "0 F CFA",
  });

  // ✅ Donut : états de stock
  const etatStockShare = ref([]); // [{name, value}]

  function reset() {
    periodMonth.value = now.getMonth() + 1;
    periodYear.value = now.getFullYear();
    theraClass.value = "ALL";
  }

  const fmtCFA = (n) =>
    new Intl.NumberFormat("fr-FR").format(Number(n || 0)) + " F CFA";

  async function fetchClasses() {
    const { data } = await axios.get(`${API}/api/dashboard/classes`);
    theraClasses.value = data.classes || [];
  }

  async function fetchKpis() {
    if (activeTab.value !== "synthese") return;

    const { data } = await axios.get(`${API}/api/dashboard/kpis`, {
      params: {
        annee: periodYear.value,
        mois: periodMonth.value,
        classe: theraClass.value,
      },
    });

    kpis.value.nb_produits = data.nb_produits ?? 0;
    kpis.value.tx_dispo = (data.taux_disponibilite ?? 0) + " %";
    kpis.value.soldeNet = fmtCFA(data.benefice_net ?? 0);
  }

  async function fetchEtatStockShare() {
    if (activeTab.value !== "synthese") return;

    const { data } = await axios.get(`${API}/api/dashboard/etat_stock_share`, {
      params: {
        annee: periodYear.value,
        mois: periodMonth.value,
        classe: theraClass.value,
      },
    });

    etatStockShare.value = data.items || [];
  }

  // ✅ Histogramme : mouvements de stock
  const movementHist = ref([]); // [{mouvement, type, value}]

  async function fetchMovementHist() {
    if (activeTab.value !== "synthese") return;

    const { data } = await axios.get(`${API}/api/dashboard/movement_hist`, {
      params: {
        annee: periodYear.value,
        mois: periodMonth.value,
        classe: theraClass.value,
      },
    });

    movementHist.value = data.items || [];
  }

  // ✅ Tableau synthétique
  const monthlyTable = ref([]);      // lignes du tableau
  const monthlyTableLoading = ref(false);

  async function fetchMonthlyTable() {
    if (activeTab.value !== "synthese") return;

    monthlyTableLoading.value = true;
    try {
      const { data } = await axios.get(`${API}/api/dashboard/tableau_mensuel`, {
        params: {
          annee: periodYear.value,
          mois: periodMonth.value,
          classe: theraClass.value,
        },
      });
      monthlyTable.value = data.data || [];
    } finally {
      monthlyTableLoading.value = false;
    }
  }

  

  watch([periodYear, periodMonth, theraClass, activeTab], async () => {
    await fetchKpis();
    await fetchEtatStockShare();
    await fetchMovementHist();
    await fetchMonthlyTable(); 
  }, { immediate: true });

  onMounted(async () => {
    await fetchClasses();
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


