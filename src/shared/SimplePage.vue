<template>
  <div class="wrap">
    <div class="container">
      <a class="back" href="/" @click.prevent="$router.push('/')">← Retour</a>
      <h1>{{ title }}</h1>
      <p>Page en construction…</p>
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>

<style scoped>
.wrap { min-height: 100vh; background: #fff; font-family: Arial, sans-serif; }
.container { width: min(1100px, 92%); margin: 0 auto; padding: 24px 0; }
.back { display:inline-block; margin-bottom: 14px; text-decoration:none; color:#e46f36; font-weight:700; }
h1 { margin: 0 0 8px; }
</style>
