<template>
  <div class="login-page">
    <HeaderBloc />

    <main class="login-main">
      <section class="login-card" aria-labelledby="login-title">
        <div class="badge">Pharmacie</div>
        <h1 id="login-title">Connexion</h1>
        <p class="subtitle">
          Connectez-vous pour acceder au suivi de la pharmacie.
        </p>

        <form class="login-form" @submit.prevent="submitLogin">
          <div class="field">
            <label for="username">Nom d'utilisateur</label>
            <input
              id="username"
              v-model.trim="form.username"
              type="text"
              autocomplete="username"
              placeholder="Votre identifiant"
              :disabled="loading"
              required
            />
          </div>

          <div class="field">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Votre mot de passe"
              :disabled="loading"
              required
            />
          </div>

          <label class="toggle-password">
            <input v-model="showPassword" type="checkbox" :disabled="loading" />
            <span>Afficher le mot de passe</span>
          </label>

          <p v-if="errorMessage" class="feedback error" role="alert">
            {{ errorMessage }}
          </p>
          <p v-else-if="successMessage" class="feedback success" role="status">
            {{ successMessage }}
          </p>

          <div class="actions">
            <button type="submit" class="btn primary" :disabled="loading">
              {{ loading ? "Connexion..." : "Se connecter" }}
            </button>
          </div>
        </form>
      </section>
    </main>

    <FooterNote />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import HeaderBloc from "../components/Header.vue";
import FooterNote from "../components/FooterNote.vue";
import api from "../services/api";

const router = useRouter();

const form = ref({
  username: "",
  password: "",
});

const loading = ref(false);
const showPassword = ref(false);
const errorMessage = ref("");
const isLoggedIn = ref(false);

const successMessage = computed(() =>
  isLoggedIn.value ? "Connexion reussie. Redirection..." : ""
);

async function submitLogin() {
  if (loading.value) return;

  errorMessage.value = "";

  if (!form.value.username || !form.value.password) {
    errorMessage.value = "Veuillez renseigner votre identifiant et votre mot de passe.";
    return;
  }

  loading.value = true;

  try {
    const { data } = await api.post("/api/auth/login", {
      username: form.value.username,
      password: form.value.password,
    });

    const role = String(data?.role || "")
      .trim()
      .toLowerCase();

    window.localStorage.setItem("pharmacie_access_token", data.access_token);
    window.localStorage.setItem("pharmacie_token_type", data.token_type || "bearer");
    window.localStorage.setItem("pharmacie_user_role", role);
    window.localStorage.setItem("pharmacie_username", form.value.username);
    window.dispatchEvent(new Event("pharmacie-auth-changed"));

    isLoggedIn.value = true;
    const redirectPath = role === "viewer" ? "/synthese" : "/accueil";

    window.setTimeout(() => {
      router.replace(redirectPath);
    }, 500);
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      "Connexion impossible. Verifiez le serveur et vos identifiants.";
    errorMessage.value = String(message);
    isLoggedIn.value = false;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #fff;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.login-main {
  width: min(1100px, 92%);
  margin: 0 auto;
  padding: 2px 0 10px;
}

.login-card {
  width: min(520px, 100%);
  margin: 0 auto;
  background: #fff;
  border: 1px solid rgba(59, 85, 99, 0.12);
  border-radius: 20px;
  box-shadow:
    0 20px 45px rgba(34, 52, 61, 0.14),
    0 4px 12px rgba(34, 52, 61, 0.08);
  padding: 20px 20px 18px;
}

.badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef5f8;
  color: #3b5563;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1 {
  margin: 12px 0 6px;
  color: #1f2e37;
  font-size: 34px;
  line-height: 1.05;
}

.subtitle {
  margin: 0 0 12px;
  color: #56656f;
  font-size: 15px;
}

.login-form {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field label {
  color: #31444f;
  font-size: 14px;
  font-weight: 700;
}

.field input {
  border: 1px solid #cfdae0;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 15px;
  color: #1f2e37;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field input:focus {
  outline: none;
  border-color: #3b5563;
  box-shadow: 0 0 0 3px rgba(59, 85, 99, 0.12);
}

.field input:disabled {
  background: #f5f7f8;
  cursor: not-allowed;
}

.toggle-password {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #56656f;
}

.toggle-password input {
  accent-color: #e46f36;
}

.feedback {
  margin: 0;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
}

.feedback.error {
  background: #fff1f1;
  color: #aa2e2e;
  border: 1px solid #f3c4c4;
}

.feedback.success {
  background: #ecf9ef;
  color: #1f7a38;
  border: 1px solid #bfe7c8;
}

.actions {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.12s ease;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.btn.primary {
  background: #e46f36;
  color: #fff;
  box-shadow: 0 10px 18px rgba(228, 111, 54, 0.24);
}

.btn:not(:disabled):hover {
  filter: brightness(0.99);
}

.btn:not(:disabled):active {
  transform: translateY(1px);
}

@media (max-width: 760px) {
  .login-main {
    padding-bottom: 20px;
  }

  .login-card {
    border-radius: 16px;
    padding: 20px 16px 18px;
  }

  h1 {
    font-size: 28px;
  }
}

.login-page :deep(.header) {
  padding: 6px 0 0;
  border-top-width: 3px;
}

.login-page :deep(.top-text) {
  font-size: 15px;
}

.login-page :deep(.top-text .muted) {
  margin-top: 4px;
}

.login-page :deep(.logos) {
  margin: 10px 0 6px;
}

.login-page :deep(.logo.etat) {
  height: 84px;
  width: 114px;
}

.login-page :deep(.logo.center) {
  height: 112px;
  width: 142px;
}

.login-page :deep(.logo.conseil) {
  height: 98px;
  width: 122px;
}

.login-page :deep(.title) {
  display: none;
}

.login-page :deep(.note) {
  margin: 6px 0 50px;
}
</style>
