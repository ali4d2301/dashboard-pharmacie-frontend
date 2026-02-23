<template>
  <div class="page">
    <div
      v-if="showLogout"
      class="session-actions"
    >
      <span class="user-badge" :title="userDisplayName">
        {{ userDisplayName }}
      </span>
      <button
        type="button"
        class="logout-btn"
        @click="logout"
      >
        Deconnexion
      </button>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const AUTH_KEYS = [
  "pharmacie_access_token",
  "pharmacie_token_type",
  "pharmacie_user_role",
  "pharmacie_username",
]

function readSession() {
  return {
    token: window.localStorage.getItem("pharmacie_access_token") || "",
    username: (window.localStorage.getItem("pharmacie_username") || "").trim(),
  }
}

const session = ref(readSession())

function syncSession() {
  session.value = readSession()
}

watch(
  () => route.fullPath,
  () => {
    syncSession()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener("storage", syncSession)
  window.addEventListener("pharmacie-auth-changed", syncSession)
})

onBeforeUnmount(() => {
  window.removeEventListener("storage", syncSession)
  window.removeEventListener("pharmacie-auth-changed", syncSession)
})

const showLogout = computed(() => {
  return Boolean(session.value.token) && !route.meta?.public
})

const userDisplayName = computed(() => {
  return session.value.username || "Utilisateur"
})

function logout() {
  for (const key of AUTH_KEYS) {
    window.localStorage.removeItem(key)
  }
  syncSession()
  window.dispatchEvent(new Event("pharmacie-auth-changed"))
  router.push("/")
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #fff;
  font-family: Arial, sans-serif;
}

.session-actions {
  position: fixed;
  top: 14px;
  right: 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-badge {
  max-width: min(38vw, 220px);
  border: 1px solid #dbe6eb;
  background: #f6fafc;
  color: #35515f;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.logout-btn {
  border: 1px solid #d5e2e8;
  background: #ffffff;
  color: #35515f;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.logout-btn:hover {
  background: #f4f8fa;
}

.logout-btn:active {
  transform: translateY(1px);
}

@media (max-width: 760px) {
  .session-actions {
    top: 10px;
    right: 10px;
    gap: 6px;
  }

  .user-badge {
    max-width: 42vw;
    padding: 8px 10px;
    font-size: 13px;
  }

  .logout-btn {
    padding: 8px 10px;
    font-size: 13px;
  }
}
</style>
