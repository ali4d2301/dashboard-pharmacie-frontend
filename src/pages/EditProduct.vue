<template>
  <div class="page">
    <div class="top-sticky">
      <section class="hero">
        <div>
          <a class="back" href="/" @click.prevent="goBack">&larr; Retour</a>
          <p class="eyebrow">Gestion des produits</p>
          <h2>&Eacute;DITION DE PRODUITS</h2>
          <p class="sub">
            La fiche produit reste unique par code. Les lots sont g&eacute;r&eacute;s
            s&eacute;par&eacute;ment et seule la date de p&eacute;remption reste modifiable ici.
          </p>
        </div>
        <span class="chip">{{ displayedCountLabel }}</span>
      </section>

      <div class="toolbar">
        <button class="btn primary" type="button" @click="save">Enregistrer</button>
        <span
          v-if="msg"
          class="msg"
          :class="{ 'msg--error': msg.startsWith('Erreur'), 'msg--ok': !msg.startsWith('Erreur') }"
        >
          {{ msg }}
        </span>
      </div>

      <section class="table-head">
        <div class="table-left-actions">
          <input
            id="nameFilter"
            v-model.trim="nameQuery"
            class="table-search"
            type="search"
            placeholder="Rechercher un produit..."
          />
        </div>

        <div class="table-toolbar">
          <MultiSelectChips
            label="Code"
            placeholder="Tous"
            :options="codeOptions"
            v-model="selectedCodes"
          />
        </div>

        <span class="table-hint">{{ filteredProducts.length }} produit(s)</span>
      </section>

      <div ref="tableHeadEl" class="table-head-shell" :style="tableHeadStyle">
        <table class="tbl tbl--head">
          <colgroup>
            <col class="col-code" />
            <col class="col-produit" />
            <col class="col-classe" />
            <col class="col-cible" />
            <col class="col-unite" />
            <col class="col-lot" />
            <col class="col-date" />
            <col class="col-statut" />
          </colgroup>

          <thead>
            <tr>
              <th>Code</th>
              <th>Produit</th>
              <th>Classe</th>
              <th>Cible</th>
              <th>Unit&eacute;</th>
              <th>Lot &agrave; modifier</th>
              <th>P&eacute;remption du lot</th>
              <th>Statut</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>

    <div ref="tableBodyEl" class="tablewrap table-body-scroll" @scroll="syncTableScroll">
      <table class="tbl tbl--body">
        <colgroup>
          <col class="col-code" />
          <col class="col-produit" />
          <col class="col-classe" />
          <col class="col-cible" />
          <col class="col-unite" />
          <col class="col-lot" />
          <col class="col-date" />
          <col class="col-statut" />
        </colgroup>

        <tbody>
          <tr v-if="filteredProducts.length === 0">
            <td class="empty-row" colspan="8">Aucun produit ne correspond aux filtres.</td>
          </tr>

          <tr v-for="product in filteredProducts" :key="product.code">
            <td class="code">{{ product.code }}</td>
            <td class="product-cell">
              <textarea
                v-model.trim="draft[product.code].produit"
                class="cell cell--textarea"
                rows="2"
              ></textarea>
            </td>
            <td>
              <select v-model="draft[product.code].classe" class="cell cell--select">
                <option
                  v-for="option in classeOptions"
                  :key="`classe-${option}`"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="draft[product.code].cible" class="cell cell--select">
                <option
                  v-for="option in cibleOptions"
                  :key="`cible-${option}`"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </td>
            <td><input v-model.trim="draft[product.code].unite" class="cell" /></td>
            <td>
              <div class="lot-editor">
                <select
                  v-model="draft[product.code].selectedLotId"
                  class="cell cell--select"
                  :disabled="!product.lots?.length"
                >
                  <option disabled value="">
                    {{ product.lots?.length ? "Choisir un lot..." : "Aucun lot" }}
                  </option>
                  <option
                    v-for="lot in product.lots ?? []"
                    :key="lot.id"
                    :value="String(lot.id)"
                  >
                    {{ formatLotOption(product.code, lot) }}
                  </option>
                </select>
                <span v-if="!getSelectedLotDraft(product.code)" class="lot-empty">
                  Aucun lot disponible
                </span>
              </div>
            </td>
            <td>
              <input
                v-if="draft[product.code].selectedLotId && draft[product.code].lotEdits?.[draft[product.code].selectedLotId]"
                v-model="draft[product.code].lotEdits[draft[product.code].selectedLotId].date_peremption"
                type="date"
                class="cell"
              />
              <span v-else class="lot-empty">Aucune date</span>
            </td>
            <td>
              <select v-model="draft[product.code].statut" class="cell cell--select">
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import MultiSelectChips from "@/components/MultiSelectChips.vue";
import api from "@/services/api";
import { getDefaultRouteForRole } from "@/utils/auth";

