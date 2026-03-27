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
        <input v-model="day" type="date" :max="todayIso" />
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
            <th>Quantite</th>
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
                v-model="r._edit.date_mvt"
                type="date"
                :max="todayIso"
              />
            </td>

            <td>
              <input v-model.number="r._edit.quantite" type="number" min="0" step="0.01" />
            </td>

            <td>
              <select v-model="r._edit.type_mvt">
                <option value="entree">entree</option>
                <option value="sortie">sortie</option>
              </select>
            </td>

            <td>
              <select v-model="r._edit.mouvement">
                <option value="acquision">acquision</option>
                <option value="dispensation">dispensation</option>
                <option value="perte">perte</option>
                <option value="peremption">peremption</option>
                <option value="ajustement">ajustement</option>
                <option value="ajustement positif">ajustement positif</option>
                <option value="ajustement negatif">ajustement negatif</option>
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

    <div v-else-if="searched && !loading" class="empty">
      Aucun mouvement trouve.
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

import api from "@/services/api";

const todayIso = ref(getTodayISODate());

const codeProd = ref("");
const day = ref("");

const rows = ref([]);
const msg = ref("");
const loading = ref(false);
const searched = ref(false);

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDate(value) {
  if (!value) return false;
  return String(value).slice(0, 10) > getTodayISODate();
}

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
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

async function reload() {
  msg.value = "";
  rows.value = [];
  todayIso.value = getTodayISODate();

  if (!codeProd.value || !day.value) return;
  if (isFutureDate(day.value)) {
    msg.value = "Erreur: la date de mouvement ne peut pas etre posterieure a la date du jour.";
    return;
  }

  loading.value = true;
  searched.value = true;

  try {
    const { data } = await api.get("/api/movements/edit", {
      params: {
        code_prod: codeProd.value,
        day: day.value,
      },
    });

    rows.value = (data || []).map((row) => ({
      ...row,
      _edit: {
        date_mvt: toDateInputValue(row.date_mvt),
        quantite: row.quantite,
        type_mvt: row.type_mvt,
        mouvement: row.mouvement,
        commentaire: row.commentaire ?? "",
      },
    }));

    if (rows.value.length === 0) {
      msg.value = "Aucun mouvement trouve.";
    }
  } catch (error) {
    msg.value = `Erreur: ${getRequestErrorMessage(error, "chargement impossible.")}`;
  } finally {
    loading.value = false;
  }
}

function buildPatches() {
  const patches = [];

  for (const row of rows.value) {
    const after = row._edit;
    if (!after) continue;

    const patch = { id: row.id };
    let changed = false;

    if (after.date_mvt !== toDateInputValue(row.date_mvt)) {
      patch.date_mvt = after.date_mvt;
      changed = true;
    }

    if (Number(after.quantite) !== Number(row.quantite)) {
      patch.quantite = Number(after.quantite);
      changed = true;
    }
    if (after.type_mvt !== row.type_mvt) {
      patch.type_mvt = after.type_mvt;
      changed = true;
    }
    if (after.mouvement !== row.mouvement) {
      patch.mouvement = after.mouvement;
      changed = true;
    }
    if ((after.commentaire ?? "") !== (row.commentaire ?? "")) {
      patch.commentaire = after.commentaire;
      changed = true;
    }

    if (changed) {
      patches.push(patch);
    }
  }

  return patches;
}

const dirtyCount = computed(() => buildPatches().length);

async function save() {
  msg.value = "";
  todayIso.value = getTodayISODate();
  const patches = buildPatches();

  if (patches.length === 0) {
    msg.value = "Aucune modification.";
    return;
  }

  const hasFutureDate = patches.some((patch) => isFutureDate(patch.date_mvt));
  if (hasFutureDate) {
    msg.value = "Erreur: la date de mouvement ne peut pas etre posterieure a la date du jour.";
    return;
  }

  try {
    const { data } = await api.put("/api/movements/edit", patches);
    msg.value = `OK: ${data.updated} ligne(s) mise(s) a jour.`;
    await reload();
  } catch (error) {
    msg.value = `Erreur: ${getRequestErrorMessage(error, "sauvegarde impossible.")}`;
  }
}

onMounted(() => {
  todayIso.value = getTodayISODate();
});
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
