<template>
  <div ref="el" class="echart"></div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{mouvement, type, value}]
  expanded: { type: Boolean, default: false },
});

// Couleurs dédiées au graphique "mouvements"
// (volontairement différentes de Bon stock et Rupture).
const MOVEMENT_COLORS = {
  entree: "#12b76a",
  sortie: "#f04438",
};

const el = ref(null);
let chart = null;
let resizeObserver = null;

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

function formatPercent(value) {
  const numeric = Number(value || 0);
  return Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(1).replace(".", ",");
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? "").replace("#", "").trim();
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`;

  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveMovementColor(type) {
  const key = String(type ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (key.includes("sort")) return MOVEMENT_COLORS.sortie;
  return MOVEMENT_COLORS.entree;
}

function itemTooltipFormatter(param, total) {
  const label = param?.name ?? "-";
  const type = param?.seriesName ?? "-";
  const value = Number(param?.value ?? 0);
  const percent = total > 0 ? (value / total) * 100 : 0;
  const accent = resolveMovementColor(type);
  const border = hexToRgba(accent, 0.24);
  const soft = hexToRgba(accent, 0.14);
  const glow = hexToRgba(accent, 0.24);

  return `
    <div style="
      min-width: 198px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid ${border};
      background: linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.96) 100%);
      box-shadow: 0 18px 36px rgba(15,23,42,0.28);
    ">
      <div style="height:4px; background:${accent}; box-shadow: 0 0 16px ${glow};"></div>
      <div style="padding: 12px 14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <span style="width:10px; height:10px; border-radius:999px; background:${accent}; box-shadow: 0 0 0 4px ${soft}; flex:0 0 auto;"></span>
            <strong style="font-size:14px; font-weight:800; color:#f8fafc; white-space:nowrap;">${escapeHtml(label)}</strong>
          </div>
          <span style="
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            color: ${accent};
            background: ${soft};
            border: 1px solid ${border};
            letter-spacing: 0.02em;
          ">${escapeHtml(type)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:13px; margin-bottom:6px; color:#cbd5e1;">
          <span>Nombre</span>
          <strong style="color:#ffffff;">${formatInt(value)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:13px; color:#cbd5e1;">
          <span>Pourcentage</span>
          <strong style="color:${accent};">${formatPercent(percent)}%</strong>
        </div>
      </div>
    </div>
  `;
}

function formatCategoryLabel(value, expanded = false) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  if (words.length <= 1) return String(value ?? "");
  if (expanded && words.length <= 3) return words.join("\n");
  if (words.length === 2) return `${words[0]}\n${words[1]}`;

  const head = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const tail = words.slice(Math.ceil(words.length / 2)).join(" ");
  return `${head}\n${tail}`;
}

function gradient(from, to) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ]);
}

function buildSeries(labels, mapByType, expanded = false, barWidth = null) {
  const entree = labels.map((label) => mapByType.get(label)?.entree ?? 0);
  const sortie = labels.map((label) => mapByType.get(label)?.sortie ?? 0);

  const valueLabel = {
    show: true,
    position: "insideTop",
    distance: expanded ? 16 : 10,
    color: "#ffffff",
    fontWeight: 800,
    fontSize: expanded ? 18 : 11,
    formatter: ({ value }) => (Number(value || 0) > 0 ? formatInt(value) : ""),
  };

  return [
    {
      name: "Entrée",
      type: "bar",
      stack: "total",
      ...(barWidth ? { barWidth } : { barMaxWidth: expanded ? 56 : 42 }),
      ...(expanded ? { barCategoryGap: "6%" } : {}),
      data: entree,
      label: valueLabel,
      itemStyle: {
        color: gradient("#29d17c", MOVEMENT_COLORS.entree),
        borderRadius: [10, 10, 0, 0],
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
      ...(barWidth ? { barWidth } : { barMaxWidth: expanded ? 56 : 42 }),
      ...(expanded ? { barCategoryGap: "6%" } : {}),
      data: sortie,
      label: valueLabel,
      itemStyle: {
        color: gradient("#fb7185", MOVEMENT_COLORS.sortie),
        borderRadius: [10, 10, 0, 0],
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

  const width = chart.getWidth();
  const height = chart.getHeight();
  const expanded = props.expanded || width > 1280 || height > 620;
  const axisFontSize = expanded ? 18 : 12;
  const axisLineHeight = expanded ? 22 : 15;
  const axisMargin = expanded ? 16 : 10;
  const yAxisFontSize = expanded ? 16 : 11;
  const legendFontSize = expanded ? 19 : 12;
  const legendItemWidth = expanded ? 26 : 18;
  const legendItemHeight = expanded ? 16 : 10;
  const legendItemGap = expanded ? 18 : 10;
  const gridTop = expanded ? 52 : 36;
  const gridBottom = expanded ? 56 : 38;
  const gridLeft = expanded ? 18 : 10;
  const gridRight = expanded ? 16 : 10;
  const barWidth = expanded ? "62%" : null;

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
  const totalValue = labels.reduce(
    (sum, label) => sum + Number(map.get(label)?.entree ?? 0) + Number(map.get(label)?.sortie ?? 0),
    0
  );

  const series = buildSeries(labels, map, expanded, barWidth);

  chart.setOption(
    {
      tooltip: {
        trigger: "item",
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
        textStyle: { color: "#f8fafc" },
        extraCssText: "box-shadow:none;background:transparent;",
        formatter: (param) => itemTooltipFormatter(param, totalValue),
      },
      legend: {
        top: 0,
        right: 4,
        icon: "roundRect",
        itemWidth: legendItemWidth,
        itemHeight: legendItemHeight,
        itemGap: legendItemGap,
        textStyle: { color: "#475569", fontWeight: 700, fontSize: legendFontSize },
      },
      grid: { left: gridLeft, right: gridRight, top: gridTop, bottom: gridBottom, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: expanded ? ["14%", "14%"] : true,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#d7e0ec" } },
        axisLabel: {
          interval: 0,
          color: "#475569",
          fontSize: axisFontSize,
          fontWeight: 600,
          lineHeight: axisLineHeight,
          margin: axisMargin,
          formatter: (value) => formatCategoryLabel(value, expanded),
        },
      },
      yAxis: {
        type: "value",
        show: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: yAxisFontSize,
        },
        splitLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.18)",
            type: "dashed",
          },
        },
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
  document.addEventListener("fullscreenchange", resize);

  if (typeof ResizeObserver !== "undefined" && el.value) {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(el.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  document.removeEventListener("fullscreenchange", resize);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) chart.dispose();
  chart = null;
});

watch(() => props.items, render, { deep: true });
watch(() => props.expanded, render);
</script>

<style scoped>
.echart {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
