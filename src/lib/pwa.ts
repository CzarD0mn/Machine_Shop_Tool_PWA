import {
  registerBackgroundSync,
  registerPeriodicBackup,
} from "./sync-queue";
import { BackupInterval } from "../types";

export type PwaSwState =
  | "unsupported"
  | "registering"
  | "waiting"
  | "active"
  | "error";

export interface PwaStatus {
  online: boolean;
  swState: PwaSwState;
  controlling: boolean;
  standalone: boolean;
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
  cachedCount: number;
  cacheVersion: string | null;
  error?: string;
}

const EMPTY_STATUS: PwaStatus = {
  online: true,
  swState: "unsupported",
  controlling: false,
  standalone: false,
  persisted: null,
  usageBytes: null,
  quotaBytes: null,
  cachedCount: 0,
  cacheVersion: null,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

export function readStandalone(): boolean {
  if (!isBrowser()) return false;
  const media = window.matchMedia?.("(display-mode: standalone)");
  if (media?.matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export async function estimateStorage(): Promise<{
  usageBytes: number | null;
  quotaBytes: number | null;
  persisted: boolean | null;
}> {
  if (!isBrowser() || !navigator.storage) {
    return { usageBytes: null, quotaBytes: null, persisted: null };
  }
  let persisted: boolean | null = null;
  try {
    persisted = await navigator.storage.persisted();
  } catch {
    persisted = null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usageBytes: typeof estimate.usage === "number" ? estimate.usage : null,
      quotaBytes: typeof estimate.quota === "number" ? estimate.quota : null,
      persisted,
    };
  } catch {
    return { usageBytes: null, quotaBytes: null, persisted };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!isBrowser() || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

function swMessage<T>(payload: object, timeoutMs = 2500): Promise<T | null> {
  return new Promise((resolve) => {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      resolve(null);
      return;
    }
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      resolve(event.data as T);
    };
    controller.postMessage(payload, [channel.port2]);
  });
}

export async function getCacheStatus(): Promise<{
  cachedCount: number;
  cacheVersion: string | null;
}> {
  const reply = await swMessage<{ type: string; cached?: string[]; version?: string }>(
    { type: "GET_STATUS" },
  );
  if (!reply) return { cachedCount: 0, cacheVersion: null };
  const cached = Array.isArray(reply.cached) ? reply.cached : [];
  return {
    cachedCount: cached.length,
    cacheVersion: reply.version ?? null,
  };
}

export function collectLoadedUrls(): string[] {
  if (!isBrowser()) return [];
  const urls = new Set<string>([location.href, location.origin + "/"]);
  for (const entry of performance.getEntriesByType("resource")) {
    const name = (entry as PerformanceResourceTiming).name;
    try {
      const url = new URL(name);
      if (
        url.origin === location.origin ||
        url.hostname === "fonts.googleapis.com" ||
        url.hostname === "fonts.gstatic.com"
      ) {
        urls.add(name);
      }
    } catch {
      /* skip */
    }
  }
  return [...urls];
}

export async function warmOfflineCache(urls = collectLoadedUrls()): Promise<{
  cached: number;
  version: string | null;
} | null> {
  const reply = await swMessage<{
    type: string;
    cached?: number;
    version?: string;
  }>({
    type: "PRECACHE_URLS",
    urls,
  }, 8000);
  if (!reply) return null;
  return {
    cached: typeof reply.cached === "number" ? reply.cached : 0,
    version: reply.version ?? null,
  };
}

export async function registerShopServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isBrowser() || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.warn("Shop offline cache failed to register", error);
    return null;
  }
}

export async function readPwaStatus(
  registration: ServiceWorkerRegistration | null,
): Promise<PwaStatus> {
  if (!isBrowser()) return { ...EMPTY_STATUS };

  const online = navigator.onLine;
  const standalone = readStandalone();
  const storage = await estimateStorage();

  if (!("serviceWorker" in navigator)) {
    return {
      ...EMPTY_STATUS,
      online,
      standalone,
      ...storage,
      swState: "unsupported",
    };
  }

  const controlling = Boolean(navigator.serviceWorker.controller);
  const cache = controlling
    ? await getCacheStatus()
    : { cachedCount: 0, cacheVersion: null };

  let swState: PwaSwState = "registering";
  if (registration?.active) swState = "active";
  else if (registration?.waiting) swState = "waiting";
  else if (registration?.installing) swState = "registering";
  else if (registration) swState = "registering";
  else swState = "registering";

  return {
    online,
    swState,
    controlling,
    standalone,
    persisted: storage.persisted,
    usageBytes: storage.usageBytes,
    quotaBytes: storage.quotaBytes,
    cachedCount: cache.cachedCount,
    cacheVersion: cache.cacheVersion,
  };
}

export function postToServiceWorker(payload: object, timeoutMs = 2500) {
  return swMessage(payload, timeoutMs);
}

export async function notifyServiceWorkerOnline(online: boolean) {
  await swMessage({ type: "NETWORK_STATE", online }, 4000);
}

export async function registerBackgroundResume(
  registration: ServiceWorkerRegistration | null,
) {
  return registerBackgroundSync(registration);
}

export async function armPeriodicShopSync(
  registration: ServiceWorkerRegistration | null,
  interval: BackupInterval,
) {
  return registerPeriodicBackup(registration, interval);
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
