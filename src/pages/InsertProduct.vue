<template>
  <div class="wrap">
    <div class="container">
      <div class="top">
        <button class="back" type="button" @click="router.push('/')">Retour</button>
        <h1>FORMULAIRE D'ENREGISTREMENT DE PRODUIT PHARMACEUTIQUE</h1>
        <p class="hint">
          Veuillez renseigner les informations avec grand soin. Le num&eacute;ro de lot et la
          date de p&eacute;remption cr&eacute;eront le lot initial du produit.
        </p>
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
            <input
              v-model.trim="form.forme"
              placeholder="Ex: Comprim&eacute;, sirop ou g&eacute;lule"
              required
            />
          </div>

          <div class="field">
            <label>Dosage</label>
            <input v-model.trim="form.dosage" placeholder="Ex: 500 mg ou 60 mg/ml" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Classe th&eacute;rapeutique</label>
            <select v-model="form.classe" :class="{ 'is-placeholder': !form.classe }" required>
              <option disabled value="">Choisir...</option>
              <option
                v-for="item in therapeuticClassOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Cible prioritaire</label>
            <select v-model="form.cible" :class="{ 'is-placeholder': !form.cible }" required>
              <option disabled value="">Choisir...</option>
              <option
                v-for="item in priorityTargetOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Unit&eacute; de comptage</label>
            <input v-model.trim="form.unite" placeholder="Ex: Bo&icirc;te, plaquette ou carton" />
          </div>

          <div class="field">
            <label>Stock actuel</label>
            <input v-model.number="form.stock" type="number" min="0" step="1" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Num&eacute;ro de lot</label>
            <input v-model.trim="form.numero_lot" placeholder="Ex: LOT-2026-001" required />
          </div>

          <div class="field">
            <label>Date de p&eacute;remption</label>
            <input v-model="form.date_peremption" type="date" required />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Prix d'achat du produit (FCFA)</label>
            <input
              v-model.number="form.achat"
              type="number"
              min="0"
              step="5"
              placeholder="Ex: 1450"
              required
            />
          </div>

          <div class="field">
            <label>Prix de vente du produit (FCFA)</label>
            <input
              v-model.number="form.vente"
              type="number"
              min="0"
              step="5"
              placeholder="Ex: 1875"
            />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Statut</label>
            <select v-model="form.statut" :class="{ 'is-placeholder': !form.statut }" required>
              <option disabled value="">Choisir...</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>

          <div class="field">
            <label>Date de l'enregistrement</label>
            <input
              v-model="form.date_enregistrement"
              type="date"
              :max="getTodayDate()"
              required
            />
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" type="submit">Enregistrer</button>
        </div>
      </form>
    </div>

    <transition name="dialog-fade">
      <div
        v-if="dialog.open"
        class="dialog-backdrop"
        @click="handleBackdropClick"
      >
        <div
          class="dialog-card"
          :class="`is-${dialog.type}`"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insert-product-dialog-title"
          aria-describedby="insert-product-dialog-message"
          @click.stop
        >
          <div class="dialog-head">
            <span class="dialog-icon" aria-hidden="true">{{ dialogIcon(dialog.type) }}</span>
            <div class="dialog-copy">
              <p class="dialog-kicker">{{ dialogKicker(dialog.type) }}</p>
              <h2 id="insert-product-dialog-title" class="dialog-title">{{ dialog.title }}</h2>
            </div>
          </div>

          <p id="insert-product-dialog-message" class="dialog-message">{{ dialog.message }}</p>

          <div class="dialog-actions">
            <button
              v-if="dialog.cancelLabel"
              ref="cancelDialogButton"
              type="button"
              class="dialog-btn secondary"
              @click="closeDialog(false)"
            >
              {{ dialog.cancelLabel }}
            </button>

            <button
              ref="primaryDialogButton"
              type="button"
              class="dialog-btn primary"
              :class="`is-${dialog.type}`"
              @click="closeDialog(true)"
            >
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import api from "@/services/api";

