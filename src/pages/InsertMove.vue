<template>
  <div class="wrap">
    <div class="container">
      <div v-if="!hasSelectedType" class="top top--choice">
        <button class="back" type="button" @click="goBack">Retour</button>
      </div>

      <section v-if="!hasSelectedType" class="chooser-screen">
        <div class="chooser-screen__glow chooser-screen__glow--left"></div>
        <div class="chooser-screen__glow chooser-screen__glow--right"></div>

        <div class="chooser-hero">
          <p class="chooser-kicker">Enregistrement de mouvement</p>
          <h1 class="chooser-question">Quel type de mouvement voulez-vous enregistrer&nbsp;?</h1>
          <p class="chooser-copy">Choisissez simplement l'une des deux r&eacute;ponses pour ouvrir le formulaire adapt&eacute;.</p>
        </div>

        <div class="chooser-actions">
          <button class="choice-answer choice-answer--entry" type="button" @click="selectMovementType('entree')">
            <span class="choice-answer__mark">+</span>
            <strong>Entr&eacute;e</strong>
            <span class="choice-answer__text">Ajouter du stock sur un lot existant ou cr&eacute;er un nouveau lot.</span>
          </button>

          <button class="choice-answer choice-answer--exit" type="button" @click="selectMovementType('sortie')">
            <span class="choice-answer__mark">-</span>
            <strong>Sortie</strong>
            <span class="choice-answer__text">D&eacute;biter un lot existant en respectant le stock disponible.</span>
          </button>
        </div>
      </section>

      <form v-else class="form" @submit.prevent="submit">
        <div class="top">
          <button class="back" type="button" @click="goBack">Retour</button>
          <h1>{{ pageTitle }}</h1>
          <p class="hint">{{ pageHint }}</p>
          <p v-if="msg" class="top-status" :class="{ 'is-error': msgType === 'err' }">{{ msg }}</p>
        </div>

        <section class="mode-banner">
          <div>
            <p class="mode-banner__label">Type choisi</p>
            <strong>{{ selectedTypeLabel }}</strong>
          </div>
          <button class="btn secondary" type="button" @click="resetMovementType">
            Changer de type
          </button>
        </section>

        <div class="row">
          <div class="field">
            <label>Date du mouvement</label>
            <input class="date-input" v-model="form.date_mvt" type="date" :max="todayIso" required />
          </div>

          <div class="field">
            <label>Nom du produit</label>
            <SingleSelectFilter
              class="code-select"
              :model-value="selectedProductName"
              :options="productNameOptions"
              :placeholder="productInputPlaceholder"
              :disabled="!canLoadProduct || loadingProductOptions"
              @update:model-value="setSelectedProduct"
            />
            <small v-if="loadingProductOptions" class="mini">Chargement des produits...</small>
            <small v-else-if="loadingProd" class="mini">Chargement...</small>
            <small v-else-if="codeError" class="mini err">{{ codeError }}</small>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Code du produit</label>
            <input :value="prod.code || form.code_prod || ''" disabled />
          </div>

          <div class="field">
            <label>Forme</label>
            <input :value="prod.forme || ''" disabled />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Dosage</label>
            <input :value="prod.dosage || ''" disabled />
          </div>

          <div class="field">
            <label>Unit&eacute;</label>
            <input :value="prod.unite || ''" disabled />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Stock total produit</label>
            <input :value="prod.stock_actuel ?? ''" disabled />
          </div>

          <div class="field">
            <label>Lots disponibles</label>
            <input :value="availableLotsCount" disabled />
          </div>
        </div>

        <section class="lot-section" v-if="isEntry">
          <div class="row">
            <div class="field">
              <label>R&egrave;gle d'entr&eacute;e</label>
              <input class="entry-rule" value="Entrer dans un lot existant ou cr&eacute;er un nouveau lot" disabled />
            </div>

            <div class="field">
              <label>Mode lot</label>
              <select v-model="form.lot_mode" class="control" :disabled="!prod.code">
                <option value="existing">Lot existant</option>
                <option value="new">Nouveau lot</option>
              </select>
            </div>
          </div>

          <div class="row" v-if="form.lot_mode === 'existing'">
            <div class="field full">
              <label>Lot &agrave; alimenter</label>
              <select v-model="form.lot_id" :disabled="lotOptions.length === 0 || !prod.code" required>
                <option disabled value="">Choisir un lot...</option>
                <option v-for="lot in lotOptions" :key="lot.id" :value="String(lot.id)">
                  {{ formatLotOption(lot) }}
                </option>
              </select>
              <small v-if="entryLotHelpText" class="mini">
                {{ entryLotHelpText }}
              </small>
            </div>
          </div>

          <div class="row" v-else>
            <div class="field">
              <label>Num&eacute;ro de lot</label>
              <input v-model.trim="form.numero_lot" :disabled="!prod.code" placeholder="Ex: LOT-P001-2026-B" required />
            </div>

            <div class="field">
              <label>Date de p&eacute;remption</label>
              <input class="date-input" v-model="form.date_peremption" :disabled="!prod.code" type="date" required />
            </div>
          </div>
        </section>

        <div class="row" v-if="isEntry">
          <div class="field">
            <label>{{ movementLabel }}</label>
            <select :class="{ 'accent-entry': !!form.mouvement }" v-model="form.mouvement" :disabled="!prod.code" required>
              <option disabled value="">{{ movementPlaceholder }}</option>
              <option v-for="m in mouvementsDisponibles" :key="m" :value="m">{{ formatMovementLabel(m) }}</option>
            </select>
          </div>

          <div class="field">
            <label>{{ quantityLabel }}</label>
            <input
              :class="{ 'accent-entry': form.quantite !== null && form.quantite !== '' }"
              v-model.number="form.quantite"
              :disabled="!prod.code"
              type="number"
              min="1"
              :max="maxQuantite !== null ? maxQuantite : null"
              step="1"
              @input="clampQuantite"
              @blur="clampQuantite"
              required
            />
          </div>
        </div>

        <section class="lot-section" v-else>
          <div class="row">
            <div class="field full">
              <label>Lot &agrave; sortir</label>
              <select v-model="form.lot_id" :disabled="lotOptions.length === 0 || !prod.code" required>
                <option disabled value="">Choisir un lot...</option>
                <option v-for="lot in lotOptions" :key="lot.id" :value="String(lot.id)">
                  {{ formatLotOption(lot) }}
                </option>
              </select>
              <small v-if="exitLotHelpText" class="mini err">
                {{ exitLotHelpText }}
              </small>
            </div>
          </div>
        </section>

        <div class="row" v-if="isExit">
          <div class="field">
            <label>{{ movementLabel }}</label>
            <select :class="{ 'accent-entry': !!form.mouvement }" v-model="form.mouvement" :disabled="!prod.code" required>
              <option disabled value="">{{ movementPlaceholder }}</option>
              <option v-for="m in mouvementsDisponibles" :key="m" :value="m">{{ formatMovementLabel(m) }}</option>
            </select>
          </div>

          <div class="field">
            <label>{{ quantityLabel }}</label>
            <input
              :class="{ 'accent-entry': form.quantite !== null && form.quantite !== '' }"
              v-model.number="form.quantite"
              :disabled="!prod.code"
              type="number"
              min="1"
              :max="maxQuantite !== null ? maxQuantite : null"
              step="1"
              @input="clampQuantite"
              @blur="clampQuantite"
              required
            />
            <small v-if="selectedLot && isExit" class="mini">
              Stock lot: {{ fmtInt(selectedLot.stock_lot) }}
            </small>
          </div>
        </div>

        <div class="row">
          <div class="field full">
            <label>Commentaire (optionnel)</label>
            <textarea v-model.trim="form.commentaire" rows="1" placeholder="Optionnel..."></textarea>
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" type="submit" :disabled="saving || !canSubmit">
            {{ saving ? "Enregistrement..." : submitLabel }}
          </button>
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
          aria-labelledby="insert-move-dialog-title"
          aria-describedby="insert-move-dialog-message"
          @click.stop
        >
          <div class="dialog-head">
            <span class="dialog-icon" aria-hidden="true">{{ dialogIcon(dialog.type) }}</span>
            <div class="dialog-copy">
              <p class="dialog-kicker">{{ dialogKicker(dialog.type) }}</p>
              <h2 id="insert-move-dialog-title" class="dialog-title">{{ dialog.title }}</h2>
            </div>
          </div>

          <p id="insert-move-dialog-message" class="dialog-message">{{ dialog.message }}</p>

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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import SingleSelectFilter from "@/components/SingleSelectFilter.vue";
import api from "@/services/api";
import { getDefaultRouteForRole } from "@/utils/auth";

