import { useEffect } from "react";
import {
  isNetworkOnline,
  startNetworkMonitor,
  subscribeNetwork,
} from "../lib/network";
import {
  armPeriodicShopSync,
  notifyServiceWorkerOnline,
  registerBackgroundResume,
  registerShopServiceWorker,
  requestPersistentStorage,
  warmOfflineCache,
} from "../lib/pwa";
import {
  enqueueRemoteBackup,
  flushNetworkServices,
  markRemotePending,
} from "../lib/remote-sync";
import { BackupPrefs, RemoteBackupPrefs } from "../data/storage";
import { writeSyncMeta } from "../lib/sync-queue";

let resumeLock = false;

async function resumeNetworkServices() {
  if (resumeLock) return;
  resumeLock = true;
  try {
    await notifyServiceWorkerOnline(true);
    await warmOfflineCache();
    await flushNetworkServices();
  } finally {
    resumeLock = false;
  }
}

export function PwaRuntime() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;

    startNetworkMonitor();

    async function boot() {
      if ("serviceWorker" in navigator) {
        registration = await registerShopServiceWorker();
        if (cancelled) return;
        await requestPersistentStorage();
        if (cancelled) return;
        try {
          await navigator.serviceWorker.ready;
        } catch {
          return;
        }
        if (cancelled) return;
        if (navigator.serviceWorker.controller) {
          await warmOfflineCache();
        } else if (registration) {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
              void warmOfflineCache();
            },
            { once: true },
          );
        }
        await registerBackgroundResume(registration);
        await armPeriodicShopSync(registration, BackupPrefs.load().interval);
      }

      if (isNetworkOnline()) {
        await resumeNetworkServices();
      } else {
        const target = RemoteBackupPrefs.load();
        if (target.enabled && target.host.trim()) {
          markRemotePending();
          await enqueueRemoteBackup();
        }
        await registerBackgroundResume(registration);
      }
    }

    const stopNetwork = subscribeNetwork((next, previous) => {
      if (cancelled) return;
      if (next === "offline") {
        const target = RemoteBackupPrefs.load();
        if (target.enabled && target.host.trim()) {
          markRemotePending();
          void enqueueRemoteBackup();
        }
        void notifyServiceWorkerOnline(false);
        void registerBackgroundResume(registration);
        return;
      }
      if (next === "online" && previous !== "online") {
        void resumeNetworkServices();
      }
    });

    const onSwMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (type === "RESUME_NETWORK") {
        void resumeNetworkServices();
      }
      if (type === "SYNC_DONE") {
        const flushed = Number(event.data?.flushed || 0);
        if (flushed > 0) {
          const stamp = `Background sync · ${new Date().toLocaleTimeString()}`;
          const target = RemoteBackupPrefs.load();
          RemoteBackupPrefs.save({ ...target, lastCheck: stamp });
          BackupPrefs.save({ lastStatus: stamp, lastBackupAt: Date.now() });
          void writeSyncMeta("lastOk", Date.now());
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    void boot();

    return () => {
      cancelled = true;
      stopNetwork();
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);

  return null;
}
