<template>
  <div ref="el" class="echart"></div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{mouvement, type, value}]
});

// Couleurs dédiées au graphique "mouvements"
// (volontairement différentes de Bon stock et Rupture).
const MOVEMENT_COLORS = {
  entree: "#12b76a",
  sortie: "#f04438",
};

const el = ref(null);
let chart = null;

function formatInt(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tooltipFormatter(param) {
  const x = param?.name ?? "-";
  const y = Number(param?.value ?? 0);

  return `
    <div style="min-width: 150px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:6px;">
        ${escapeHtml(x)}
      </div>
      <div style="font-size:14px; font-weight:700;">
        ${formatInt(y)}
      </div>
    </div>
  `;
}

function buildSeries(labels, mapByType) {
  const entree = labels.map((label) => mapByType.get(label)?.entree ?? 0);
  const sortie = labels.map((label) => mapByType.get(label)?.sortie ?? 0);

  const valueLabel = {
    show: true,
    position: "inside",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 11,
    formatter: ({ value }) => (Number(value || 0) > 0 ? formatInt(value) : ""),
  };

  return [
    {
      name: "Entrée",
      type: "bar",
      stack: "total",
      barMaxWidth: 42,
      data: entree,
      label: valueLabel,
      itemStyle: {
        color: MOVEMENT_COLORS.entree,
        borderRadius: [8, 8, 0, 0],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 14,
          shadowColor: "rgba(18, 183, 106, 0.35)",
        },
      },
    },
    {
      name: "Sortie",
      type: "bar",
      stack: "total",
      barMaxWidth: 42,
      data: sortie,
      label: valueLabel,
      itemStyle: {
        color: MOVEMENT_COLORS.sortie,
        borderRadius: [8, 8, 0, 0],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 14,
          shadowColor: "rgba(240, 68, 56, 0.35)",
        },
      },
    },
  ];
}

function render() {
  if (!chart) return;

  // Regrouper par mouvement
  const map = new Map(); // mouvement -> {entree, sortie}
  for (const item of props.items) {
    const mouvement = item.mouvement;
    const type = (item.type || "").toLowerCase(); // entree/sortie
    const value = Number(item.value || 0);

    if (!map.has(mouvement)) map.set(mouvement, {});
    map.get(mouvement)[type] = (map.get(mouvement)[type] ?? 0) + value;
  }

  const labels = Array.from(map.keys()).sort(
    (a, b) =>
      (map.get(b)?.entree ?? 0) + (map.get(b)?.sortie ?? 0) - ((map.get(a)?.entree ?? 0) + (map.get(a)?.sortie ?? 0))
  );

  const series = buildSeries(labels, map);

  chart.setOption(
    {
      tooltip: {
        trigger: "item",
        backgroundColor: "#0f172a",
        borderWidth: 0,
        padding: [10, 12],
        textStyle: { color: "#f8fafc" },
        formatter: tooltipFormatter,
      },
      legend: {
        top: 8,
        right: 10,
        icon: "roundRect",
        itemWidth: 18,
        itemHeight: 10,
        textStyle: { color: "#475569", fontWeight: 600 },
      },
      grid: { left: 24, right: 18, top: 44, bottom: 72 },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { alignWithLabel: true },
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { rotate: 20, interval: 0, color: "#475569" },
      },
      yAxis: {
        type: "value",
        show: false,
      },
      series,
      animationDuration: 500,
      animationEasing: "cubicOut",
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
