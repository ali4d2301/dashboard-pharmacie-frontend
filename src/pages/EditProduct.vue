<template>
  <div class="page" :style="pageStyle">
    <div class="top-sticky" ref="topSticky">
      <section class="hero">
        <div>
          <a class="back" href="/" @click.prevent="router.push('/')">&larr; Retour</a>
          <p class="eyebrow">Gestion des produits</p>
          <h2>EDITION DE PRODUITS</h2>
          <p class="sub">Mettez a jour les informations puis enregistrez les changements.</p>
        </div>
        <span class="chip">{{ displayedCountLabel }}</span>
      </section>

      <div class="toolbar">
        <button class="btn primary" type="button" @click="save">Enregistrer</button>
        <span class="msg" :class="{ 'msg--error': msg.startsWith('Erreur'), 'msg--ok': !msg.startsWith('Erreur') }" v-if="msg">{{ msg }}</span>
      </div>

      <section class="table-head">
        <div class="table-left-actions">
          <input
            id="nameFilter"
            v-model.trim="nameQuery"
            class="table-search"
            type="search"
            placeholder="Rechercher (produit)..."
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
    </div>

    <div class="tablewrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Code</th>
            <th>Produit</th>
            <th>Unite</th>
            <th>Prix achat</th>
            <th>Prix vente</th>
            <th>Statut</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="filteredProducts.length === 0">
            <td class="empty-row" colspan="6">Aucun produit ne correspond aux filtres.</td>
          </tr>

          <tr v-for="p in filteredProducts" :key="p.code">
            <td class="mono code">{{ p.code }}</td>

            <td>
              <input v-model="draft[p.code].produit" class="cell" />
            </td>

            <td>
              <input v-model="draft[p.code].unite" class="cell" />
            </td>

            <td>
              <input type="number" step="5" v-model.number="draft[p.code].prix_achat" class="cell cell--num" />
            </td>

            <td>
              <input type="number" step="5" v-model.number="draft[p.code].prix_vente" class="cell cell--num" />
            </td>

            <td>
              <select v-model="draft[p.code].statut" class="cell cell--select">
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
import api from "@/services/api";
import MultiSelectChips from "@/components/MultiSelectChips.vue";

const products = ref([]);
const draft = ref({});
const msg = ref("");
const selectedCodes = ref([]);
const nameQuery = ref("");
const router = useRouter();
const topSticky = ref(null);
const stickyOffset = ref(0);
let topStickyObserver = null;

