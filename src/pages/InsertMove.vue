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
            <input :class="{ 'accent-entry': !!form.date_mvt }" v-model="form.date_mvt" type="date" required />
          </div>

          <div class="field">
            <label>Code du produit</label>
            <input
              class="code-prod-input"
              v-model.trim="form.code_prod"
              placeholder="Ex: P001"
              @keydown.enter.prevent="loadProduct"
              @keydown.tab="loadProduct"
              required
            />
            <small v-if="loadingProd" class="mini">Chargement…</small>
            <small v-else-if="codeError" class="mini err">{{ codeError }}</small>
          </div>
        </div>

        <!-- Ligne 2 (auto) -->
        <div class="row">
          <div class="field">
            <label>Nom du produit</label>
            <input :value="prod.produit || ''" disabled />
          </div>

          <div class="field">
            <label>Forme</label>
            <input :value="prod.forme || ''" disabled />
          </div>
        </div>

        <!-- Ligne 3 (auto) -->
        <div class="row">
          <div class="field">
            <label>Dosage</label>
            <input :value="prod.dosage || ''" disabled />
          </div>

          <div class="field">
            <label>Unité</label>
            <input :value="prod.unite || ''" disabled />
          </div>
        </div>

        <!-- Ligne 4 (quantité + stock auto) -->
        <div class="row">
          <div class="field">
            <label>Quantité</label>
            <input
              :class="{ 'accent-entry': form.quantite !== null && form.quantite !== '' }"
              v-model.number="form.quantite"
              type="number"
              min="1"
              :max="maxQuantite !== null ? maxQuantite : null"
              step="1"
              @input="clampQuantite"
              @blur="clampQuantite"
              required
            />
          </div>

          <div class="field">
            <label>Stock actuel</label>
            <input :value="prod.stock_actuel ?? ''" disabled />
          </div>
        </div>

        <!-- Ligne 5 -->
        <div class="row">
          <div class="field">
            <label>Type de mouvement</label>
            <select :class="{ 'accent-entry': !!form.type_mvt }" v-model="form.type_mvt" required>
              <option disabled value="">Choisir…</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
          </div>

          <div class="field">
            <label>Mouvement</label>
            <select :class="{ 'accent-entry': !!form.mouvement }" v-model="form.mouvement" :disabled="!form.type_mvt" required>
              <option disabled value="">Choisir…</option>
              <option v-for="m in mouvementsDisponibles" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </div>

        <!-- Commentaire en grand -->
        <div class="row">
          <div class="field full">
            <label>Commentaire (optionnel)</label>
            <textarea v-model.trim="form.commentaire" rows="1" placeholder="Optionnel…"></textarea>
          </div>
        </div>

        <div class="actions">
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
import { reactive, ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
//import axios from "axios"
import api from "@/services/api";

const router = useRouter()
//const API = "http://localhost:8000/api"

const mvts_positif = ["achat", "don", "ajustement positif"]
const mvts_negatif = ["vente", "perte", "peremption", "ajustement negatif"]

const form = reactive({
  date_mvt: "",
  code_prod: "",
  type_mvt: "",
  mouvement: "",
  quantite: 1,
  commentaire: "",
})

const mouvementsDisponibles = computed(() => {
  if (form.type_mvt === "entree") return mvts_positif
  if (form.type_mvt === "sortie") return mvts_negatif
  return []
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
const codeError = ref("")

watch(
  () => form.type_mvt,
  () => {
    form.mouvement = ""
  }
)
const maxQuantite = computed(() => {
  const stock = Number(prod.stock_actuel)
  return Number.isFinite(stock) && stock >= 0 ? stock : null
})

function clampQuantite() {
  if (form.quantite === null || form.quantite === "") return
  let q = Number(form.quantite)
  if (!Number.isFinite(q)) {
    form.quantite = 1
    return
  }
  q = Math.floor(q)
  if (q < 1) q = 1
  if (maxQuantite.value !== null && q > maxQuantite.value) q = maxQuantite.value
  form.quantite = q
}

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
  codeError.value = ""
  if (!form.code_prod) {
    clearProd()
    return
  }

  loadingProd.value = true
  try {
    const r = await api.get(`/api/products/${encodeURIComponent(form.code_prod)}`)
    Object.assign(prod, r.data)
    clampQuantite()

    msgType.value = "ok"
    msg.value = "Produit chargé ✅"
  } catch (e) {
    clearProd()
    if (e?.response?.status === 404) {
      codeError.value = "Produit introuvable"
    } else {
      msgType.value = "err"
      msg.value = e?.response?.data?.detail || "Produit introuvable / inactif"
    }
  } finally {
    loadingProd.value = false
  }
}

const canSubmit = computed(() => {
  const quantiteOk =
    form.quantite >= 1 &&
    (maxQuantite.value === null || form.quantite <= maxQuantite.value)

  return (
    !!form.date_mvt &&
    !!form.code_prod &&
    !!form.type_mvt &&
    !!form.mouvement &&
    quantiteOk &&
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
  if (maxQuantite.value !== null && form.quantite > maxQuantite.value) {
    msgType.value = "err"
    msg.value = "La quantité ne peut pas dépasser le stock actuel."
    return
  }
  const confirmed = window.confirm(
    "Confirmation stricte : verifiez attentivement toutes les informations saisies avant enregistrement definitif.\n\nCliquez sur OK pour confirmer, ou Annuler pour revenir au formulaire."
  )
  if (!confirmed) {
    msgType.value = "err"
    msg.value = "Enregistrement annule : verification requise."
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

    await api.post("/api/mouvements", payload)

    msgType.value = "ok"
    msg.value = "Mouvement enregistré ✅"

    // reset partiel (on garde le produit chargé)
    form.date_mvt = ""
    form.code_prod = ""
    form.type_mvt = ""
    form.mouvement = ""
    form.quantite = 1
    form.commentaire = ""
    codeError.value = ""
    clearProd()
  } catch (e) {
    msgType.value = "err"
    msg.value = e?.response?.data?.detail || "Erreur lors de l’enregistrement."
    console.error(e)
  } finally {
    saving.value = false
  }
}

</script>

<style scoped>
.wrap {
  min-height: 100dvh;
  padding: 8px 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(228, 111, 54, 0.14), transparent 36%),
    radial-gradient(circle at 88% 10%, rgba(180, 35, 24, 0.08), transparent 34%),
    linear-gradient(180deg, #fbfaf8 0%, #f4f4f6 100%);
  font-family: Arial, sans-serif;
}
.container {
  width: min(1080px, 96%);
  margin: 0 auto;
  padding: 12px 14px 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #eadfd8;
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(32, 22, 15, 0.08);
}

.top { margin-bottom: 8px; display: grid; gap: 2px; }
.back {
  border: none;
  background: transparent;
  color: #e46f36;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  width: max-content;
  font-size: 14px;
  transition: color .15s ease, transform .15s ease;
}
.back:hover { color: #c95a24; transform: translateX(-1px); }

h1 {
  margin: 0 0 6px;
  font-family: "Arial Black";
  font-size: clamp(25px, 2.5vw, 30px);
  line-height: 1.02;
  letter-spacing: .3px;
  color: #000;
}

.hint { margin: 0; color: #666; font-style: italic; font-size: 14px; }

.form { margin-top: 8px; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 4px; }
.field.full { grid-column: 1 / -1; }

.code-prod-input {
  color: #b42318;
  font-family: "Arial Black", Arial, sans-serif;
  font-weight: 800;
}

.code-prod-input::placeholder {
  color: #777;
  font-family: Arial, sans-serif;
  font-weight: 400;
}

.accent-entry {
  color: #b42318;
  font-family: "Arial Black", Arial, sans-serif;
  font-weight: 800;
}

label { font-weight: 700; color: #333; font-size: 13px; }

input, select, textarea {
  border: 1px solid #d9dbe2;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  background: #fff;
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
}

input, select { height: 40px; }         /* format compact */
textarea { min-height: 70px; resize: vertical; } /* zone commentaire compacte */

input[disabled] {
  background: linear-gradient(180deg, #fafafb 0%, #f2f3f6 100%);
  border-color: #e3e5ea;
  color: #b42318;
  font-weight: 700;
  opacity: 1;
  cursor: default;
}

select:disabled {
  background: #f2f3f6;
  color: #8a8f99;
  cursor: not-allowed;
}

input:focus, select:focus, textarea:focus {
  border-color: #e46f36;
  box-shadow: 0 0 0 3px rgba(228, 111, 54, 0.12);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 4px;
  flex-wrap: wrap;
}

.btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-weight: 800;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.04);
  transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn.primary {
  background: linear-gradient(180deg, #eea276 0%, #e46f36 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(228, 111, 54, 0.25);
}
.btn:disabled { opacity: .6; cursor: not-allowed; }

.mini { color: #666; font-size: 11px; font-weight: 700; line-height: 1.1; }
.mini.err { color: #b42318; }

.msg {
  font-weight: 800;
  margin-left: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f5f6f8;
}
.msg.ok { color: #1a7f37; }
.msg.err { color: #b42318; }

@media (max-width: 720px) {
  .wrap { padding: 4px 0; }
  .container { width: min(96%, 96%); padding: 10px; border-radius: 14px; }
  .top { margin-bottom: 6px; }
  h1 { font-size: 22px; }
  .hint { font-size: 13px; }
  .form { gap: 8px; }
  .row { grid-template-columns: 1fr; }
  input, select { height: 38px; }
  textarea { min-height: 64px; }
  .actions { justify-content: stretch; }
  .btn.primary { width: 100%; }
  .msg { width: 100%; margin-left: 0; }
}
</style>
