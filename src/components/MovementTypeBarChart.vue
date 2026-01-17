<template>
  <div ref="el" class="echart"></div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{mouvement, type, value}]
  title: { type: String, default: "Mouvements (entrée vs sortie)" },
});

const el = ref(null);
let chart = null;

function buildSeries(labels, mapByType) {
  const entree = labels.map(l => (mapByType.get(l)?.entree ?? 0));
  const sortie = labels.map(l => (mapByType.get(l)?.sortie ?? 0));

  return [
    {
      name: "Entrée",
      type: "bar",
      stack: "total",
      data: entree,
      itemStyle: { color: "#16a34a" }, // vert
    },
    {
      name: "Sortie",
      type: "bar",
      stack: "total",
      data: sortie,
      itemStyle: { color: "#dc2626" }, // rouge
    },
  ];
}

function render() {
  if (!chart) return;

  // Regrouper par mouvement
  const map = new Map(); // mouvement -> {entree, sortie}
  for (const it of props.items) {
    const m = it.mouvement;
    const t = (it.type || "").toLowerCase(); // entree/sortie
    const v = Number(it.value || 0);

    if (!map.has(m)) map.set(m, {});
    map.get(m)[t] = (map.get(m)[t] ?? 0) + v;
  }

  const labels = Array.from(map.keys()) // Pour ranger par ordre décroissant
  .sort((a, b) => ((map.get(b)?.entree ?? 0) + (map.get(b)?.sortie ?? 0)) - ((map.get(a)?.entree ?? 0) + (map.get(a)?.sortie ?? 0)));

  const series = buildSeries(labels, map);

  chart.setOption(
    {
      title: { text: props.title, left: "left" },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 8, right: 10 },
      grid: { left: 40, right: 20, top: 60, bottom: 70 },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: 20, interval: 0 } },
      yAxis: { type: "value" },
      series,
    },
    true
  );
}

function resize() {
  chart && chart.resize();
}

onMounted(() => {
  chart = echarts.init(el.value);
  render();
  window.addEventListener("resize", resize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  chart && chart.dispose();
  chart = null;
});

watch(() => props.items, render, { deep: true });
</script>

<style scoped>
.echart { width: 100%; height: 360px; }
</style>
