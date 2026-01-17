<template>
  <header class="header">
    <div class="container">
      <div class="top-text">
        <div>REPUBLIQUE DE CÔTE D'IVOIRE</div>
        <div class="muted">----------------------</div>
        <div class="muted">Conseil Economique, Social, Environnemental et Culturel</div>
      </div>

      <div class="logos">
        <img src="/logos/logo-conseil.jpg" class="logo conseil" />
        <img src="/logos/logo-principal.png" class="logo center" />
        <img src="/logos/logo-droite.png" class="logo etat" />
      </div>

      <h1 class="title">SUIVI DE LA PHARMACIE</h1>
    </div>
  </header>
</template>

<style scoped>
.header {
  border-top: 4px solid #3b5563;
  padding: 10px 0;
  margin-bottom: 0px;
}

.container {
  width: min(1100px, 92%);
  margin: 0 auto;
}

.top-text {
  text-align: center;
  font-weight: 700;
  color: #6b6b6b;
}

.top-text .muted {
  margin-top: 6px;
}

.logos {
  margin: 20px 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.logo {
  justify-self: center;
}

.logo.etat {
  height: 110px;
  width: 150px;
}

.logo.center {
  height: 150px;
  width: 190px;
}

.logo.conseil {
  height: 130px;
  width: 160px;
}

.title {
  text-align: center;
  font-size: 48px;
  margin-bottom: 0px; /* réduit l’espace */
  font-family: "Arial Black", Arial, sans-serif;
}
</style>
