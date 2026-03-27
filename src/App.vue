<template>
  <div class="page">
    <div
      v-if="showServerWakeNotice"
      class="server-wake-banner"
      role="status"
      aria-live="polite"
    >
      Réveil du serveur...
    </div>
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
import { AUTH_CHANGED_EVENT, clearStoredAuth, getStoredAuth, notifyAuthChanged } from "./utils/auth"
import {
  ensureServerReady,
  getServerWarmupState,
  hasServerBeenIdleLongEnough,
  SERVER_READY_EVENT,
} from "./services/serverWarmup"

const route = useRoute()
const router = useRouter()

function readSession() {
  const { token } = getStoredAuth()
  return {
    token,
    username: (window.localStorage.getItem("pharmacie_username") || "").trim(),
  }
}

const session = ref(readSession())
const serverWarmup = ref(getServerWarmupState())

function syncSession() {
  session.value = readSession()
}

function syncServerWarmup(event) {
  serverWarmup.value = event?.detail ?? getServerWarmupState()
}

function warmUpServerIfNeeded({ silent = true } = {}) {
  if (!session.value.token || !hasServerBeenIdleLongEnough()) return
  void ensureServerReady({ silent })
}

function handleWindowFocus() {
  warmUpServerIfNeeded({ silent: true })
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    warmUpServerIfNeeded({ silent: true })
  }
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
  window.addEventListener(AUTH_CHANGED_EVENT, syncSession)
  window.addEventListener(SERVER_READY_EVENT, syncServerWarmup)
  window.addEventListener("focus", handleWindowFocus)
  document.addEventListener("visibilitychange", handleVisibilityChange)
  warmUpServerIfNeeded({ silent: true })
})

onBeforeUnmount(() => {
  window.removeEventListener("storage", syncSession)
  window.removeEventListener(AUTH_CHANGED_EVENT, syncSession)
  window.removeEventListener(SERVER_READY_EVENT, syncServerWarmup)
  window.removeEventListener("focus", handleWindowFocus)
  document.removeEventListener("visibilitychange", handleVisibilityChange)
})

const showLogout = computed(() => {
  return Boolean(session.value.token) && Boolean(route.meta?.showSessionActions)
})

const showServerWakeNotice = computed(() => {
  return Boolean(session.value.token) && serverWarmup.value.isWarming
})

const userDisplayName = computed(() => {
  return session.value.username || "Utilisateur"
})

function logout() {
  clearStoredAuth()
  syncSession()
  notifyAuthChanged()
  router.push("/")
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #fff;
  font-family: Arial, sans-serif;
}

.server-wake-banner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  border: 1px solid rgba(228, 111, 54, 0.28);
  background: rgba(255, 248, 242, 0.96);
  color: #a65428;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(228, 111, 54, 0.12);
  backdrop-filter: blur(8px);
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
  .server-wake-banner {
    top: 10px;
    max-width: calc(100vw - 110px);
    padding: 7px 12px;
    font-size: 11px;
  }

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
