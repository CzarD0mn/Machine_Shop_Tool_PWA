export type NetworkState = "online" | "offline" | "checking";

type Listener = (state: NetworkState, previous: NetworkState) => void;

const listeners = new Set<Listener>();

let started = false;
let state: NetworkState = "checking";
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let consecutiveFails = 0;

function isBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function emit(next: NetworkState) {
  if (next === state) return;
  const previous = state;
  state = next;
  for (const listener of listeners) listener(next, previous);
  window.dispatchEvent(
    new CustomEvent("shop-network", { detail: { state: next, previous } }),
  );
}

async function probeOnce(): Promise<boolean> {
  if (!isBrowser()) return false;
  if (navigator.onLine === false) return false;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  const bust = `alive=${Date.now()}`;
  try {
    const response = await fetch(`/sw.js?${bust}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    try {
      const response = await fetch(`/?${bust}`, {
        method: "HEAD",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      return response.ok || response.type === "opaqueredirect";
    } catch {
      return false;
    }
  } finally {
    window.clearTimeout(timer);
  }
}

function schedule(ms: number) {
  if (probeTimer) clearTimeout(probeTimer);
  probeTimer = setTimeout(() => {
    void tick();
  }, ms);
}

async function tick() {
  if (!started || inFlight) return;
  inFlight = true;
  try {
    const reachable = await probeOnce();
    if (reachable) {
      consecutiveFails = 0;
      emit("online");
      schedule(state === "online" ? 45000 : 8000);
    } else {
      consecutiveFails += 1;
      if (navigator.onLine === false || consecutiveFails >= 2) {
        emit("offline");
      } else if (state === "online") {
        emit("checking");
      }
      schedule(state === "offline" ? 8000 : 5000);
    }
  } finally {
    inFlight = false;
  }
}

export function getNetworkState(): NetworkState {
  return state;
}

export function isNetworkOnline(): boolean {
  return state === "online";
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  listener(state, state);
  return () => {
    listeners.delete(listener);
  };
}

export function startNetworkMonitor() {
  if (!isBrowser() || started) return;
  started = true;
  state = navigator.onLine ? "checking" : "offline";

  const kick = () => {
    consecutiveFails = 0;
    void tick();
  };

  window.addEventListener("online", kick);
  window.addEventListener("offline", () => {
    consecutiveFails = 2;
    emit("offline");
    schedule(8000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });

  const connection = (
    navigator as Navigator & {
      connection?: { addEventListener?: (type: string, fn: () => void) => void };
    }
  ).connection;
  connection?.addEventListener?.("change", kick);

  void tick();
}