const router = useRouter();

function goBack() {
  router.push(getDefaultRouteForRole());
}

const mvtsPositif = ["acquision", "ajustement positif"];
const mvtsNegatif = ["dispensation", "perte", "peremption", "ajustement negatif"];
const MOVEMENT_LABELS = {
  acquision: "Acquision",
  achat: "Acquision",
  don: "Acquision",
  "ajustement positif": "Ajustement positif",
  dispensation: "Dispensation",
  vente: "Dispensation",
  perte: "Perte",
  peremption: "P\u00e9remption",
  "ajustement negatif": "Ajustement n\u00e9gatif",
};

const form = reactive({
  date_mvt: "",
  code_prod: "",
  type_mvt: "",
  mouvement: "",
  quantite: 1,
  lot_mode: "existing",
  lot_id: "",
  numero_lot: "",
  date_peremption: "",
  commentaire: "",
});

const prod = reactive({
  code: "",
  produit: "",
  forme: "",
  dosage: "",
  unite: "",
  stock_actuel: null,
  lots_count: 0,
  statut: "",
});

const lots = ref([]);
const productCodeEntries = ref([]);
const lotsMeta = reactive({
  totalItems: 0,
  existingItemsOnMovementDate: 0,
  selectableItemsOnMovementDate: 0,
  filteredByMovementDate: false,
});
const loadingProd = ref(false);
const loadingProductOptions = ref(false);
const saving = ref(false);
const msg = ref("");
const msgType = ref("ok");
const codeError = ref("");
const primaryDialogButton = ref(null);
const cancelDialogButton = ref(null);

