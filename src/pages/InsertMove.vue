<template>
  <div class="wrap">
    <div class="container">
      <div class="top">
        <button class="back" type="button" @click="router.push('/')">← Retour</button>
        <h1>ENREGISTREMENT DE MOUVEMENT</h1>
        <p class="hint">Saisir le code produit puis compléter les champs requis</p>
      </div>

      <form class="form" @submit.prevent="submit">

        <!-- Ligne 1 -->
        <div class="row">
          <div class="field">
            <label>Date du mouvement</label>
            <input v-model="form.date_mvt" type="date" required />
          </div>

          <div class="field">
            <label>Code du produit</label>
            <input
              v-model.trim="form.code_prod"
              placeholder="Ex: P001"
              @blur="loadProduct"
              required
            />
            <small v-if="loadingProd" class="mini">Chargement…</small>
          </div>
        </div>

        <!-- Ligne 2 (auto) -->
        <div class="row">
          <div class="field">
            <label>Nom du produit</label>
            <input :value="prod.produit || ''" readonly />
          </div>

          <div class="field">
            <label>Forme</label>
            <input :value="prod.forme || ''" readonly />
          </div>
        </div>

        <!-- Ligne 3 (auto) -->
        <div class="row">
          <div class="field">
            <label>Dosage</label>
            <input :value="prod.dosage || ''" readonly />
          </div>

          <div class="field">
            <label>Unité</label>
            <input :value="prod.unite || ''" readonly />
          </div>
        </div>

        <!-- Ligne 4 (quantité + stock auto) -->
        <div class="row">
          <div class="field">
            <label>Quantité</label>
            <input v-model.number="form.quantite" type="number" min="1" step="1" required />
          </div>

          <div class="field">
            <label>Stock actuel</label>
            <input :value="prod.stock_actuel ?? ''" readonly />
          </div>
        </div>

        <!-- Ligne 5 -->
        <div class="row">
          <div class="field">
            <label>Type de mouvement</label>
            <select v-model="form.type_mvt" required>
              <option disabled value="">Choisir…</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
          </div>

          <div class="field">
            <label>Mouvement</label>
            <select v-model="form.mouvement" required>
              <option disabled value="">Choisir…</option>
              <option v-for="m in mouvements" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </div>

        <!-- Commentaire en grand -->
        <div class="row">
          <div class="field full">
            <label>Commentaire (optionnel)</label>
            <textarea v-model.trim="form.commentaire" rows="4" placeholder="Optionnel…"></textarea>
          </div>
        </div>

        <div class="actions">
          <button class="btn" type="button" @click="reset">Réinitialiser</button>
          <button class="btn primary" type="submit" :disabled="saving || !canSubmit">
            {{ saving ? "Enregistrement…" : "Enregistrer" }}
          </button>

          <span v-if="msg" class="msg" :class="{ err: msgType==='err', ok: msgType==='ok' }">
            {{ msg }}
          </span>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from "vue"
import { useRouter } from "vue-router"
import axios from "axios"

const router = useRouter()
const API = "http://localhost:8000/api"

const mouvements = ["achat", "vente", "perte", "peremption", "don", "ajustement positi", "ajustement negatif"]

const form = reactive({
  date_mvt: "",
  code_prod: "",
  type_mvt: "",
  mouvement: "",
  quantite: 1,
  commentaire: "",
})

const prod = reactive({
  code: "",
  produit: "",
  forme: "",
  dosage: "",
  unite: "",
  stock_actuel: null,
  statut: "",
})

const loadingProd = ref(false)
const saving = ref(false)
const msg = ref("")
const msgType = ref("ok")

function clearProd() {
  prod.code = ""
  prod.produit = ""
  prod.forme = ""
  prod.dosage = ""
  prod.unite = ""
  prod.stock_actuel = null
  prod.statut = ""
}

async function loadProduct() {
  msg.value = ""
  if (!form.code_prod) {
    clearProd()
    return
  }

  loadingProd.value = true
  try {
    const r = await axios.get(`${API}/products/${encodeURIComponent(form.code_prod)}`)
    Object.assign(prod, r.data)

    msgType.value = "ok"
    msg.value = "Produit chargé ✅"
  } catch (e) {
    clearProd()
    msgType.value = "err"
    msg.value = e?.response?.data?.detail || "Produit introuvable / inactif"
  } finally {
    loadingProd.value = false
  }
}

const canSubmit = computed(() => {
  return (
    !!form.date_mvt &&
    !!form.code_prod &&
    !!form.type_mvt &&
    !!form.mouvement &&
    form.quantite >= 1 &&
    prod.statut === "Actif"
  )
})

async function submit() {
  msg.value = ""
  if (prod.statut !== "Actif") {
    msgType.value = "err"
    msg.value = "Produit inactif : impossible d’enregistrer un mouvement."
    return
  }

  saving.value = true
  try {
    const payload = {
      date_mvt: form.date_mvt,
      code_prod: form.code_prod,
      type_mvt: form.type_mvt,
      mouvement: form.mouvement,
      quantite: form.quantite,
      commentaire: form.commentaire || null,
    }

    await axios.post(`${API}/mouvements`, payload)

    msgType.value = "ok"
    msg.value = "Mouvement enregistré ✅"

    // reset partiel (on garde le produit chargé)
    form.type_mvt = ""
    form.mouvement = ""
    form.quantite = 1
    form.commentaire = ""
  } catch (e) {
    msgType.value = "err"
    msg.value = e?.response?.data?.detail || "Erreur lors de l’enregistrement."
    console.error(e)
  } finally {
    saving.value = false
  }
}

function reset() {
  form.date_mvt = ""
  form.code_prod = ""
  form.type_mvt = ""
  form.mouvement = ""
  form.quantite = 1
  form.commentaire = ""
  clearProd()
  msg.value = ""
}
</script>

<style scoped>
.wrap { min-height: 100vh; background: #fff; font-family: Arial, sans-serif; }
.container { width: min(900px, 92%); margin: 0 auto; padding: 22px 0 40px; }

.top { margin-bottom: 16px; }
.back { border: none; background: transparent; color: #e46f36; font-weight: 800; cursor: pointer; padding: 6px 0; }

h1 {
  margin: 6px 0 6px;
  font-family: "Arial Black";
  font-size: 30px;
  color: #000;
}

.hint { margin: 0; color: #666; }

.form { margin-top: 14px; display: grid; gap: 14px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: grid; gap: 6px; }
.field.full { grid-column: 1 / -1; }

label { font-weight: 700; color: #333; }

input, select, textarea {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
}

input, select { height: 46px; }         /* ✅ taille identique */
textarea { min-height: 120px; }         /* ✅ commentaire bien grand */

input[readonly] { background: #f6f6f6; }

input:focus, select:focus, textarea:focus { border-color: #e46f36; }

.actions { display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 8px; }

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #f7f7f7;
  cursor: pointer;
  font-weight: 800;
}
.btn.primary { background: #e46f36; color: #fff; border-color: transparent; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

.mini { color: #666; font-size: 12px; }

.msg { font-weight: 800; margin-left: 6px; }
.msg.ok { color: #1a7f37; }
.msg.err { color: #b42318; }

@media (max-width: 720px) {
  .row { grid-template-columns: 1fr; }
}
</style>
