<template>
  <div class="ms" ref="root">
    <!-- Zone cliquable -->
    <button class="ms-btn" type="button" @click="toggle" :disabled="disabled">
      <span class="ms-label">{{ label }}</span>

      <!-- Chips -->
      <div class="ms-chips" v-if="modelValue.length">
        <span class="chip" v-for="v in modelValue" :key="v">
          {{ v }}
          <span class="chip-x" @click.stop="remove(v)">×</span>
        </span>
      </div>

      <span class="ms-placeholder" v-else>{{ placeholder }}</span>

      <span class="ms-caret">▾</span>
    </button>

    <!-- Dropdown -->
    <div class="ms-dd" v-if="open" @click.stop>
      <div class="ms-top">
        <input
          class="ms-search"
          type="search"
          v-model="search"
          placeholder="Filtrer…"
        />
        <button class="ms-clear" type="button" @click="clear" :disabled="!modelValue.length">
          Effacer
        </button>
      </div>

      <div class="ms-list">
        <label class="ms-item" v-for="opt in filteredOptions" :key="opt">
          <input type="checkbox" :value="opt" v-model="local" />
          <span>{{ opt }}</span>
        </label>

        <div class="ms-empty" v-if="filteredOptions.length === 0">Aucun résultat</div>
      </div>

      <div class="ms-bottom">
        <button class="ms-done" type="button" @click="close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  placeholder: { type: String, default: "Tout" },
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const search = ref("");
const local = ref([...props.modelValue]);
const root = ref(null);

watch(
  () => props.modelValue,
  (v) => (local.value = [...v])
);

watch(local, (v) => emit("update:modelValue", v));

const filteredOptions = computed(() => {
  const q = String(search.value || "").toLowerCase().trim();
  if (!q) return props.options;
  return props.options.filter((o) => String(o).toLowerCase().includes(q));
});

function toggle() {
  if (props.disabled) return;
  open.value ? close() : (open.value = true);
}
function close() {
  open.value = false;
  search.value = "";
}
function clear() {
  local.value = [];
}
function remove(v) {
  local.value = local.value.filter((x) => x !== v);
}

function onDocPointerDown(e) {
  if (!root.value) return;
  if (open.value && !root.value.contains(e.target)) close();
}

onMounted(() => document.addEventListener("pointerdown", onDocPointerDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocPointerDown));

</script>

<style scoped>
.ms { position: relative; min-width: 280px; }
.ms-btn{
  width: 100%;
  display:flex; align-items:center; gap:10px;
  padding: 10px 12px;
  border: 1px solid #e6e9f0;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
}
.ms-btn:disabled{ opacity:.6; cursor:not-allowed; }

.ms-label{ font-size: 12px; color:#6b7280; white-space:nowrap; }
.ms-placeholder{ color:#9ca3af; font-size: 14px; }
.ms-caret{ margin-left:auto; color:#6b7280; }

.ms-chips{ display:flex; gap:6px; flex-wrap:wrap; }
.chip{
  display:inline-flex; align-items:center; gap:6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #dbe4ff;
  background: #f5f7ff;
  font-size: 13px;
}
.chip-x{ font-weight:700; cursor:pointer; opacity:.7; }
.chip-x:hover{ opacity:1; }

.ms-dd{
  position:absolute;
  top: calc(100% + 8px);
  left:0;
  width: 100%;
  border: 1px solid #e6e9f0;
  border-radius: 14px;
  background:#fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
  z-index: 50;
  overflow:hidden;
}
.ms-top{
  display:flex; gap:10px;
  padding: 10px;
  border-bottom: 1px solid #eef2f7;
}
.ms-search{
  flex:1;
  padding: 9px 10px;
  border: 1px solid #e6e9f0;
  border-radius: 12px;
  outline:none;
}
.ms-clear{
  padding: 9px 10px;
  border: 1px solid #e6e9f0;
  border-radius: 12px;
  background:#fff;
  cursor:pointer;
}

.ms-list{ max-height: 220px; overflow:auto; padding: 8px; }
.ms-item{
  display:flex; align-items:center; gap:10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor:pointer;
}
.ms-item:hover{ background:#f7f9fc; }
.ms-empty{ padding: 12px; color:#6b7280; }

.ms-bottom{
  padding: 10px;
  border-top: 1px solid #eef2f7;
  display:flex; justify-content:flex-end;
}
.ms-done{
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid #e6e9f0;
  background:#fff;
  cursor:pointer;
}
</style>