const router = useRouter();

function getTodayDate() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

const therapeuticClassOptions = [
  { value: "Antalgique", label: "Antalgique" },
  { value: "Antibiotique", label: "Antibiotique" },
  { value: "Antipaludique", label: "Antipaludique" },
  { value: "Anti-inflammatoire", label: "Anti-inflammatoire" },
  { value: "Antihypertenseur", label: "Antihypertenseur" },
  { value: "Antidiabetique", label: "Antidiab\u00e9tique" },
  { value: "Antihistaminique", label: "Antihistaminique" },
  { value: "Antifongique", label: "Antifongique" },
  { value: "Vitamines et complements", label: "Vitamines et compl\u00e9ments" },
  { value: "Autres", label: "Autres" },
];

const priorityTargetOptions = [
  { value: "Appareil digestif", label: "Appareil digestif" },
  { value: "Systeme nerveux", label: "Syst\u00e8me nerveux" },
  { value: "Systeme respiratoire", label: "Syst\u00e8me respiratoire" },
  { value: "Systeme cardiovasculaire", label: "Syst\u00e8me cardiovasculaire" },
  { value: "Systeme endocrinien", label: "Syst\u00e8me endocrinien" },
  {
    value: "Systeme musculo-squelettique",
    label: "Syst\u00e8me musculo-squelettique",
  },
  { value: "Peau et muqueuses", label: "Peau et muqueuses" },
  { value: "Sante de la femme", label: "Sant\u00e9 de la femme" },
  { value: "Pediatrie", label: "P\u00e9diatrie" },
  { value: "Autres", label: "Autres" },
];

const form = reactive({
  code: "",
  numero_lot: "",
  nom: "",
  forme: "",
  dosage: "",
  classe: "",
  cible: "",
  unite: "",
  stock: 0,
  date_peremption: "",
  achat: 0,
  vente: 0,
  statut: "Actif",
  date_enregistrement: getTodayDate(),
});

const dialog = reactive({
  open: false,
  type: "info",
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "",
  resolver: null,
});

const primaryDialogButton = ref(null);
const cancelDialogButton = ref(null);

function openDialog({
  type = "info",
  title = "",
  message = "",
  confirmLabel = "OK",
  cancelLabel = "",
}) {
  return new Promise((resolve) => {
    dialog.open = true;
    dialog.type = type;
    dialog.title = title;
    dialog.message = message;
    dialog.confirmLabel = confirmLabel;
    dialog.cancelLabel = cancelLabel;
    dialog.resolver = resolve;
  });
}

function closeDialog(result) {
  if (!dialog.open) return;
  const resolver = dialog.resolver;
  dialog.open = false;
  dialog.type = "info";
  dialog.title = "";
  dialog.message = "";
  dialog.confirmLabel = "OK";
  dialog.cancelLabel = "";
  dialog.resolver = null;
  resolver?.(result);
}

function handleBackdropClick() {
  if (dialog.cancelLabel) {
    closeDialog(false);
  }
}

function handleDialogKeydown(event) {
  if (!dialog.open || event.key !== "Escape") return;
  closeDialog(Boolean(!dialog.cancelLabel));
}

function dialogIcon(type) {
  if (type === "success") return "\u2713";
  if (type === "error") return "!";
  if (type === "confirm") return "?";
  return "i";
}

function dialogKicker(type) {
  if (type === "success") return "Op\u00e9ration r\u00e9ussie";
  if (type === "error") return "V\u00e9rification requise";
  if (type === "confirm") return "Confirmation";
  return "Information";
}

