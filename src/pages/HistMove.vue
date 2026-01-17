<template>
  <div class="move-page">
    
    <div class="move-header">
      <div class="header-hist">
        <a class="back" href="/" @click.prevent="$router.push('/')">← Retour</a>
        <h1 class="title">Historique des mouvements</h1>
      </div>

      <div class="divider"></div>
      
    </div>

    <div class="tableau pad">
      <MovementsHistory />
    </div>
  </div>
</template>

<script setup>
    
import MovementsHistory from "../components/MovementsHistory.vue";

</script>

<style scoped>

 .move-page {    
  padding: 0px 10px;
  background:#f6f8fb;
  min-height:100vh;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header figé */
 .move-header {
  position: sticky;
  top: 0;
  background: #f6f8fb; /* ou blanc selon ton thème */
  z-index: 100;
  padding-bottom: 8px;
}

/* Ligne retour + titre */
 .header-hist {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Retour */
 .back {
  display:inline-block;
  padding-top: 16px;
  margin-bottom: 0px;
  text-decoration:none;
  color:#e46f36;
  font-weight:700;
  white-space: nowrap;
}

/* Titre */
 .title{
  margin: 10px;
  font-size: 34px;
  font-weight:900;
  letter-spacing:-0.4px;
}

 .divider{ height:1px; background:#e5e7eb; }

 .tableau{ 
  padding: 15px 0px 0px;
  background:#fff;
  border:1px solid #eef2f7;
  border-radius:12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  display: flex;          /* CLÉ */
  flex-direction: column;
  height: 100%;           /* CLÉ */
}


@media (max-width: 980px){
  .move-page{ padding:14px; }
  .title{ font-size:30px; }

}

</style>