const dialog = reactive({
  open: false,
  type: "info",
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "",
  resolver: null,
});

const hasSelectedType = computed(() => form.type_mvt === "entree" || form.type_mvt === "sortie");
const isEntry = computed(() => form.type_mvt === "entree");
const isExit = computed(() => form.type_mvt === "sortie");
const hasMovementDate = computed(() => !!form.date_mvt);
const canLoadProduct = computed(() => hasMovementDate.value && !isFutureMovementDate(form.date_mvt));

const pageTitle = computed(() => {
  if (isEntry.value) return "ENREGISTREMENT D'ENTR\u00c9E DE STOCK";
  if (isExit.value) return "ENREGISTREMENT DE SORTIE DE STOCK";
  return "ENREGISTREMENT DE MOUVEMENT";
});

const pageHint = computed(() => {
  if (isEntry.value) {
    return "Charge un produit, puis alimente un lot existant ou cr\u00e9e un nouveau lot pour cette entr\u00e9e.";
  }
  if (isExit.value) {
    return "Charge un produit, puis choisis le lot \u00e0 d\u00e9biter pour cette sortie.";
  }
  return "Choisis d'abord le type de mouvement pour ouvrir le formulaire adapt\u00e9.";
});

const selectedTypeLabel = computed(() => (isEntry.value ? "Entr\u00e9e de stock" : "Sortie de stock"));
const movementLabel = computed(() => (isEntry.value ? "Mouvement d'entr\u00e9e" : "Mouvement de sortie"));
const movementPlaceholder = computed(() =>
  isEntry.value ? "Choisir un mouvement d'entr\u00e9e..." : "Choisir un mouvement de sortie..."
);
const quantityLabel = computed(() => (isEntry.value ? "Quantit\u00e9 \u00e0 ajouter" : "Quantit\u00e9 \u00e0 sortir"));
const submitLabel = computed(() => (isEntry.value ? "Enregistrer l'entr\u00e9e" : "Enregistrer la sortie"));
const productInputPlaceholder = computed(() =>
  canLoadProduct.value ? "Choisir un produit" : "Renseignez d'abord la date du mouvement"
);
const productNameOptions = computed(() =>
  productCodeEntries.value
    .map((item) => String(item.produit ?? "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }))
);
const selectedProductName = computed(() => {
  if (!form.code_prod) return "";

  const entry = productCodeEntries.value.find(
    (item) => String(item.code ?? "").trim() === String(form.code_prod).trim()
  );

  return entry ? String(entry.produit ?? "").trim() : "";
});

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const todayIso = ref(getTodayISODate());

const mouvementsDisponibles = computed(() => {
  if (isEntry.value) return mvtsPositif;
  if (isExit.value) return mvtsNegatif;
  return [];
});

const lotOptions = computed(() => {
  if (isExit.value) {
    return lots.value.filter((lot) => Number(lot.stock_lot || 0) > 0);
  }
  return lots.value;
});

const availableLotsCount = computed(() => lotOptions.value.length);

const entryLotHelpText = computed(() => {
  if (!form.date_mvt || !prod.code || !isEntry.value || form.lot_mode !== "existing") return "";
  if (lotsMeta.existingItemsOnMovementDate === 0) {
    return `Aucun lot n'existait encore au ${formatDate(form.date_mvt)} : bascule sur "Nouveau lot" pour enregistrer cette entrée.`;
  }
  if (lotOptions.value.length === 0) {
    return 'Aucun lot existant : bascule sur "Nouveau lot" pour enregistrer cette entrée.';
  }
  if (lotsMeta.filteredByMovementDate && lotsMeta.totalItems > lotsMeta.existingItemsOnMovementDate) {
    return `Seuls les lots déjà créés au ${formatDate(form.date_mvt)} sont proposés.`;
  }
  return "";
});

const exitLotHelpText = computed(() => {
  if (!isExit.value) return "";
  if (!form.date_mvt) return "Renseignez d'abord la date du mouvement.";
  if (!prod.code) return "";
  if (lotsMeta.existingItemsOnMovementDate === 0) {
    return `Aucun lot n'existait encore au ${formatDate(form.date_mvt)} pour ce produit.`;
  }
  if (lotOptions.value.length === 0) {
    return `Aucun lot disponible pour une sortie au ${formatDate(form.date_mvt)}.`;
  }
  if (lotsMeta.filteredByMovementDate && lotsMeta.totalItems > lotsMeta.selectableItemsOnMovementDate) {
    return `Seuls les lots déjà créés au ${formatDate(form.date_mvt)} apparaissent dans la liste.`;
  }
  return "";
});

const selectedLot = computed(() => {
  const currentId = Number(form.lot_id || 0);
  return lotOptions.value.find((lot) => Number(lot.id) === currentId) || null;
});

const maxQuantite = computed(() => {
  if (isExit.value) {
    const stockLot = Number(selectedLot.value?.stock_lot);
    return Number.isFinite(stockLot) && stockLot >= 0 ? stockLot : null;
  }
  return null;
});

watch(
  () => form.type_mvt,
  (value) => {
    form.mouvement = "";
    form.quantite = 1;
    form.lot_id = "";
    form.numero_lot = "";
    form.date_peremption = "";
    form.commentaire = "";

    if (value === "entree") {
      form.lot_mode = lots.value.length === 0 ? "new" : "existing";
    } else {
      form.lot_mode = "existing";
    }

    if ((value === "entree" || value === "sortie") && form.code_prod && canLoadProduct.value) {
      void loadProduct();
    }
  }
);

watch(
  () => form.lot_mode,
  (mode) => {
    if (!isEntry.value) {
      form.lot_id = "";
      form.numero_lot = "";
      form.date_peremption = "";
      return;
    }

    if (mode === "new") {
      form.lot_id = "";
      return;
    }

    form.numero_lot = "";
    form.date_peremption = "";
  }
);

watch(
  () => form.date_mvt,
  (value) => {
    todayIso.value = getTodayISODate();
    form.lot_id = "";

    if (!value) {
      clearProd();
      msg.value = "";
      codeError.value = "";
      return;
    }

    if (isFutureMovementDate(value)) {
      clearProd();
      msg.value = "";
      codeError.value = "";
      return;
    }

    if (form.code_prod) {
      clearProd();
      void loadProduct();
    }
  }
);

watch(
  () => form.code_prod,
  (value, previousValue) => {
    codeError.value = "";

    if (!value) {
      msg.value = "";
      clearProd();
      return;
    }

    if (!canLoadProduct.value || value === previousValue) {
      return;
    }

    clearProd();
    void loadProduct();
  }
);

function selectMovementType(type) {
  if (type !== "entree" && type !== "sortie") return;
  msg.value = "";
  msgType.value = "ok";
  codeError.value = "";
  form.type_mvt = type;
}

function resetMovementType() {
  msg.value = "";
  msgType.value = "ok";
  codeError.value = "";
  form.type_mvt = "";
}

function formatMovementLabel(value) {
  return MOVEMENT_LABELS[value] ?? value;
}

function fmtInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("fr-FR") : "";
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

function formatLotOption(lot) {
  return `${lot.numero_lot} - exp. ${formatDate(lot.date_peremption)} - stock ${fmtInt(lot.stock_lot)}`;
}

function isFutureMovementDate(value) {
  if (!value) return false;
  return String(value).slice(0, 10) > getTodayISODate();
}

function normalizeErrorText(value) {
  if (!value) return "";
  return String(value).replace(/^Value error,\s*/i, "").trim();
}

function fieldLabelFromLoc(loc = []) {
  const field = Array.isArray(loc) ? loc[loc.length - 1] : "";
  if (field === "date_mvt") return "Date du mouvement";
  if (field === "code_prod") return "Nom du produit";
  if (field === "type_mvt") return "Type de mouvement";
  if (field === "mouvement") return "Mouvement";
  if (field === "quantite") return "Quantite";
  if (field === "lot_id") return "Lot";
  if (field === "numero_lot") return "Numero de lot";
  if (field === "date_peremption") return "Date de peremption";
  return "";
}

function extractApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] || {};
    const message = normalizeErrorText(first.msg || fallback);
    const fieldLabel = fieldLabelFromLoc(first.loc);
    return fieldLabel ? `${fieldLabel} : ${message}` : message;
  }

  if (error?.message === "Network Error" || !error?.response) {
    return "Impossible de joindre le serveur. Verifie que l'API est accessible.";
  }

  return fallback;
}

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