const products = ref([]);
const draft = ref({});
const msg = ref("");
const selectedCodes = ref([]);
const nameQuery = ref("");
const router = useRouter();
const tableHeadEl = ref(null);
const tableBodyEl = ref(null);
const headScrollbarWidth = ref(0);

function goBack() {
  router.push(getDefaultRouteForRole());
}

function normalizeText(value) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value) {
  const normalized = normalizeDate(value);
  if (!normalized) return "";

  const [year, month, day] = normalized.split("-");
  return year && month && day ? `${day}/${month}/${year}` : normalized;
}

function normalizeChoice(value) {
  const text = String(value ?? "").trim();
  return text || "Autres";
}

function buildLotEdits(lots) {
  const nextEdits = {};

  for (const lot of lots ?? []) {
    nextEdits[String(lot.id)] = {
      date_peremption: normalizeDate(lot.date_peremption),
    };
  }

  return nextEdits;
}

function getSelectedLotDraft(code) {
  const rowDraft = draft.value[code];
  if (!rowDraft || !rowDraft.selectedLotId) return null;
  return rowDraft.lotEdits?.[rowDraft.selectedLotId] ?? null;
}

function formatLotOption(code, lot) {
  const lotDraft = draft.value[code]?.lotEdits?.[String(lot.id)];
  const peremption = lotDraft?.date_peremption ?? normalizeDate(lot.date_peremption);
  const stock = Number(lot.stock_lot ?? 0);
  const stockLabel = Number.isFinite(stock) ? stock.toLocaleString("fr-FR") : "0";

  return `${lot.numero_lot ?? ""} | exp. ${formatDate(peremption)} | stock ${stockLabel}`;
}

