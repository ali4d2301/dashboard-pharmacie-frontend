<template>
  <div class="page">
    <div class="top">
      <h2>Modifier un mouvement</h2>
      <p class="hint">Saisis un code produit + une date, puis modifie la ligne voulue.</p>
    </div>

    <div class="search">
      <div class="field">
        <label>Code produit</label>
        <input v-model.trim="codeProd" placeholder="Ex: P001" />
      </div>

      <div class="field">
        <label>Date (jour du mouvement)</label>
        <input v-model="day" type="date" />
      </div>

      <button class="primary" type="button" @click="reload" :disabled="loading || !codeProd || !day">
        Rechercher
      </button>

      <button class="primary" type="button" @click="save" :disabled="loading || dirtyCount === 0">
        Enregistrer <span v-if="dirtyCount">({{ dirtyCount }})</span>
      </button>


      <span class="msg" v-if="msg">{{ msg }}</span>
    </div>

    <div v-if="rows.length" class="tableWrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date mouvement</th>
            <th>Quantité</th>
            <th>Type</th>
            <th>Mouvement</th>
            <th>Commentaire</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono">{{ r.id }}</td>

            <td>
              <input
                type="date"
                v-model="r._edit.date_mvt"
              />
            </td>

            <td>
              <input type="number" min="0" step="0.01" v-model.number="r._edit.quantite" />
            </td>

            <td>
              <select v-model="r._edit.type_mvt">
                <option value="entree">entree</option>
                <option value="sortie">sortie</option>
              </select>
            </td>

            <td>
              <select v-model="r._edit.mouvement">
                <option value="achat">achat</option>
                <option value="vente">vente</option>
                <option value="perte">perte</option>
                <option value="peremption">peremption</option>
                <option value="don">don</option>
                <option value="ajustement">ajustement</option>
              </select>
            </td>

            <td>
              <input v-model.trim="r._edit.commentaire" placeholder="..." />
            </td>

          </tr>
        </tbody>
      </table>

      <div class="count">{{ rows.length }} mouvement(s)</div>
    </div>

    <div v-else class="empty" v-if="searched && !loading">
      Aucun mouvement trouvé.
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from "vue";

const API = "http://127.0.0.1:8000";

const codeProd = ref("");   // saisi user
const day = ref("");        // YYYY-MM-DD (input type="date")

const rows = ref([]);       // mouvements trouvés (source)
const draft = ref({});      // copie editable indexée par id
const msg = ref("");
const loading = ref(false);
const searched = ref(false);

/** Charger les mouvements du produit à la date donnée */
async function reload() {
  msg.value = "";
  rows.value = [];
  draft.value = {};

  if (!codeProd.value || !day.value) return;

  loading.value = true;
  try {
    const qs = new URLSearchParams({
      code_prod: codeProd.value,
      day: day.value,
    });

    searched.value = true;

    const res = await fetch(`${API}/api/movements/edit?${qs.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      msg.value = "Erreur: " + (err.detail || res.statusText);
      return;
    }

    const data = await res.json();
    rows.value = (data || []).map(r => ({
      ...r,
      _saving: false,
      _edit: {
        date_mvt: r.date_mvt, // doit déjà être "YYYY-MM-DD"
        quantite: r.quantite,
        type_mvt: r.type_mvt,
        mouvement: r.mouvement,
        commentaire: r.commentaire ?? "",
      }
    }));


    // copie pour édition/comparaison (indexée par id)
    const d = {};
    for (const r of rows.value) {
      d[r.id] = {
        date_mvt: toDatetimeLocalValue(r.date_mvt),
        quantite: r.quantite,
        type_mvt: r.type_mvt,
        mouvement: r.mouvement,
        commentaire: r.commentaire ?? "",
      };
    }
    draft.value = d;

    if (rows.value.length === 0) msg.value = "Aucun mouvement trouvé.";
  } catch (e) {
    msg.value = "Erreur réseau/serveur.";
  } finally {
    loading.value = false;
  }
}

/** Construire les patches : uniquement champs autorisés et uniquement si changé */
function buildPatches() {
  const patches = [];

  for (const r of rows.value) {
    const after = r._edit;
    if (!after) continue;

    const patch = { id: r.id };
    let changed = false;

    if (after.date_mvt !== r.date_mvt) {
      patch.date_mvt = after.date_mvt; // "YYYY-MM-DD"
      changed = true;
    }


    if (Number(after.quantite) !== Number(r.quantite)) { patch.quantite = Number(after.quantite); changed = true; }
    if (after.type_mvt !== r.type_mvt) { patch.type_mvt = after.type_mvt; changed = true; }
    if (after.mouvement !== r.mouvement) { patch.mouvement = after.mouvement; changed = true; }
    if ((after.commentaire ?? "") !== (r.commentaire ?? "")) { patch.commentaire = after.commentaire; changed = true; }

    if (changed) patches.push(patch);
  }

  return patches;
}

const dirtyCount = computed(() => buildPatches().length);

/** Enregistrer (PUT en lot) */
async function save() {
  msg.value = "";
  const patches = buildPatches();

  if (patches.length === 0) {
    msg.value = "Aucune modification.";
    return;
  }

  const res = await fetch(`${API}/api/movements/edit`, {
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

/** Optionnel : auto-reload si tu veux (sinon tu relies au bouton Rechercher) */
// onMounted(() => {}); // je laisse vide volontairement
</script>


<style scoped>
.page { max-width: 1100px; margin: 0 auto; padding: 16px; }
.top h2 { margin: 0 0 6px; }
.hint { margin: 0 0 14px; opacity: .8; }

.search {
  display: flex; gap: 12px; align-items: end; flex-wrap: wrap;
  padding: 12px; border: 1px solid #eee; border-radius: 12px;
}
.field { display: grid; gap: 6px; }
.field input, select { padding: 8px 10px; border: 1px solid #ddd; border-radius: 10px; }
.primary { padding: 10px 14px; border-radius: 10px; border: 0; cursor: pointer; }
.msg { margin-left: 6px; font-weight: 600; }

.tableWrap { margin-top: 14px; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border-bottom: 1px solid #eee; padding: 10px; vertical-align: middle; }
.tbl input, .tbl select { width: 100%; }
.actions button { padding: 8px 10px; border-radius: 10px; border: 1px solid #ddd; cursor: pointer; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.count { margin-top: 10px; text-align: right; opacity: .75; }
.empty { margin-top: 14px; opacity: .75; }
</style>