function clampQuantite() {
  if (form.quantite === null || form.quantite === "") return;

  let quantity = Number(form.quantite);
  if (!Number.isFinite(quantity)) {
    form.quantite = 1;
    return;
  }

  quantity = Math.floor(quantity);
  if (quantity < 1) quantity = 1;
  if (maxQuantite.value !== null && quantity > maxQuantite.value) {
    quantity = maxQuantite.value;
  }
  form.quantite = quantity;
}

function clearProd() {
  prod.code = "";
  prod.produit = "";
  prod.forme = "";
  prod.dosage = "";
  prod.unite = "";
  prod.stock_actuel = null;
  prod.lots_count = 0;
  prod.statut = "";
  lots.value = [];
  lotsMeta.totalItems = 0;
  lotsMeta.existingItemsOnMovementDate = 0;
  lotsMeta.selectableItemsOnMovementDate = 0;
  lotsMeta.filteredByMovementDate = false;
  form.lot_id = "";
  form.numero_lot = "";
  form.date_peremption = "";
}

function setSelectedProduct(value) {
  const selectedName = String(value || "").trim();

  if (!selectedName) {
    form.code_prod = "";
    return;
  }

  const entry = productCodeEntries.value.find(
    (item) => String(item.produit ?? "").trim() === selectedName
  );

  form.code_prod = entry ? String(entry.code ?? "").trim() : "";
}

