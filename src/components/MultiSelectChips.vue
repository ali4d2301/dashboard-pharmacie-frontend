<template>
  <div class="ms" ref="root">
    <button class="ms-btn" type="button" @click="toggle" :disabled="disabled">
      <span class="ms-label">{{ label }}</span>

      <div v-if="modelValue.length" class="ms-chips">
        <span v-for="v in modelValue" :key="v" class="chip">
          {{ v }}
          <span class="chip-x" @click.stop="remove(v)">&times;</span>
        </span>
      </div>

      <span v-else class="ms-placeholder">{{ placeholder }}</span>

      <span class="ms-caret">&#9662;</span>
    </button>

    <div v-if="open" class="ms-dd" @click.stop>
      <div class="ms-top">
        <input
          class="ms-search"
          type="search"
          v-model="search"
          placeholder="Filtrer..."
        />
        <button class="ms-clear" type="button" @click="clear" :disabled="!modelValue.length">
          Effacer
        </button>
      </div>

      <div class="ms-list">
        <label v-for="opt in filteredOptions" :key="opt" class="ms-item">
          <input type="checkbox" :value="opt" v-model="local" />
          <span>{{ opt }}</span>
        </label>

        <div v-if="filteredOptions.length === 0" class="ms-empty">Aucun r&eacute;sultat</div>
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

function sameArray(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

watch(
  () => props.modelValue,
  (value) => {
    if (sameArray(local.value, value)) return;
    local.value = [...value];
  },
  { deep: true }
);

watch(
  local,
  (value) => {
    if (sameArray(value, props.modelValue)) return;
    emit("update:modelValue", [...value]);
  },
  { deep: true }
);

const filteredOptions = computed(() => {
  const query = String(search.value || "").toLowerCase().trim();
  if (!query) return props.options;
  return props.options.filter((option) => String(option).toLowerCase().includes(query));
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

function remove(value) {
  local.value = local.value.filter((item) => item !== value);
}

function onDocPointerDown(event) {
  if (!root.value) return;
  if (open.value && !root.value.contains(event.target)) close();
}

onMounted(() => document.addEventListener("pointerdown", onDocPointerDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocPointerDown));
</script>

<style scoped>
.ms {
  position: relative;
  min-width: 280px;
}

.ms-btn {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e6e9f0;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
}

.ms-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ms-label {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.ms-placeholder {
  min-width: 0;
  color: #9ca3af;
  font-size: 14px;
}

.ms-caret {
  margin-left: auto;
  color: #6b7280;
}

.ms-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #dbe4ff;
  background: #f5f7ff;
  font-size: 13px;
}

.chip-x {
  font-weight: 700;
  cursor: pointer;
  opacity: 0.7;
}

.chip-x:hover {
  opacity: 1;
}

.ms-dd {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  border: 1px solid #e6e9f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  z-index: 50;
  overflow: hidden;
}

.ms-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #eef2f7;
}

.ms-search {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #e6e9f0;
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
}

.ms-clear {
  flex: 0 0 88px;
  width: 88px;
  padding: 9px 10px;
  border: 1px solid #e6e9f0;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  min-width: 88px;
  box-sizing: border-box;
}

.ms-list {
  max-height: 220px;
  overflow: auto;
  padding: 8px;
}

.ms-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
}

.ms-item:hover {
  background: #f7f9fc;
}

.ms-empty {
  padding: 12px;
  color: #6b7280;
}

.ms-bottom {
  padding: 10px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
}

.ms-done {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid #e6e9f0;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  min-width: 72px;
}

@media (max-width: 520px) {
  .ms {
    min-width: 0;
  }

  .ms-dd {
    width: 100%;
  }

  .ms-list {
    max-height: min(240px, 42vh);
  }
}
</style>
