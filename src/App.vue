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
  return Boolean(session.value.token) && Boolean(route.meta?.showSessionActions)
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
  top: 12px;
  right: 14px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
}

.user-badge {
  max-width: min(34vw, 180px);
  border: 1px solid #d6e0e8;
  background: rgba(248, 251, 253, 0.96);
  color: #456073;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 10px rgba(39, 59, 77, 0.08);
}

.logout-btn {
  border: 1px solid #d6e0e8;
  background: rgba(255, 255, 255, 0.96);
  color: #456073;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(39, 59, 77, 0.1);
}

.logout-btn:hover {
  background: #f7fafc;
}

.logout-btn:active {
  transform: translateY(1px);
}

@media (max-width: 760px) {
  .session-actions {
    top: 10px;
    right: 10px;
    gap: 5px;
  }

  .user-badge {
    max-width: 40vw;
    padding: 6px 9px;
    font-size: 11px;
  }

  .logout-btn {
    padding: 6px 9px;
    font-size: 11px;
  }
}
</style>
