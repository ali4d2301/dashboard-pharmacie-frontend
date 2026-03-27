<template>
  <div class="echart-shell">
    <div ref="el" class="echart"></div>
    <div class="echart-center" :style="centerStyle" aria-hidden="true">
      <strong>{{ centerValue }}</strong>
      <span>{{ centerLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{name, value}]
  expanded: { type: Boolean, default: false },
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
let resizeObserver = null;
const centerValue = ref("0");
const centerLabel = ref("produits");
const centerStyle = ref({
  top: "50%",
  width: "220px",
  "--center-value-size": "56px",
  "--center-label-size": "18px",
  "--center-gap": "10px",
});

function formatInt(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  return Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(1).replace(".", ",");
}

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

function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? "").replace("#", "").trim();
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`;

  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function tooltipFormatter({ name, value, percent }) {
  const accent = resolveColor(name);
  const border = hexToRgba(accent, 0.26);
  const soft = hexToRgba(accent, 0.16);
  const glow = hexToRgba(accent, 0.24);

  return `
    <div style="
      min-width: 194px;
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
            <strong style="font-size:14px; font-weight:800; color:#f8fafc; white-space:nowrap;">${name}</strong>
          </div>
          <span style="
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            color: ${accent};
            background: ${soft};
            border: 1px solid ${border};
            text-transform: uppercase;
            letter-spacing: 0.04em;
          ">État</span>
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

function render() {
  if (!chart) return;

  const width = chart.getWidth();
  const height = chart.getHeight();
  const isCompact = width < 560;
  const isExpanded = width > 980 || height > 540;
  const isFullscreenLike = props.expanded || width > 1280 || height > 620;
  const centerYRatio = isCompact ? 0.61 : isFullscreenLike ? 0.58 : isExpanded ? 0.58 : 0.58;
  const centerY = Math.round(height * centerYRatio);
  const outerRadius = Math.round(
    Math.min(
      width * (isFullscreenLike ? 0.31 : isExpanded ? 0.31 : 0.29),
      height * (isFullscreenLike ? 0.4 : isExpanded ? 0.44 : 0.43),
      isFullscreenLike ? 280 : isExpanded ? 285 : 260
    )
  );
  const innerRadius = Math.round(outerRadius * (isFullscreenLike ? 0.54 : 0.58));
  const valueFontSize = isFullscreenLike
    ? Math.round(Math.max(64, Math.min(120, outerRadius * 0.54)))
    : Math.round(Math.max(38, Math.min(72, outerRadius * 0.48)));
  const captionFontSize = isFullscreenLike
    ? Math.round(Math.max(24, Math.min(34, outerRadius * 0.2)))
    : Math.round(Math.max(15, Math.min(24, outerRadius * 0.18)));
  const labelFontSize = isFullscreenLike ? 20 : isExpanded ? 13 : 11;
  const labelLineHeight = isFullscreenLike ? 24 : isExpanded ? 17 : 15;
  const legendFontSize = isFullscreenLike ? 16 : 12;
  const legendItemWidth = isFullscreenLike ? 24 : 18;
  const legendItemHeight = isFullscreenLike ? 14 : 10;
  const legendItemGap = isFullscreenLike ? 18 : 12;

  const pieData = (props.items || [])
    .filter((item) => Number(item?.value || 0) > 0)
    .map((item) => ({
      ...item,
      itemStyle: { color: resolveColor(item.name) },
    }))
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  const total = pieData.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const hasData = total > 0;

  centerValue.value = formatInt(total);
  centerLabel.value = hasData ? "produits" : "aucune donnée";
  centerStyle.value = {
    top: `${centerY}px`,
    width: `${Math.max(isFullscreenLike ? 220 : 160, Math.round(innerRadius * 2.05))}px`,
    "--center-value-size": `${valueFontSize}px`,
    "--center-label-size": `${captionFontSize}px`,
    "--center-gap": `${Math.max(isFullscreenLike ? 18 : 10, Math.round(valueFontSize * 0.2))}px`,
  };

  chart.setOption(
    {
      tooltip: {
        trigger: "item",
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
        textStyle: { color: "#f8fafc" },
        extraCssText: "box-shadow:none;background:transparent;",
        formatter: tooltipFormatter,
      },
      legend: {
        show: hasData,
        top: -2,
        left: "center",
        icon: "roundRect",
        itemWidth: legendItemWidth,
        itemHeight: legendItemHeight,
        itemGap: legendItemGap,
        textStyle: {
          color: "#475569",
          fontWeight: 700,
          fontSize: legendFontSize,
        },
      },
      series: [
        {
          type: "pie",
          radius: [innerRadius, outerRadius],
          center: ["50%", centerY],
          minAngle: hasData ? 4 : 0,
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 4,
            borderRadius: 10,
          },
          emphasis: {
            scale: true,
            scaleSize: 5,
            itemStyle: {
              shadowBlur: 18,
              shadowColor: "rgba(15, 23, 42, 0.14)",
            },
          },
          data: hasData
            ? pieData
            : [
                {
                  name: "Aucune donnée",
                  value: 1,
                  itemStyle: { color: "#e2e8f0" },
                  label: { show: false },
                },
              ],
          label: hasData
            ? {
                show: true,
                color: "#334155",
                fontSize: labelFontSize,
                fontWeight: 600,
                lineHeight: labelLineHeight,
                formatter: ({ name, value, percent }) =>
                  `${name}\n${formatInt(value)} - ${formatPercent(percent)}%`,
              }
            : { show: false },
          labelLine: hasData
            ? {
                show: true,
                length: isFullscreenLike ? 14 : 8,
                length2: isFullscreenLike ? 16 : 10,
                smooth: 0.2,
              }
            : { show: false },
          labelLayout: { hideOverlap: true },
        },
      ],
      animationDuration: 650,
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
.echart-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.echart {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.echart-center {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--center-gap, 10px);
  width: var(--center-width, auto);
  max-width: min(76vw, 560px);
  pointer-events: none;
  text-align: center;
}

.echart-center strong {
  font-family: "Arial Black", Arial, sans-serif;
  font-size: var(--center-value-size, 56px);
  line-height: 0.88;
  letter-spacing: -0.05em;
  color: #0f172a;
}

.echart-center span {
  font-family: Arial, sans-serif;
  font-size: var(--center-label-size, 18px);
  line-height: 1.05;
  font-weight: 700;
  color: #94a3b8;
}
</style>
