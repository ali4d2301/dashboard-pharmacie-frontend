import axios from "axios";

const SERVER_READY_EVENT = "pharmacie-server-warmup-changed";
const LAST_READY_STORAGE_KEY = "pharmacie_api_last_ready_at";

const RECENT_READY_WINDOW_MS = 90 * 1000;
const IDLE_WARMUP_THRESHOLD_MS = 15 * 60 * 1000;

const readyClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 45000,
});

function readStoredLastReadyAt() {
  if (typeof window === "undefined") return 0;
  const rawValue = Number(window.sessionStorage.getItem(LAST_READY_STORAGE_KEY) || 0);
  return Number.isFinite(rawValue) ? rawValue : 0;
}

function persistLastReadyAt(timestamp) {
  if (typeof window === "undefined") return;
  if (timestamp > 0) {
    window.sessionStorage.setItem(LAST_READY_STORAGE_KEY, String(timestamp));
    return;
  }
  window.sessionStorage.removeItem(LAST_READY_STORAGE_KEY);
}

const state = {
  status: "idle",
  lastReadyAt: readStoredLastReadyAt(),
  promise: null,
};

function emitWarmupState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SERVER_READY_EVENT, {
      detail: getServerWarmupState(),
    })
  );
}

function setStatus(nextStatus) {
  if (state.status === nextStatus) return;
  state.status = nextStatus;
  emitWarmupState();
}

export function getServerWarmupState() {
  return {
    status: state.status,
    isWarming: state.status === "warming",
    lastReadyAt: state.lastReadyAt,
  };
}

export function hasServerBeenIdleLongEnough(idleThresholdMs = IDLE_WARMUP_THRESHOLD_MS) {
  if (!state.lastReadyAt) return true;
  return Date.now() - state.lastReadyAt >= idleThresholdMs;
}

export function touchServerWarmup(timestamp = Date.now()) {
  state.lastReadyAt = timestamp;
  persistLastReadyAt(timestamp);
  setStatus("ready");
}

export async function ensureServerReady({ force = false, silent = false } = {}) {
  if (
    !force &&
    state.lastReadyAt > 0 &&
    Date.now() - state.lastReadyAt < RECENT_READY_WINDOW_MS
  ) {
    return true;
  }

  if (state.promise) {
    return state.promise;
  }

  if (!silent) {
    setStatus("warming");
  }

  state.promise = readyClient
    .get("/api/auth/ready")
    .then(() => {
      touchServerWarmup();
      return true;
    })
    .catch(() => {
      if (!silent) {
        setStatus("error");
      }
      return false;
    })
    .finally(() => {
      state.promise = null;
      emitWarmupState();
    });

  return state.promise;
}

export { IDLE_WARMUP_THRESHOLD_MS, SERVER_READY_EVENT };
