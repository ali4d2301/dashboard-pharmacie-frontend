<template>
  <div class="wrap">
    <div class="container">
      <div class="top">
        <button class="back" type="button" @click="router.push('/')">← Retour</button>
        <h1>{{ title }}</h1>
        <p class="hint">Formulaire de base (évolutif)</p>
      </div>

      <form class="form" @submit.prevent="submit">
        <div class="row">
          <div class="field">
            <label>Nom</label>
            <input v-model.trim="form.nom" placeholder="Ex: Diakité" required />
          </div>

          <div class="field">
            <label>Prénom</label>
            <input v-model.trim="form.prenom" placeholder="Ex: Ali" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Sexe</label>
            <select v-model="form.sexe" required>
              <option disabled value="">Choisir…</option>
              <option value="H">Homme</option>
              <option value="F">Femme</option>
              <option value="A">Autre</option>
            </select>
          </div>

          <div class="field">
            <label>Date de naissance</label>
            <input v-model="form.date_naissance" type="date" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Nombre d’enfants</label>
            <input v-model.number="form.nb_enfants" type="number" min="0" step="1" />
          </div>

          <div class="field">
            <label>Salaire (FCFA)</label>
            <input v-model.number="form.salaire" type="number" min="0" step="1000" placeholder="Ex: 250000" />
          </div>
        </div>

        <div class="row">
          <div class="field full">
            <label>Commentaire</label>
            <textarea v-model.trim="form.commentaire" rows="4" placeholder="Optionnel…"></textarea>
          </div>
        </div>

        <div class="actions">
          <button class="btn" type="button" @click="reset">Réinitialiser</button>
          <button class="btn primary" type="submit">Enregistrer</button>
        </div>

        <!-- Aperçu en bas (pratique pour comprendre) -->
        <pre class="preview">{{ form }}</pre>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from "vue"
import { useRouter } from "vue-router"

defineProps({
  title: { type: String, default: "Formulaire" },
})

const router = useRouter()

const form = reactive({
  nom: "",
  prenom: "",
  sexe: "",
  date_naissance: "",
  nb_enfants: 0,
  salaire: 0,
  commentaire: "",
})

function submit() {
  // Pour l’instant on ne fait que montrer ce qui serait envoyé
  alert("✅ Données enregistrées (démo). Regarde l’aperçu en bas.")
  console.log("FORM DATA:", JSON.parse(JSON.stringify(form)))
}

function reset() {
  form.nom = ""
  form.prenom = ""
  form.sexe = ""
  form.date_naissance = ""
  form.nb_enfants = 0
  form.salaire = 0
  form.commentaire = ""
}
</script>   

<style scoped>
.wrap { min-height: 100vh; background: #fff; font-family: Arial, sans-serif; }
.container { width: min(900px, 92%); margin: 0 auto; padding: 22px 0 40px; }

.top { margin-bottom: 16px; }
.back { border: none; background: transparent; color: #e46f36; font-weight: 800; cursor: pointer; padding: 6px 0; }
h1 { margin: 6px 0 6px; }
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
}
input:focus, select:focus, textarea:focus { border-color: #e46f36; }

.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #f7f7f7;
  cursor: pointer;
  font-weight: 800;
}
.btn.primary { background: #e46f36; color: #fff; border-color: transparent; }

.preview {
  margin-top: 10px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 10px;
  font-size: 13px;
  overflow: auto;
}

@media (max-width: 720px) {
  .row { grid-template-columns: 1fr; }
}
</style>
