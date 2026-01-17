<template>
  <div class="page">
    <router-view />
  </div>
</template>

<script setup>
import Header from "./components/Header.vue"
import MenuGrid from "./components/MenuGrid.vue"
import FooterNote from "./components/FooterNote.vue"
</script>

<style>
.page {
  min-height: 100vh;
  background: #fff;
  font-family: Arial, sans-serif;
}
</style>