function resetAfterSave() {
  form.mouvement = "";
  form.quantite = 1;
  form.lot_id = "";
  form.numero_lot = "";
  form.date_peremption = "";
  form.commentaire = "";
  form.lot_mode = isEntry.value && lotOptions.value.length === 0 ? "new" : "existing";
}

async function loadProductOptions() {
  loadingProductOptions.value = true;
  try {
    const response = await api.get("/api/products/options");
    productCodeEntries.value = Array.isArray(response.data?.items) ? response.data.items : [];
  } catch (e) {
    productCodeEntries.value = [];
    msgType.value = "err";
    msg.value = extractApiErrorMessage(e, "Impossible de charger la liste des produits actifs.");
  } finally {
    loadingProductOptions.value = false;
  }
}

async function loadProduct() {
  msg.value = "";
  codeError.value = "";

  if (!form.date_mvt) {
    clearProd();
    codeError.value = "Renseignez d'abord la date du mouvement.";
    return;
  }

  if (isFutureMovementDate(form.date_mvt)) {
    clearProd();
    codeError.value = "La date du mouvement ne peut pas être postérieure à la date du jour.";
    return;
  }

  if (!form.code_prod) {
    clearProd();
    return;
  }

  const requestedCode = form.code_prod;
  const requestedDate = form.date_mvt;
  const requestedType = form.type_mvt;

  loadingProd.value = true;
  try {
    const [productRes, lotsRes] = await Promise.all([
      api.get(`/api/products/${encodeURIComponent(requestedCode)}`),
      api.get(`/api/products/${encodeURIComponent(requestedCode)}/lots`, {
        params: {
          movement_date: requestedDate,
          movement_type: requestedType || undefined,
        },
      }),
    ]);

    if (
      form.code_prod !== requestedCode ||
      form.date_mvt !== requestedDate ||
      form.type_mvt !== requestedType
    ) {
      return;
    }

    Object.assign(prod, productRes.data);
    lots.value = lotsRes.data.items || [];
    lotsMeta.totalItems = Number(lotsRes.data.total_items || 0);
    lotsMeta.existingItemsOnMovementDate = Number(lotsRes.data.existing_items_on_movement_date || 0);
    lotsMeta.selectableItemsOnMovementDate = Number(lotsRes.data.selectable_items_on_movement_date || 0);
    lotsMeta.filteredByMovementDate = Boolean(lotsRes.data.filtered_by_movement_date);

    if (isEntry.value && lotOptions.value.length === 0) {
      form.lot_mode = "new";
    } else {
      form.lot_mode = "existing";
    }
    form.lot_id = "";
    clampQuantite();

    msgType.value = "ok";
    msg.value = "Produit trouv\u00e9";
  } catch (e) {
    if (
      form.code_prod !== requestedCode ||
      form.date_mvt !== requestedDate ||
      form.type_mvt !== requestedType
    ) {
      return;
    }
    clearProd();
    if (e?.response?.status === 404) {
      codeError.value = "Produit introuvable";
    } else {
      msgType.value = "err";
      msg.value = extractApiErrorMessage(e, "Produit introuvable ou inactif.");
    }
  } finally {
    loadingProd.value = false;
  }
}

