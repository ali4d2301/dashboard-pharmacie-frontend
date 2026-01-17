<template>
  <div class="page">
    <h2>Produits (édition)</h2>

    <div class="toolbar">
      <button @click="reload">Recharger</button>
      <button class="primary" @click="save">Enregistrer</button>
      <span class="msg" v-if="msg">{{ msg }}</span>
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
          <tr v-for="p in products" :key="p.code">
            <td class="mono">{{ p.code }}</td>

            <td>
              <input v-model="draft[p.code].produit" class="cell" />
            </td>

            <td>
              <input v-model="draft[p.code].unite" class="cell" />
            </td>

            <td>
              <input type="number" step="5" v-model.number="draft[p.code].prix_achat" class="cell" />
            </td>

            <td>
              <input type="number" step="5" v-model.number="draft[p.code].prix_vente" class="cell" />
            </td>

            <td>
              <select v-model="draft[p.code].statut" class="cell">
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
import { onMounted, ref } from "vue";

const API = "http://127.0.0.1:8000";
const products = ref([]);
const draft = ref({});
const msg = ref("");

async function reload() {
  msg.value = "";
  const res = await fetch(`${API}/api/products/edit_products`);
  products.value = await res.json();

  // copie pour édition/comparaison
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

  const res = await fetch(`${API}/api/products/edit_products`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patches),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    msg.value = "Erreur: " + (err.detail || res.statusText);
    return;
  }

  const out = await res.json();
  msg.value = `✅ ${out.updated} ligne(s) mise(s) à jour.`;
  await reload();
}

onMounted(reload);
</script>

<style scoped>
.page { padding: 16px; max-width: 1100px; margin: 0 auto; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.primary { font-weight: 600; padding: 8px 12px; }
.msg { opacity: 0.85; }
.tablewrap { overflow: auto; border: 1px solid #ddd; border-radius: 10px; }
.tbl { width: 100%; border-collapse: collapse; min-width: 800px; }
.tbl th, .tbl td { border-bottom: 1px solid #eee; padding: 10px; }
.tbl th { text-align: left; position: sticky; top: 0; background: #fafafa; }
.cell { width: 100%; padding: 7px 8px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>
