<template>
  <div>
    <!-- Titre seul -->
    <div class="table-title">
      <h2>Synthèse par produit</h2>
    </div> 
    <!-- Ligne filtres -->
    <div class="table-head">
      <input
        class="table-search"
        type="search"
        v-model="q"
        placeholder="Rechercher (produit)…"
        :disabled="loading"
      />
      
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
      <span class="table-hint" v-if="loading">Chargement…</span>
      <span class="table-hint" v-else>{{  rows.length }} Produits</span>
    </div>

    <div class="table-wrap-month">
      <table class="nice-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Dosage</th>
            <th>Forme</th>
            <th>Unité</th>
            <th class="num">Quantité initiale</th>
            <th class="num">Quantité entrée</th>
            <th class="num">Quantité sortie</th>
            <th class="num">SDU</th>
            <th class="num">CMM</th>
            <th>État de stock</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, i) in filtered" :key="i">
            <td class="prod" :title="r.produit">{{ r.produit }}</td>
            <td>{{ r.dosage || "-" }}</td>
            <td>{{ r.forme || "-" }}</td>
            <td>{{ r.unite || "-" }}</td>

            <td class="num">{{ fmtInt(r.quantite_initiale) }}</td>
            <td class="num">{{ fmtInt(r.quantite_entree) }}</td>
            <td class="num">{{ fmtInt(r.quantite_sortie) }}</td>
            <td class="num strong">{{ fmtInt(r.sdu) }}</td>
            <td class="num strong">{{ fmtCmm(r.cmm) }}</td>

            <td>
              <span class="badge" :class="badgeClass(r.etat_stock)">
                {{ r.etat_stock || "-" }}
              </span>
            </td>
          </tr>

          <tr v-if="!loading && items.length === 0">
            <td colspan="10" class="empty">Aucune donnée.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

/**
 * Props reçues depuis Dashboard:
 * - items: lignes du tableau (déjà filtrées par période + classe via backend)
 * - loading: état de chargement
 */
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});


// =======================================================
// 1) ÉTAT UI (recherche + filtres + tri)
// =======================================================

// Recherche (UNIQUEMENT sur le nom du produit)
const q = ref("");

// Filtres multi-choix (appliqués APRES période + classe)
const selectedCibles = ref([]); // ex: ["Femmes enceintes", "Enfants"]
const selectedEtats = ref([]);  // ex: ["Bon stock", "Sous-stock"]

// Tri (facultatif, mais pratique)
const sortKey = ref("produit"); // par défaut tri sur produit
const sortDir = ref("asc");     // "asc" ou "desc"


// =======================================================
// 2) OUTILS : formatage + helpers
// =======================================================

// Normaliser un texte pour comparer (recherche)
function norm(s) {
  return String(s ?? "").toLowerCase().trim();
}

// Format des quantités (arrondi entier + séparateurs FR)
function fmtInt(v) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

// CMM : arrondi au supérieur + 1 décimale
function fmtCmm(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  const up1 = Math.ceil(n * 10) / 10; // arrondi supérieur à 1 décimale
  return up1.toFixed(1).replace(".", ",");
}

// Classe CSS selon l'état de stock (si tu utilises des badges)
function badgeClass(etat) {
  if (etat === "Bon stock") return "ok";
  if (etat === "Sur-stock") return "warn";
  if (etat === "Sous-stock") return "bad";
  return "";
}

// Changer le tri au clic sur un header
function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
}


// =======================================================
// 3) OPTIONS pour les filtres (listes uniques)
//    -> on les déduit à partir des items reçus
// =======================================================

const optionsCibles = computed(() => {
  const set = new Set();
  for (const r of props.items) {
    const v = String(r?.cible ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );
});

const optionsEtats = computed(() => {
  const set = new Set();
  for (const r of props.items) {
    const v = String(r?.etat_stock ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );
});


// =======================================================
// 4) FILTRAGE (période+classe déjà faits backend)
//    -> ici on applique : cible + état + recherche produit
// =======================================================

const filtered = computed(() => {
  const qq = norm(q.value);

  return props.items
    // Filtre multi-choix "Cible"
    .filter((r) => {
      if (selectedCibles.value.length === 0) return true;
      return selectedCibles.value.includes(String(r?.cible ?? "").trim());
    })
    // Filtre multi-choix "État"
    .filter((r) => {
      if (selectedEtats.value.length === 0) return true;
      return selectedEtats.value.includes(String(r?.etat_stock ?? "").trim());
    })
    // Recherche UNIQUEMENT sur le nom du produit
    .filter((r) => {
      if (!qq) return true;
      return norm(r?.produit).includes(qq);
    });
});


// =======================================================
// 5) TRI (sur la liste filtrée)
// =======================================================

function cmp(a, b) {
  const key = sortKey.value;
  const dir = sortDir.value === "asc" ? 1 : -1;

  const va = a?.[key];
  const vb = b?.[key];

  // Si les 2 sont numériques → tri numérique
  const na = Number(va);
  const nb = Number(vb);
  const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);
  if (bothNumeric) return (na - nb) * dir;

  // Sinon → tri texte
  return (
    String(va ?? "").localeCompare(String(vb ?? ""), "fr", { sensitivity: "base" }) * dir
  );
}

const rows = computed(() => [...filtered.value].sort(cmp));


// =======================================================
// 6) Ce que le template utilise
//    -> rows (au lieu de paged) car PAS de pagination
// =======================================================

import MultiSelectChips from "@/components/MultiSelectChips.vue";


</script>


