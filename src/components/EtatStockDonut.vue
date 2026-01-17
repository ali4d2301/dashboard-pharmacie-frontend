<template>
  <div ref="el" class="echart"></div>
</template>

<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{name, value}]
  title: { type: String, default: "Répartition des états stock" },
});

const el = ref(null);
let chart = null;

function render() {
  if (!chart) return;

  chart.setOption(
    {
      title: { text: props.title, left: "left" },
      tooltip: { trigger: "item" },
      legend: { top: 45, left: "center" },
      series: [
        {
          type: "pie",
          radius: ["45%", "72%"],  // DONUT
          center: ["50%", "62%"],
          data: props.items,
          label: { formatter: "{b}\n{d}%"},
          labelLine: { length: 12, length2: 10 },
        },
      ],
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
.echart {
  width: 100%;
  height: 360px;
}
</style>