const canSubmit = computed(() => {
  if (!hasSelectedType.value) return false;

  const quantityOk =
    form.quantite >= 1 &&
    (maxQuantite.value === null || form.quantite <= maxQuantite.value);

  const existingLotReady = form.lot_mode === "existing" && !!form.lot_id;
  const newLotReady =
    form.lot_mode === "new" &&
    !!form.numero_lot &&
    !!form.date_peremption;

  return (
    !!form.date_mvt &&
    !isFutureMovementDate(form.date_mvt) &&
    !!form.code_prod &&
    !!form.mouvement &&
    quantityOk &&
    prod.statut === "Actif" &&
    ((isEntry.value && (existingLotReady || newLotReady)) ||
      (isExit.value && existingLotReady))
  );
});

async function submit() {
  msg.value = "";
  todayIso.value = getTodayISODate();

  if (isFutureMovementDate(form.date_mvt)) {
    await openDialog({
      type: "error",
      title: "Date du mouvement invalide",
      message: "La date du mouvement ne peut pas être postérieure à la date du jour.",
      confirmLabel: "Compris",
    });
    return;
  }

  if (prod.statut !== "Actif") {
    await openDialog({
      type: "error",
      title: "Produit inactif",
      message: "Produit inactif : impossible d'enregistrer un mouvement.",
      confirmLabel: "Compris",
    });
    return;
  }

  if (isExit.value && !selectedLot.value) {
    await openDialog({
      type: "error",
      title: "Lot requis",
      message: "Choisissez un lot pour cette sortie.",
      confirmLabel: "Compris",
    });
    return;
  }

  if (maxQuantite.value !== null && form.quantite > maxQuantite.value) {
    await openDialog({
      type: "error",
      title: "Quantite invalide",
      message: "La quantit\u00e9 ne peut pas d\u00e9passer le stock du lot s\u00e9lectionn\u00e9.",
      confirmLabel: "Compris",
    });
    return;
  }

  saving.value = true;
  try {
    const payload = {
      date_mvt: form.date_mvt,
      code_prod: form.code_prod,
      type_mvt: form.type_mvt,
      mouvement: form.mouvement,
      quantite: form.quantite,
      commentaire: form.commentaire || null,
      lot_id: form.lot_mode === "existing" ? Number(form.lot_id) : null,
      numero_lot: form.lot_mode === "new" ? form.numero_lot : null,
      date_peremption: form.lot_mode === "new" ? form.date_peremption : null,
    };

    const confirmed = await openDialog({
      type: "confirm",
      title: "Confirmer l'enregistrement",
      message: isEntry.value
        ? "Confirme l'enregistrement de cette entr\u00e9e et du lot s\u00e9lectionn\u00e9."
        : "Confirme l'enregistrement de cette sortie et du lot s\u00e9lectionn\u00e9.",
      confirmLabel: "Enregistrer",
      cancelLabel: "Annuler",
    });
    if (!confirmed) return;

    await api.post("/api/mouvements", payload);
    await loadProduct();
    resetAfterSave();

    msg.value = "";
    await openDialog({
      type: "success",
      title: "Mouvement enregistr\u00e9",
      message: isEntry.value ? "Entr\u00e9e enregistr\u00e9e." : "Sortie enregistr\u00e9e.",
      confirmLabel: "OK",
    });
  } catch (e) {
    await openDialog({
      type: "error",
      title: "Enregistrement impossible",
      message: extractApiErrorMessage(e, "Erreur lors de l'enregistrement du mouvement."),
      confirmLabel: "Fermer",
    });
  } finally {
    saving.value = false;
  }
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
  todayIso.value = getTodayISODate();
  void loadProductOptions();
  window.addEventListener("keydown", handleDialogKeydown);
});