function normalizeText(value) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const codeOptions = computed(() =>
  [...new Set(products.value.map((p) => String(p.code ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
);

const filteredProducts = computed(() => {
  const codeSet = new Set(selectedCodes.value);
  const query = normalizeText(nameQuery.value);

  return products.value.filter((p) => {
    const name = normalizeText(draft.value[p.code]?.produit ?? p.produit);
    const matchCode = codeSet.size === 0 || codeSet.has(p.code);
    const matchName = query.length === 0 || name.includes(query);
    return matchCode && matchName;
  });
});

const displayedCountLabel = computed(() => {
  const total = products.value.length;
  const shown = filteredProducts.value.length;
  const active = selectedCodes.value.length > 0 || nameQuery.value.length > 0;
  return active ? `${shown}/${total} produit(s)` : `${total} produit(s)`;
});

const pageStyle = computed(() => ({
  "--sticky-offset": `${stickyOffset.value}px`,
}));

function updateStickyOffset() {
  stickyOffset.value = topSticky.value?.offsetHeight ?? 0;
}

async function reload(clearMessage = true) {
  if (clearMessage) msg.value = "";
  try {
    const res = await api.get("/api/products/edit_products");
    products.value = res.data;

    // copie pour edition/comparaison
    const d = {};
    for (const p of products.value) {
      d[p.code] = {
        produit: p.produit,
        unite: p.unite,
        prix_achat: p.prix_achat,
        prix_vente: p.prix_vente,
        statut: p.statut ?? "Actif",
      };
    }
    draft.value = d;

    const availableCodes = new Set(products.value.map((p) => p.code));
    selectedCodes.value = selectedCodes.value.filter((code) => availableCodes.has(code));
  } catch (e) {
    msg.value = "Erreur: " + (e?.response?.data?.detail || "chargement impossible.");
  }
}

function buildPatches() {
  const patches = [];

  for (const p of products.value) {
    const after = draft.value[p.code];

    const patch = { code: p.code };
    let changed = false;

    if (after.produit !== p.produit) { patch.produit = after.produit; changed = true; }
    if (after.unite !== p.unite) { patch.unite = after.unite; changed = true; }
    if (after.prix_achat !== p.prix_achat) { patch.prix_achat = after.prix_achat; changed = true; }
    if (after.prix_vente !== p.prix_vente) { patch.prix_vente = after.prix_vente; changed = true; }
    if ((after.statut ?? "Actif") !== (p.statut ?? "Actif")) { patch.statut = after.statut; changed = true; }

    if (changed) patches.push(patch);
  }

  return patches;
}

async function save() {
  msg.value = "";
  const patches = buildPatches();

  if (patches.length === 0) {
    msg.value = "Aucune modification.";
    return;
  }

  try {
    const res = await api.put("/api/products/edit_products", patches);


    const updated = Number(res?.data?.updated ?? 0);
    msg.value = `OK: ${updated} ligne(s) mise(s) a jour.`;
    await reload(false);
  } catch (e) {
    msg.value = "Erreur: " + (e?.response?.data?.detail || "echec de la sauvegarde.");
  }
}

onMounted(async () => {
  await reload();
  await nextTick();
  updateStickyOffset();

  window.addEventListener("resize", updateStickyOffset);
  if ("ResizeObserver" in window && topSticky.value) {
    topStickyObserver = new ResizeObserver(() => updateStickyOffset());
    topStickyObserver.observe(topSticky.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateStickyOffset);
  if (topStickyObserver) {
    topStickyObserver.disconnect();
    topStickyObserver = null;
  }
});

watch([msg, selectedCodes, nameQuery], async () => {
  await nextTick();
  updateStickyOffset();
}, { deep: true });
</script>

<style scoped>
.page {
  --bg-main: #fffaf4;
  --bg-card: #ffffff;
  --ink: #1f2734;
  --muted: #617083;
  --line: #eadbcf;
  --accent: #e46f36;
  --accent-dark: #9a471f;
  --ok-bg: #e8f8ee;
  --ok-text: #196337;
  --error-bg: #ffe9e8;
  --error-text: #8e1f20;

  min-height: 100vh;
  max-width: 1240px;
  margin: 0 auto;
  padding: clamp(8px, 1.6vw, 16px) clamp(14px, 2.6vw, 30px) clamp(14px, 2.2vw, 24px);
  color: var(--ink);
  font-family: "Montserrat", "Segoe UI", Tahoma, sans-serif;
  background:
    radial-gradient(760px 360px at 8% -5%, #ffe7d2 0%, transparent 62%),
    radial-gradient(680px 320px at 100% 0%, #fff2e3 0%, transparent 56%),
    var(--bg-main);
}

.top-sticky {
  position: sticky;
  top: 0;
  z-index: 60;
  background:
    linear-gradient(180deg, rgba(255, 250, 244, 0.98) 0%, rgba(255, 250, 244, 0.96) 84%, rgba(255, 250, 244, 0.88) 100%);
  backdrop-filter: blur(2px);
  padding: 0 0 6px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
  animation: riseIn 0.42s ease both;
}

.back {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--accent-dark);
  font-size: 20px;
  text-decoration: none;
  font-weight: 700;
}

.back:hover {
  text-decoration: underline;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--accent-dark);
}

h2 {
  margin: 4px 0;
  font-size: clamp(26px, 3vw, 40px);
  line-height: 1.1;
}

.sub {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}

.chip {
  align-self: center;
  border: 1px solid #f0c9af;
  color: var(--accent-dark);
  background: #fff3e9;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
  animation: riseIn 0.52s ease both;
}

.table-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
  animation: riseIn 0.58s ease both;
  position: relative;
  z-index: 80;
}

.table-left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 420px;
  min-width: 0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0;
  position: relative;
  z-index: 90;
}

.table-search {
  width: min(620px, 100%);
  padding: 10px 12px;
  border: 1px solid #e6e9f0;
  border-radius: 12px;
  outline: none;
  background: #fff;
}

.table-search:focus {
  border-color: #d8a485;
  box-shadow: 0 0 0 3px rgba(216, 164, 133, 0.24);
}

.table-hint {
  font-size: 13px;
  color: #6b7280;
  margin-left: auto;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }

.btn.ghost {
  background: #ffffff;
  border-color: #dfd3c9;
  color: #3d4652;
}

.btn.ghost:hover {
  box-shadow: 0 5px 14px rgba(46, 54, 66, 0.12);
}

.btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #ea7d40 0%, #d55f25 100%);
}

.btn.primary:hover {
  box-shadow: 0 8px 20px rgba(213, 95, 37, 0.35);
}

.msg {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
}

.msg--ok {
  color: var(--ok-text);
  background: var(--ok-bg);
  border: 1px solid #b8e5c8;
}

.msg--error {
  color: var(--error-text);
  background: var(--error-bg);
  border: 1px solid #f5b9b6;
}

.tablewrap {
  overflow: visible;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg-card);
  box-shadow: 0 10px 32px rgba(138, 90, 53, 0.09);
  animation: riseIn 0.62s ease both;
  position: relative;
  z-index: 1;
}

.tbl {
  width: 100%;
  min-width: 880px;
  border-collapse: separate;
  border-spacing: 0;
}

.tbl th,
.tbl td {
  border-bottom: 1px solid #f1e8e1;
  padding: 12px;
}

.tbl th {
  text-align: left;
  position: sticky;
  top: calc(var(--sticky-offset) - 1px);
  z-index: 12;
  color: #2d3949;
  background: linear-gradient(180deg, #fff6ef 0%, #fffaf7 100%);
}

.tbl tbody tr:nth-child(even) { background: #fffcf9; }
.tbl tbody tr:hover { background: #fff4ea; }

.empty-row {
  text-align: center;
  color: var(--muted);
  font-weight: 600;
  padding: 18px 12px;
}

.cell {
  width: 100%;
  border: 1px solid #d7c4b7;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 15px;
  color: #2d3138;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cell:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(228, 111, 54, 0.22);
}

.cell--num { text-align: right; }
.cell--select { cursor: pointer; }

.code {
  font-weight: 700;
  color: #3d2d22;
}

.mono {
  font-family: "Fira Mono", "Consolas", "Courier New", monospace;
}

.table-toolbar :deep(.ms) {
  z-index: 100;
}

.table-toolbar :deep(.ms-dd) {
  z-index: 130;
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
}

@media (max-width: 640px) {
  .page { padding: 12px; }

  .table-head {
    align-items: stretch;
    gap: 10px;
  }

  .table-left-actions {
    width: 100%;
    flex: none;
  }

  .table-search {
    width: 100%;
  }

  .table-toolbar {
    width: 100%;
    margin: 0;
  }

  .table-hint {
    margin-left: 0;
  }

  .toolbar {
    gap: 8px;
  }

  .btn {
    flex: 1 1 145px;
    justify-content: center;
  }
}
</style>