async function submit() {
  const todayDate = getTodayDate();

  if (form.date_enregistrement && form.date_enregistrement > todayDate) {
    await openDialog({
      type: "error",
      title: "Date d'enregistrement invalide",
      message: "La date d'enregistrement ne peut pas être ultérieure à la date du jour.",
      confirmLabel: "Compris",
    });
    form.date_enregistrement = todayDate;
    return;
  }

  if (
    form.date_enregistrement &&
    form.date_peremption &&
    form.date_peremption < form.date_enregistrement
  ) {
    await openDialog({
      type: "error",
      title: "Date de p\u00e9remption invalide",
      message:
        "La date de p\u00e9remption doit \u00eatre post\u00e9rieure ou \u00e9gale \u00e0 la date d'enregistrement.",
      confirmLabel: "Compris",
    });
    return;
  }

  try {
    const payload = {
      code: form.code,
      numero_lot: form.numero_lot,
      produit: form.nom,
      forme: form.forme || null,
      dosage: form.dosage || null,
      classe: form.classe || null,
      cible: form.cible || null,
      unite: form.unite || null,
      stock_actuel: form.stock ?? null,
      date_peremption: form.date_peremption,
      prix_achat: form.achat ?? null,
      prix_vente: form.vente ?? null,
      date_creation: form.date_enregistrement || null,
      statut: form.statut || "Actif",
    };

    const confirmed = await openDialog({
      type: "confirm",
      title: "Confirmer l'enregistrement",
      message: "Voulez-vous vraiment enregistrer ce produit ?",
      confirmLabel: "Enregistrer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;

    await api.post("/api/products/insert_prod", payload);

    await openDialog({
      type: "success",
      title: "Produit enregistr\u00e9",
      message: "Produit enregistr\u00e9 dans la base de donn\u00e9es.",
      confirmLabel: "OK",
    });
    reset();
  } catch (error) {
    await openDialog({
      type: "error",
      title: "Enregistrement impossible",
      message: error?.response?.data?.detail || "Erreur lors de l'enregistrement.",
      confirmLabel: "Fermer",
    });
    console.error(error);
  }
}

function reset() {
  form.code = "";
  form.numero_lot = "";
  form.nom = "";
  form.forme = "";
  form.dosage = "";
  form.classe = "";
  form.cible = "";
  form.unite = "";
  form.stock = 0;
  form.date_peremption = "";
  form.achat = 0;
  form.vente = 0;
  form.statut = "Actif";
  form.date_enregistrement = getTodayDate();
}

watch(
  () => dialog.open,
  async (isOpen) => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (!isOpen) return;
    await nextTick();
    if (dialog.cancelLabel) {
      cancelDialogButton.value?.focus();
      return;
    }
    primaryDialogButton.value?.focus();
  }
);

onMounted(() => {
  window.addEventListener("keydown", handleDialogKeydown);
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", handleDialogKeydown);
});
</script>

<style scoped>
.wrap {
  min-height: 100vh;
  background: #fff8f3;
  font-family: Arial, sans-serif;
}

.container {
  width: min(980px, 94%);
  margin: 0 auto;
  padding: 2px 24px 30px;
  background: #fffdfb;
  border: 1px solid #f0e2d7;
  box-shadow: 0 18px 40px rgba(146, 95, 42, 0.08);
}

.top {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f4e6dc;
}

.back {
  border: none;
  background: transparent;
  color: #e46f36;
  font-weight: 800;
  cursor: pointer;
  padding: 2px 0 0;
  transition: color 0.18s ease, transform 0.18s ease;
}

.back:hover {
  color: #c85f2b;
  transform: translateX(-1px);
}

h1 {
  margin: 2px 0 4px;
  font-family: "Arial Black";
  font-size: 24px;
  line-height: 1.12;
  letter-spacing: 0.01em;
  color: rgb(138, 76, 0);
}

.hint {
  max-width: 820px;
  margin: 0;
  color: #6d6158;
  font-style: italic;
  font-size: 13px;
  line-height: 1.38;
}

.form { margin-top: 14px; display: grid; gap: 12px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: grid; gap: 6px; }

label {
  font-weight: 700;
  color: #333;
  font-size: 14px;
}

input, select, textarea {
  border: 1px solid #e3d6cc;
  border-radius: 10px;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 15px;
  color: #c00000;
  font-weight: 700;
  outline: none;
  background: #fffefa;
  box-shadow: inset 0 1px 1px rgba(108, 74, 40, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

input::placeholder,
textarea::placeholder {
  color: #666;
  font-weight: 400;
  opacity: 1;
}
select.is-placeholder {
  color: #666;
  font-weight: 400;
}

input:hover, select:hover, textarea:hover {
  border-color: #d8c4b6;
}

input:focus, select:focus, textarea:focus {
  border-color: #e46f36;
  background: #fff;
  box-shadow:
    inset 0 1px 1px rgba(108, 74, 40, 0.03),
    0 0 0 3px rgba(228, 111, 54, 0.12);
}

.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 6px; }
.btn {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #f7f7f7;
  cursor: pointer;
  font-weight: 800;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.primary {
  background: linear-gradient(135deg, #e88348 0%, #d6682a 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 10px 20px rgba(214, 104, 42, 0.18);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.dialog-card {
  position: relative;
  overflow: hidden;
  width: min(520px, 100%);
  padding: 24px 24px 20px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(248, 251, 255, 0.98) 100%);
  box-shadow:
    0 28px 60px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.dialog-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
}

.dialog-card.is-confirm::before {
  background: linear-gradient(180deg, #f59e0b 0%, #ea580c 100%);
}

.dialog-card.is-success::before {
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
}

.dialog-card.is-error::before {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.dialog-icon {
  flex: 0 0 auto;
  width: 50px;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 25px;
  font-weight: 900;
  color: #ffffff;
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  box-shadow: 0 10px 18px rgba(100, 116, 139, 0.22);
}

.dialog-card.is-confirm .dialog-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
  box-shadow: 0 10px 18px rgba(234, 88, 12, 0.24);
}

.dialog-card.is-success .dialog-icon {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 10px 18px rgba(22, 163, 74, 0.22);
}

.dialog-card.is-error .dialog-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 10px 18px rgba(220, 38, 38, 0.22);
}

.dialog-copy {
  min-width: 0;
  padding-top: 2px;
}

.dialog-kicker {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dialog-title {
  margin: 0;
  color: #0f172a;
  font-size: 23px;
  font-weight: 900;
  line-height: 1.12;
}

.dialog-message {
  margin: 18px 0 0;
  color: #334155;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.55;
}

.dialog-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-btn {
  min-width: 126px;
  padding: 12px 20px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.dialog-btn:hover {
  transform: translateY(-1px);
}

.dialog-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.9),
    0 0 0 6px rgba(59, 130, 246, 0.22);
}

.dialog-btn.secondary {
  border-color: #d8e1ec;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #475569;
  box-shadow: 0 8px 18px rgba(148, 163, 184, 0.12);
}

.dialog-btn.primary {
  color: #ffffff;
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  box-shadow: 0 10px 18px rgba(71, 85, 105, 0.18);
}

.dialog-btn.primary.is-confirm {
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
  box-shadow: 0 10px 18px rgba(234, 88, 12, 0.22);
}

.dialog-btn.primary.is-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 10px 18px rgba(22, 163, 74, 0.2);
}

.dialog-btn.primary.is-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 10px 18px rgba(220, 38, 38, 0.2);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}

.dialog-fade-enter-active .dialog-card,
.dialog-fade-leave-active .dialog-card {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-card,
.dialog-fade-leave-to .dialog-card {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}

@media (max-width: 720px) {
  .container {
    width: min(94%, 960px);
    padding: 16px 14px 24px;
  }

  .row { grid-template-columns: 1fr; }

  .dialog-card {
    padding: 18px 16px 16px;
    border-radius: 18px;
  }

  .dialog-head {
    align-items: flex-start;
  }

  .dialog-title {
    font-size: 21px;
  }

  .dialog-message {
    font-size: 15px;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-btn {
    width: 100%;
  }
}
</style>