onBeforeUnmount(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", handleDialogKeydown);
});
</script>

<style scoped>
.wrap {
  min-height: 100dvh;
  padding: 8px 0;
  background: #ffffff;
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
.top--choice { margin-bottom: 14px; }
.back {
  border: none;
  background: transparent;
  color: #e46f36;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  width: max-content;
  font-size: 14px;
  transition: color 0.15s ease, transform 0.15s ease;
}
.back:hover { color: #c95a24; transform: translateX(-1px); }

h1 {
  margin: 0 0 6px;
  font-family: "Arial Black";
  font-size: clamp(25px, 2.5vw, 30px);
  line-height: 1.02;
  letter-spacing: 0.3px;
  color: #000;
}

.hint { margin: 0; color: #666; font-style: italic; font-size: 14px; }

.top-status {
  margin: 4px 0 0;
  color: #5f8d72;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.top-status.is-error {
  color: #b42318;
}

.chooser-screen {
  position: relative;
  overflow: hidden;
  padding: clamp(26px, 4vw, 46px);
  border: 1px solid #ead6c9;
  border-radius: 28px;
  background:
    linear-gradient(145deg, rgba(255, 252, 248, 0.98) 0%, rgba(255, 245, 236, 0.95) 100%);
  box-shadow: 0 26px 55px rgba(121, 75, 39, 0.14);
}

.chooser-screen__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  opacity: 0.8;
  pointer-events: none;
}

.chooser-screen__glow--left {
  width: 220px;
  height: 220px;
  top: -58px;
  left: -38px;
  background: rgba(255, 193, 157, 0.42);
}

.chooser-screen__glow--right {
  width: 280px;
  height: 280px;
  right: -80px;
  bottom: -120px;
  background: rgba(255, 230, 204, 0.7);
}

.chooser-hero {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto 28px;
  text-align: center;
}

.chooser-kicker {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #b85a28;
}

.chooser-question {
  margin: 0;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: clamp(34px, 4.7vw, 60px);
  line-height: 0.96;
  letter-spacing: -0.04em;
  color: #131722;
}

.chooser-copy {
  margin: 16px auto 0;
  max-width: 680px;
  font-size: 17px;
  line-height: 1.5;
  color: #5f6b7b;
}

.chooser-actions {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  max-width: 920px;
  margin: 0 auto;
}

.choice-answer {
  appearance: none;
  width: 100%;
  min-height: 240px;
  padding: 24px;
  border: 1px solid transparent;
  border-radius: 26px;
  box-shadow: 0 18px 34px rgba(58, 37, 23, 0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  text-align: left;
  cursor: pointer;
  color: #ffffff;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.choice-answer:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 42px rgba(58, 37, 23, 0.18);
}

.choice-answer:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.34), 0 24px 42px rgba(58, 37, 23, 0.18);
}

.choice-answer strong {
  font-family: "Arial Black", Arial, sans-serif;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 0.94;
  letter-spacing: -0.04em;
  color: #ffffff;
}

.choice-answer__mark {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: 38px;
  line-height: 1;
}

.choice-answer__text {
  max-width: 340px;
  font-size: 16px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

.choice-answer--entry {
  background:
    radial-gradient(circle at top right, rgba(176, 239, 194, 0.42), transparent 36%),
    linear-gradient(160deg, #2f8f56 0%, #1f6f3f 100%);
  border-color: #237245;
  box-shadow: 0 18px 34px rgba(35, 114, 69, 0.25);
}

.choice-answer--entry .choice-answer__mark {
  color: #1f6f3f;
  background: linear-gradient(180deg, #e6fff0 0%, #c6f0d4 100%);
}

.choice-answer--exit {
  background:
    radial-gradient(circle at top right, rgba(255, 196, 196, 0.4), transparent 36%),
    linear-gradient(160deg, #d54949 0%, #a92b2b 100%);
  border-color: #b23333;
  box-shadow: 0 18px 34px rgba(169, 43, 43, 0.24);
}

.choice-answer--exit .choice-answer__mark {
  color: #a92b2b;
  background: linear-gradient(180deg, #ffe9e9 0%, #ffd1d1 100%);
}

.form { margin-top: 8px; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 4px; }
.field.full { grid-column: 1 / -1; }

.mode-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #efd7c8;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff8f2 0%, #fffdfb 100%);
}

.mode-banner__label {
  margin: 0 0 2px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9a471f;
  font-weight: 800;
}

.lot-section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #efe3da;
  border-radius: 14px;
  background: #fffdfa;
}

.code-select {
  width: 100%;
}

.accent-entry {
  color: #b42318;
  font-family: "Arial Black", Arial, sans-serif;
  font-weight: 800;
}

.date-input {
  font-family: Arial, sans-serif;
  font-weight: 700;
  color: #111827;
}

.lot-section .date-input {
  color: #b42318;
}

.entry-rule {
  color: #15803d !important;
  font-weight: 800 !important;
  background: linear-gradient(180deg, #f5fff8 0%, #eefcf2 100%) !important;
  border-color: #c8ead1 !important;
}

label { font-weight: 700; color: #333; font-size: 13px; }

input, select, textarea, .control {
  border: 1px solid #d9dbe2;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

input, select, .control { height: 40px; }
textarea { min-height: 70px; resize: vertical; }

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

input:focus, select:focus, textarea:focus, .control:focus {
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
  transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn.primary {
  background: linear-gradient(180deg, #eea276 0%, #e46f36 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(228, 111, 54, 0.25);
}
.btn.secondary {
  border-color: #ecc5ae;
  background: #fff5ed;
  color: #9a471f;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.mini { color: #666; font-size: 11px; font-weight: 700; line-height: 1.1; }
.mini.err { color: #b42318; }

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
  .wrap { padding: 4px 0; }
  .container { width: min(96%, 96%); padding: 10px; border-radius: 14px; }
  .top { margin-bottom: 6px; }
  h1 { font-size: 22px; }
  .hint { font-size: 13px; }
  .chooser-screen { padding: 22px 16px; border-radius: 22px; }
  .chooser-question { font-size: 32px; }
  .chooser-copy { font-size: 15px; }
  .chooser-actions { grid-template-columns: 1fr; }
  .choice-answer { min-height: 190px; padding: 18px; border-radius: 22px; }
  .choice-answer strong { font-size: 34px; }
  .form { gap: 8px; }
  .row { grid-template-columns: 1fr; }
  .mode-banner { align-items: flex-start; flex-direction: column; }
  input, select, .control { height: 38px; }
  textarea { min-height: 64px; }
  .actions { justify-content: stretch; }
  .btn.primary,
  .btn.secondary { width: 100%; }
  .msg { width: 100%; margin-left: 0; }

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