const codeOptions = computed(() =>
  [...new Set(products.value.map((product) => String(product.code ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
);

function buildSelectOptions(fieldName) {
  const values = new Set(["Autres"]);

  for (const product of products.value) {
    values.add(normalizeChoice(product[fieldName]));
  }

  return [...values].sort((left, right) => {
    if (left === "Autres") return -1;
    if (right === "Autres") return 1;
    return left.localeCompare(right, "fr", { sensitivity: "base" });
  });
}

const classeOptions = computed(() => buildSelectOptions("classe"));
const cibleOptions = computed(() => buildSelectOptions("cible"));

const filteredProducts = computed(() => {
  const codeSet = new Set(selectedCodes.value);
  const query = normalizeText(nameQuery.value);

  return products.value.filter((product) => {
    const current = draft.value[product.code] ?? product;
    const matchesCode = codeSet.size === 0 || codeSet.has(product.code);
    const haystack = `${current.produit ?? ""}`;
    const matchesSearch = query.length === 0 || normalizeText(haystack).includes(query);

    return matchesCode && matchesSearch;
  });
});

const displayedCountLabel = computed(() => {
  const total = products.value.length;
  const shown = filteredProducts.value.length;
  const activeFilters = selectedCodes.value.length > 0 || nameQuery.value.length > 0;

  return activeFilters ? `${shown}/${total} produit(s)` : `${total} produit(s)`;
});

const tableHeadStyle = computed(() => ({
  "--head-scrollbar-width": `${headScrollbarWidth.value}px`,
}));

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

async function reload(clearMessage = true) {
  if (clearMessage) msg.value = "";

  try {
    const response = await api.get("/api/products/edit_products");
    products.value = response.data;

    const nextDraft = {};
    for (const product of products.value) {
      nextDraft[product.code] = {
        produit: product.produit ?? "",
        classe: normalizeChoice(product.classe),
        cible: normalizeChoice(product.cible),
        unite: product.unite ?? "",
        statut: product.statut ?? "Actif",
        selectedLotId: product.lots?.length ? String(product.lots[0].id) : "",
        lotEdits: buildLotEdits(product.lots),
      };
    }

    draft.value = nextDraft;

    const availableCodes = new Set(products.value.map((product) => product.code));
    selectedCodes.value = selectedCodes.value.filter((code) => availableCodes.has(code));
  } catch (error) {
    msg.value = "Erreur: " + (error?.response?.data?.detail || "chargement impossible.");
  }
}

function buildPatches() {
  const patches = [];

  for (const product of products.value) {
    const currentDraft = draft.value[product.code];
    const productPatch = { code: product.code };
    let productChanged = false;

    if (currentDraft.produit !== (product.produit ?? "")) {
      productPatch.produit = currentDraft.produit;
      productChanged = true;
    }
    if (currentDraft.classe !== normalizeChoice(product.classe)) {
      productPatch.classe = currentDraft.classe;
      productChanged = true;
    }
    if (currentDraft.cible !== normalizeChoice(product.cible)) {
      productPatch.cible = currentDraft.cible;
      productChanged = true;
    }
    if (currentDraft.unite !== (product.unite ?? "")) {
      productPatch.unite = currentDraft.unite;
      productChanged = true;
    }
    if ((currentDraft.statut ?? "Actif") !== (product.statut ?? "Actif")) {
      productPatch.statut = currentDraft.statut;
      productChanged = true;
    }

    if (productChanged) patches.push(productPatch);

    for (const lot of product.lots ?? []) {
      const lotDraft = currentDraft.lotEdits?.[String(lot.id)];
      if (!lotDraft) continue;

      const nextDate = normalizeDate(lotDraft.date_peremption);
      const currentDate = normalizeDate(lot.date_peremption);
      if (nextDate === currentDate) continue;

      patches.push({
        code: product.code,
        lot_id: lot.id,
        lot_date_peremption: nextDate,
      });
    }
  }

  return patches;
}

function validateProductNames() {
  for (const product of products.value) {
    const currentDraft = draft.value[product.code];
    const productName = String(currentDraft?.produit ?? "").trim();
    if (!productName) {
      return `Le nom du produit est obligatoire pour la ligne ${product.code}.`;
    }
  }

  return "";
}

function validateLotDrafts() {
  for (const product of products.value) {
    const currentDraft = draft.value[product.code];

    for (const lot of product.lots ?? []) {
      const lotDraft = currentDraft.lotEdits?.[String(lot.id)];
      if (!lotDraft) continue;

      const lotChanged =
        normalizeDate(lotDraft.date_peremption) !== normalizeDate(lot.date_peremption);
      if (!lotChanged) continue;

      if (!normalizeDate(lotDraft.date_peremption)) {
        return `La date de p\u00e9remption du lot est obligatoire pour le produit ${product.code}.`;
      }
    }
  }

  return "";
}

async function save() {
  msg.value = "";

  const productNameError = validateProductNames();
  if (productNameError) {
    msg.value = `Erreur: ${productNameError}`;
    return;
  }

  const validationError = validateLotDrafts();
  if (validationError) {
    msg.value = `Erreur: ${validationError}`;
    return;
  }

  const patches = buildPatches();
  if (patches.length === 0) {
    msg.value = "Aucune modification.";
    return;
  }

  try {
    const response = await api.put("/api/products/edit_products", patches);
    const updated = Number(response?.data?.updated ?? 0);
    msg.value = `OK: ${updated} ligne(s) mise(s) \u00e0 jour.`;
    await reload(false);
  } catch (error) {
    msg.value = "Erreur: " + (error?.response?.data?.detail || "\u00e9chec de la sauvegarde.");
  }
}

onMounted(async () => {
  await reload();
  window.addEventListener("resize", updateHeadScrollbarWidth);
  requestAnimationFrame(() => {
    updateHeadScrollbarWidth();
    syncTableScroll();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateHeadScrollbarWidth);
});

watch(
  filteredProducts,
  async () => {
    await nextTick();
    updateHeadScrollbarWidth();
    syncTableScroll();
  },
  { flush: "post" }
);
</script>

<style scoped>
.page {
  --bg-main: #fff8f3;
  --bg-card: #fffdfb;
  --ink: #332b25;
  --muted: #6d6158;
  --line: #f0e2d7;
  --line-strong: #e3d6cc;
  --line-hover: #d8c4b6;
  --accent: #e46f36;
  --accent-dark: #c85f2b;
  --accent-title: #8a4c00;
  --accent-soft: #fff5ed;
  --ok-bg: #e8f8ee;
  --ok-text: #196337;
  --error-bg: #ffe9e8;
  --error-text: #8e1f20;
  --font-sans: Arial, sans-serif;

  min-height: 100vh;
  width: min(1380px, 96%);
  margin: 0 auto;
  padding: clamp(10px, 1.5vw, 16px) clamp(14px, 2vw, 24px) clamp(16px, 2vw, 24px);
  color: var(--ink);
  font-family: var(--font-sans);
  background: linear-gradient(180deg, #fffdfb 0%, #fff8f3 100%);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(146, 95, 42, 0.08);
}

.top-sticky {
  position: sticky;
  top: 0;
  z-index: 40;
  padding-bottom: 12px;
  background:
    linear-gradient(180deg, rgba(255, 253, 251, 0.98) 0%, rgba(255, 253, 251, 0.96) 82%, rgba(255, 253, 251, 0) 100%);
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f4e6dc;
  animation: riseIn 0.42s ease both;
}

.back {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--accent);
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  transition: color 0.18s ease, transform 0.18s ease;
}

.back:hover {
  color: var(--accent-dark);
  transform: translateX(-1px);
}

.eyebrow {
  margin: 0;
  color: #9a471f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h2 {
  margin: 4px 0;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: clamp(28px, 3.8vw, 58px);
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: var(--accent-title);
}

.sub {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  font-style: italic;
  line-height: 1.45;
  max-width: 860px;
}

.chip {
  align-self: center;
  padding: 10px 16px;
  border: 1px solid #ecc5ae;
  border-radius: 999px;
  background: var(--accent-soft);
  color: #9a471f;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
  animation: riseIn 0.52s ease both;
}

.table-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(180deg, #fff8f2 0%, #fffdfb 100%);
  position: relative;
  z-index: 30;
  animation: riseIn 0.58s ease both;
}

.table-left-actions {
  display: flex;
  align-items: center;
  flex: 1 1 420px;
  min-width: 0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 40;
}

.table-search,
.btn,
.msg,
.tbl,
.cell {
  font-family: inherit;
}

.table-search {
  width: min(620px, 100%);
  padding: 9px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  outline: none;
  background: #fffefa;
  color: #5b3016;
  font-size: 15px;
  font-weight: 700;
  box-shadow: inset 0 1px 1px rgba(108, 74, 40, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.table-search::placeholder {
  color: #666;
  font-weight: 400;
}

.table-search:focus {
  border-color: var(--accent);
  background: #fff;
  box-shadow:
    inset 0 1px 1px rgba(108, 74, 40, 0.03),
    0 0 0 3px rgba(228, 111, 54, 0.12);
}

.table-hint {
  margin-left: auto;
  color: #8a7768;
  font-size: 13px;
  font-weight: 700;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.04);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.btn:active {
  transform: translateY(0);
}

.btn.primary {
  background: linear-gradient(180deg, #eea276 0%, #e46f36 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(228, 111, 54, 0.25);
}

.btn.primary:hover {
  box-shadow: 0 10px 20px rgba(214, 104, 42, 0.22);
}

.msg {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.msg--ok {
  border: 1px solid #b8e5c8;
  background: var(--ok-bg);
  color: var(--ok-text);
}

.msg--error {
  border: 1px solid #f5b9b6;
  background: var(--error-bg);
  color: var(--error-text);
}

.tablewrap {
  max-height: calc(100vh - 236px);
  position: relative;
  overscroll-behavior: contain;
  animation: riseIn 0.62s ease both;
}

.table-head-shell {
  overflow: hidden;
  box-sizing: border-box;
  padding-right: var(--head-scrollbar-width, 0px);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  background: linear-gradient(180deg, #fff2e7 0%, #ffe8d8 100%);
  box-shadow:
    0 12px 24px rgba(146, 95, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.table-body-scroll {
  overflow: auto;
  scrollbar-gutter: stable;
  border: 1px solid var(--line);
  border-top: none;
  border-radius: 0 0 16px 16px;
  background: var(--bg-card);
  box-shadow: 0 16px 34px rgba(146, 95, 42, 0.08);
}

.tbl {
  width: 100%;
  min-width: 1010px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.tbl col.col-code {
  width: 74px;
}

.tbl col.col-produit {
  width: 210px;
}

.tbl col.col-classe,
.tbl col.col-cible {
  width: 166px;
}

.tbl col.col-unite {
  width: 88px;
}

.tbl col.col-lot {
  width: 224px;
}

.tbl col.col-date {
  width: 126px;
}

.tbl col.col-statut {
  width: 90px;
}

.tbl th,
.tbl td {
  padding: 10px 8px;
  border-bottom: 1px solid #f3e4d8;
}

.tbl th {
  position: relative;
  background: linear-gradient(180deg, #fff2e7 0%, #ffe8d8 100%);
  color: #5b3318;
  text-align: left;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.01em;
  box-shadow:
    inset 0 -1px 0 #edd7c6,
    0 1px 0 rgba(255, 255, 255, 0.78);
}

.tbl--head th {
  z-index: 2;
}

.tbl tbody td {
  vertical-align: middle;
  background: #fffdfa;
}

.tbl tbody tr:nth-child(even) td {
  background: #fff9f5;
}

.tbl tbody tr:hover td {
  background: #fff2e7;
}

.empty-row {
  padding: 18px 12px;
  color: var(--muted);
  text-align: center;
  font-weight: 600;
}

.cell {
  width: 100%;
  height: 56px;
  min-height: 56px;
  padding: 9px 12px;
  box-sizing: border-box;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: #fffefa;
  color: #5b3016;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  box-shadow: inset 0 1px 1px rgba(108, 74, 40, 0.04);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.cell:focus {
  outline: none;
  border-color: var(--accent);
  background: #fff;
  box-shadow:
    inset 0 1px 1px rgba(108, 74, 40, 0.03),
    0 0 0 3px rgba(228, 111, 54, 0.12);
}

.cell--select {
  cursor: pointer;
}

.cell--textarea {
  resize: none;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #b42318;
}

.product-cell {
  vertical-align: middle;
}

.product-cell .cell--textarea {
  text-align: left;
  margin: auto 0;
}

.code {
  font-family: "Arial Black", Arial, sans-serif;
  color: #4f2a12;
  font-weight: 900;
  font-size: 16px;
}

.lot-editor {
  display: grid;
  gap: 6px;
}

.lot-empty {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  color: #8a7768;
  font-size: 12px;
  font-weight: 600;
}

.table-toolbar :deep(.ms) {
  width: min(420px, 100%);
  min-width: 280px;
  z-index: 100;
}

.table-toolbar :deep(.ms-btn),
.table-toolbar :deep(.ms-search),
.table-toolbar :deep(.ms-clear),
.table-toolbar :deep(.ms-done) {
  font-family: inherit;
}

.table-toolbar :deep(.ms-btn) {
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: #fffefa;
  box-shadow: inset 0 1px 1px rgba(108, 74, 40, 0.04);
}

.table-toolbar :deep(.ms-btn:hover) {
  border-color: var(--line-hover);
}

.table-toolbar :deep(.ms-label) {
  color: #9a471f;
  font-size: 12px;
  font-weight: 800;
}

.table-toolbar :deep(.ms-placeholder) {
  color: #666;
  font-size: 14px;
}

.table-toolbar :deep(.ms-caret) {
  color: #8a7768;
}

.table-toolbar :deep(.chip) {
  border-color: #f0d7c6;
  background: #fff3e9;
  color: #9a471f;
  font-size: 12px;
  font-weight: 700;
}

.table-toolbar :deep(.chip-x) {
  color: #9a471f;
}

.table-toolbar :deep(.ms-dd) {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fffdfb;
  box-shadow: 0 18px 36px rgba(146, 95, 42, 0.12);
  z-index: 130;
}

.table-toolbar :deep(.ms-top),
.table-toolbar :deep(.ms-bottom) {
  border-color: #f4e6dc;
}

.table-toolbar :deep(.ms-search) {
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: #fffefa;
  color: #5b3016;
  font-size: 14px;
  font-weight: 700;
}

.table-toolbar :deep(.ms-search:focus) {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(228, 111, 54, 0.12);
}

.table-toolbar :deep(.ms-clear) {
  border: 1px solid #ecc5ae;
  border-radius: 10px;
  background: #fff5ed;
  color: #9a471f;
  font-weight: 700;
}

.table-toolbar :deep(.ms-item) {
  color: #4d3425;
}

.table-toolbar :deep(.ms-item:hover) {
  background: #fff2e7;
}

.table-toolbar :deep(.ms-empty) {
  color: #8a7768;
}

.table-toolbar :deep(.ms-done) {
  border: 1px solid transparent;
  border-radius: 10px;
  background: linear-gradient(180deg, #eea276 0%, #e46f36 100%);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(228, 111, 54, 0.2);
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 780px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .chip {
    align-self: flex-start;
  }

  .tablewrap {
    max-height: calc(100vh - 220px);
  }
}

@media (max-width: 640px) {
  .page {
    width: min(96%, 96%);
    padding: 12px;
    border-radius: 14px;
  }

  .table-head {
    align-items: stretch;
    gap: 10px;
    padding: 10px;
  }

  .table-left-actions,
  .table-toolbar {
    width: 100%;
    flex: none;
  }

  .table-toolbar :deep(.ms) {
    width: 100%;
    min-width: 0;
  }

  .table-search {
    width: 100%;
  }

  .table-hint {
    margin-left: 0;
  }

  .btn {
    flex: 1 1 145px;
    justify-content: center;
  }

  .tablewrap {
    max-height: calc(100vh - 210px);
  }
}
</style>
