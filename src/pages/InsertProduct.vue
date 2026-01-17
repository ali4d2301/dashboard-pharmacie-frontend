<template>
  <div class="wrap">
    <div class="container">
      <div class="top">
        <button class="back" type="button" @click="router.push('/')">← Retour</button>
        <h1>FORMULAIRE D'ENREGISTREMENT DE PRODUIT PHARMACEUTIQUE</h1>
        <p class="hint">Veuillez renseigner les information avec grand soin</p>
      </div>

      <form class="form" @submit.prevent="submit">

        <div class="row">
          <div class="field">
            <label>Code du produit</label>
            <input v-model.trim="form.code" required />
          </div>

          <div class="field">
            <label>Nom du produit</label>
            <input v-model.trim="form.nom" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Forme</label>
            <input v-model.trim="form.forme" placeholder="Ex: Comprimé, sirop ou gélule" required />
          </div>

          <div class="field">
            <label>Dosage</label>
            <input v-model.trim="form.dosage" placeholder="Ex: 500 mg ou 60 mg/ml" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Classe thérapeutique</label>
            <input v-model.trim="form.classe" placeholder="Ex: Anatalgique, antibiotique ou antipaludique" />
          </div>

          <div class="field">
            <label>Cible prioritaire</label>
            <input v-model.trim="form.cible" placeholder="Ex: Appareil digestif ou système nerveux"/>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Unite de comptage</label>
            <input v-model.trim="form.unite" placeholder="Ex: Boîte, Plaquette ou Carton" />
          </div>

          <div class="field">
            <label>Stock actuel</label>
            <input v-model.number="form.stock" type="number" min="0" step="1"/>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Prix d'achat du produit (FCFA)</label>
            <input v-model.number="form.achat" type="number" min="0" step="5" placeholder="Ex: 1450" />
          </div>

          <div class="field">
            <label>Prix de vente du produit (FCFA)</label>
            <input v-model.number="form.vente" type="number" min="0" step="5" placeholder="Ex: 1875" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Statut</label>
            <select v-model="form.statut" required>
              <option disabled value="">Choisir…</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>

          <div class="field">
            <label>Date de l'enregistrement</label>
            <input v-model="form.date_enregistrement" type="date" required />
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
  code: "",
  nom: "",
  forme: "",
  dosage: "",
  classe: "",
  cible: "",
  unite: "",
  stock: 0,
  achat: 0,
  vente: 0,
  statut:"",
  date_enregistrement:"",
  commentaire: "",
})

import axios from "axios";

async function submit() {
  try {
    const payload = {
      code: form.code,
      produit: form.nom, // mapping vers la colonne SQL "produit"
      forme: form.forme || null,
      dosage: form.dosage || null,
      classe: form.classe || null,
      cible: form.cible || null,
      unite: form.unite || null,
      stock_actuel: form.stock || null,
      prix_achat: form.achat ?? null,
      prix_vente: form.vente ?? null,
      date_creation: form.date_enregistrement || null, // "YYYY-MM-DD"
      statut: form.statut || "Actif",
      // commentaire: form.commentaire  // ⚠️ ta table ne l'a pas (voir note)
    };

    await axios.post("http://localhost:8000/api/products/insert_prod", payload);

    alert("✅ Enregistré dans MySQL !");
    reset();
  } catch (e) {
    alert(e?.response?.data?.detail || "❌ Erreur lors de l'enregistrement.");
    console.error(e);
  }
}


function reset() {
  form.code = "",
  form.nom = "",
  form.forme = "",
  form.dosage =  "",
  form.classe = "",
  form.cible =  "",
  form.unite =  "",
  form.stock =  0,
  form.achat =  0,
  form.vente =  0,
  form.statut = "",
  form.date_enregistrement = "",
  form.commentaire = ""
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
    font-size: 24px;      /* Contrôle la taille (en px, em, ou rem) */
    color: rgb(138, 76, 0);     /* Contrôle la couleur (nom, hexadécimal, ou RGB) */
}

.hint { margin: 0; color: #666; font-style: italic; }

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
