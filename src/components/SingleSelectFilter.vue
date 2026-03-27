<template>
  <div class="ss" ref="root">
    <button class="ss-btn" type="button" @click="toggle" :disabled="disabled">
      <span v-if="label" class="ss-label">{{ label }}</span>
      <span v-if="modelValue" class="ss-value">{{ modelValue }}</span>
      <span v-else class="ss-placeholder">{{ placeholder }}</span>
      <span class="ss-caret">&#9662;</span>
    </button>

    <div v-if="open" class="ss-dd" @click.stop>
      <div class="ss-top">
        <input
          ref="searchInput"
          class="ss-search"
          type="search"
          v-model="search"
          placeholder="Filtrer..."
        />
        <button class="ss-clear" type="button" @click="clear" :disabled="!modelValue">
          Effacer
        </button>
      </div>

      <div class="ss-list">
        <button
          v-for="opt in filteredOptions"
          :key="opt"
          type="button"
          class="ss-item"
          :class="{ 'is-selected': opt === modelValue }"
          @click="selectOption(opt)"
        >
          <span class="ss-radio" :class="{ 'is-selected': opt === modelValue }" aria-hidden="true"></span>
          <span>{{ opt }}</span>
        </button>

        <div v-if="filteredOptions.length === 0" class="ss-empty">Aucun r&eacute;sultat</div>
      </div>

      <div class="ss-bottom">
        <button class="ss-done" type="button" @click="close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  placeholder: { type: String, default: "Tout" },
  options: { type: Array, default: () => [] },
  modelValue: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const search = ref("");
const root = ref(null);
const searchInput = ref(null);

const filteredOptions = computed(() => {
  const query = String(search.value || "").toLowerCase().trim();
  if (!query) return props.options;
  return props.options.filter((option) => String(option).toLowerCase().includes(query));
});

async function toggle() {
  if (props.disabled) return;
  if (open.value) {
    close();
    return;
  }
  open.value = true;
  await nextTick();
  searchInput.value?.focus();
}

function close() {
  open.value = false;
  search.value = "";
}

function clear() {
  emit("update:modelValue", "");
}

function selectOption(option) {
  emit("update:modelValue", option === props.modelValue ? "" : String(option));
  close();
}

function onDocPointerDown(event) {
  if (!root.value) return;
  if (open.value && !root.value.contains(event.target)) close();
}

onMounted(() => document.addEventListener("pointerdown", onDocPointerDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocPointerDown));
</script>

<style scoped>
.ss {
  position: relative;
  min-width: 0;
  width: 100%;
}

.ss-btn {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #d9dbe2;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.ss-btn:disabled {
  background: #f2f3f6;
  color: #8a8f99;
  cursor: not-allowed;
}

.ss-btn:not(:disabled):focus-visible,
.ss-btn:not(:disabled):hover {
  border-color: #e46f36;
  box-shadow: 0 0 0 3px rgba(228, 111, 54, 0.12);
}

.ss-label {
  color: #9a471f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ss-placeholder {
  min-width: 0;
  color: #8a8f99;
  font-size: 15px;
  text-align: left;
}

.ss-value {
  min-width: 0;
  color: #b42318;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.1;
  text-align: left;
}

.ss-caret {
  margin-left: auto;
  color: #8d715f;
  font-size: 11px;
}

.ss-dd {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  border: 1px solid #efd7c8;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(32, 22, 15, 0.12);
  z-index: 50;
  overflow: hidden;
}

.ss-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #f2e6de;
}

.ss-search {
  flex: 1 1 auto;
  min-width: 0;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #ead5c7;
  border-radius: 14px;
  outline: none;
  box-sizing: border-box;
  font-size: 15px;
}

.ss-search:focus {
  border-color: #e46f36;
  box-shadow: 0 0 0 3px rgba(228, 111, 54, 0.12);
}

.ss-clear {
  flex: 0 0 98px;
  width: 98px;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #f2b89a;
  border-radius: 14px;
  background: #fff8f4;
  color: #9a471f;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: 12px;
  cursor: pointer;
  box-sizing: border-box;
}

.ss-clear:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ss-list {
  max-height: 260px;
  overflow: auto;
  padding: 10px;
}

.ss-item {
  width: 100%;
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: transparent;
  color: #634939;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}

.ss-item:hover,
.ss-item.is-selected {
  background: #fff1e5;
}

.ss-radio {
  width: 16px;
  height: 16px;
  border: 1px solid #8a8f99;
  border-radius: 999px;
  background: #fff;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.ss-radio.is-selected {
  border: 5px solid #e46f36;
}

.ss-empty {
  padding: 14px 12px;
  color: #8a8f99;
  font-size: 14px;
}

.ss-bottom {
  display: flex;
  justify-content: flex-end;
  padding: 12px;
  border-top: 1px solid #f2e6de;
}

.ss-done {
  min-width: 72px;
  height: 42px;
  padding: 8px 16px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(180deg, #f69357 0%, #ef7b39 100%);
  color: #fff;
  font-family: "Arial Black", Arial, sans-serif;
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 520px) {
  .ss-top {
    padding: 10px;
  }

  .ss-clear {
    flex-basis: 88px;
    width: 88px;
  }

  .ss-list {
    max-height: min(240px, 42vh);
  }
}
</style>
