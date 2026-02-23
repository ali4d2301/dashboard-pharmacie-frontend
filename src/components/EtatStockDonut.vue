<template>
  <div ref="el" class="echart"></div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{name, value}]
});

const STATUS_COLORS = {
  rupture: "#dc2626",
  "stock dormant": "#7c3aed",
  "sous-stock": "#f97316",
  "bon stock": "#16a34a",
  "sur-stock": "#2563eb",
};

const el = ref(null);
let chart = null;

function normalizeStatus(value) {
  const raw = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (raw.includes("rupture")) return "rupture";
  if (raw.includes("dormant")) return "stock dormant";
  if (raw.includes("sous")) return "sous-stock";
  if (raw.includes("bon")) return "bon stock";
  if (raw.includes("sur")) return "sur-stock";
  return raw;
}

function resolveColor(statusName) {
  return STATUS_COLORS[normalizeStatus(statusName)] ?? "#94a3b8";
}

function render() {
  if (!chart) return;

  const pieData = (props.items || []).map((item) => ({
    ...item,
    itemStyle: { color: resolveColor(item.name) },
  }));

  chart.setOption(
    {
      tooltip: { trigger: "item" },
      legend: { top: 8, left: "center" },
      series: [
        {
          type: "pie",
          radius: "72%",
          center: ["50%", "58%"],
          data: pieData,
          label: { formatter: "{b}\n{d}%" },
          labelLine: { length: 12, length2: 10 },
        },
      ],
    },
    true
  );
}

function resize() {
  if (chart) chart.resize();
}

onMounted(() => {
  chart = echarts.init(el.value);
  render();
  window.addEventListener("resize", resize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  if (chart) chart.dispose();
  chart = null;
});

watch(() => props.items, render, { deep: true });
</script>

<style scoped>
.echart {
  width: 100%;
  height: 360px;
}
</style>
