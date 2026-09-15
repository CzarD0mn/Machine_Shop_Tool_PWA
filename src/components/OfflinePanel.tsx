import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import {
  getNetworkState,
  NetworkState,
  startNetworkMonitor,
  subscribeNetwork,
} from "../lib/network";
import {
  formatBytes,
  PwaStatus,
  readPwaStatus,
  registerBackgroundResume,
  registerShopServiceWorker,
  requestPersistentStorage,
  warmOfflineCache,
} from "../lib/pwa";
import { enqueueRemoteBackup } from "../lib/remote-sync";
import {
  readSyncApiStatus,
  SyncApiStatus,
} from "../lib/sync-queue";

interface OfflinePanelProps {
  operationCount: number;
  programCount: number;
}

const CAPABILITIES = [
  {
    title: "Speeds & feeds",
    detail: "All 15 materials, mill / drill / turn math, inch and metric.",
  },
  {
    title: "Operation log",
    detail: "Tickets, time stamps, and hours stay on this device.",
  },
  {
    title: "Program log",
    detail: "CNC program records and part-time averages from the op log.",
  },
  {
    title: "Backups & export",
    detail: "Encrypted .mhb / zip, CSV, and JSON — no network required.",
  },
  {
    title: "Background Sync",
    detail: "Queued remote backups flush when the radio comes back — even if this tab is closed.",
  },
];

function swLabel(status: PwaStatus): { text: string; tone: "ok" | "warn" | "off" } {
  if (status.swState === "unsupported") {
    return { text: "Not supported on this browser", tone: "off" };
  }
  if (status.swState === "active" || status.cachedCount > 0) {
    return { text: "Offline package ready", tone: "ok" };
  }
  if (status.swState === "waiting" || status.swState === "registering") {
    return { text: "Packing the shop cache…", tone: "warn" };
  }
  if (status.swState === "error") {
    return { text: status.error || "Cache failed", tone: "off" };
  }
  return { text: "Browser tab only", tone: "warn" };
}

export function OfflinePanel({
  operationCount,
  programCount,
}: OfflinePanelProps) {
  const [status, setStatus] = useState<PwaStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncApiStatus | null>(null);
  const [netState, setNetState] = useState<NetworkState>(() => getNetworkState());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    const registration =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration("/")
        : null;
    const next = await readPwaStatus(registration ?? null);
    setStatus(next);
    setSyncStatus(await readSyncApiStatus(registration ?? null));
    return next;
  }, []);

  useEffect(() => {
    startNetworkMonitor();
    void refresh();
    const stop = subscribeNetwork((next) => {
      setNetState(next);
      void refresh();
    });
    return stop;
  }, [refresh]);

  const handleWarm = async () => {
    setBusy(true);
    setNote("");
    try {
      let registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.getRegistration("/")
          : null;
      if (!registration) {
        registration = await registerShopServiceWorker();
      }
      await navigator.serviceWorker?.ready;
      const reply = await warmOfflineCache();
      const next = await refresh();
      const count = reply?.cached ?? next.cachedCount;
      setNote(
        count
          ? `Shop cache packed · ${count} files on this device`
          : "Cache armed. Open Calc once while online, then this phone will run on the floor with no signal.",
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not pack the cache");
    } finally {
      setBusy(false);
    }
  };

  const handleArmSync = async () => {
    setBusy(true);
    setNote("");
    try {
      const registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.ready.catch(() => null)
          : null;
      const result = await registerBackgroundResume(registration);
      const queued = await enqueueRemoteBackup({ force: true });
      await refresh();
      if (!result.supported) {
        setNote(
          "This browser has no Background Sync. Keep the app open and it will still resume on reconnect.",
        );
      } else if (queued) {
        setNote(
          `Sync armed · tags ${result.registered.join(", ") || "shop-resume"}. Queue will flush when the device is online.`,
        );
      } else {
        setNote(
          `Sync armed · ${result.registered.join(", ") || "ready"}. Set Remote Push to queue a backup job.`,
        );
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not arm sync");
    } finally {
      setBusy(false);
    }
  };

  const handlePersist = async () => {
    setBusy(true);
    setNote("");
    try {
      const ok = await requestPersistentStorage();
      await refresh();
      setNote(
        ok
          ? "Logs are pinned on this device — the OS will not evict them for space."
          : "Browser kept the default quota. Install to the home screen for stronger pinning.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sw = status ? swLabel(status) : { text: "Checking…", tone: "warn" as const };
  const usage = status
    ? `${formatBytes(status.usageBytes)} used${
        status.quotaBytes ? ` of ${formatBytes(status.quotaBytes)}` : ""
      }`
    : "Measuring storage…";

  return (
    <section className="space-y-4 rounded-xl border border-[#B7C9B8] bg-white p-5 shadow-xs">
      <div>
        <h3 className="text-sm font-bold tracking-wider text-[#2E7D32] uppercase">
          Shop Offline
        </h3>
        <p className="mt-0.5 text-xs text-[#4A5B4B]">
          Built for cells with dead Wi-Fi. Calculator, logs, and backups stay on
          this device. When signal returns, network services resume in the
          background — no tap required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatusChip
          icon={netState === "offline" ? WifiOff : Wifi}
          label={
            netState === "online"
              ? "Online"
              : netState === "checking"
                ? "Reconnecting"
                : "Offline"
          }
          detail={
            netState === "online"
              ? "Reachable — cache and remote push run in the background"
              : netState === "checking"
                ? "Probing for a shop network…"
                : "No network — using on-device data. Push queues until signal returns."
          }
          tone={netState === "online" ? "ok" : netState === "checking" ? "warn" : "warn"}
        />
        <StatusChip
          icon={HardDrive}
          label={sw.text}
          detail={
            status?.cachedCount
              ? `${status.cachedCount} files cached`
              : "Pack the cache before the first floor walk"
          }
          tone={sw.tone}
        />
        <StatusChip
          icon={Smartphone}
          label={status?.standalone ? "Home screen" : "Browser tab"}
          detail={
            status?.standalone
              ? "Running as an installed shop app"
              : "Add to Home Screen for a full-screen cell tool"
          }
          tone={status?.standalone ? "ok" : "off"}
        />
      </div>

      <ul className="space-y-2">
        {CAPABILITIES.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-2.5 text-xs text-[#1B2E1C]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
            <span>
              <span className="font-semibold">{item.title}.</span> {item.detail}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-[#D7E6D8] bg-[#F7FBF7] p-3 text-xs text-[#1B2E1C]">
        <div className="flex items-center gap-2 font-semibold">
          <Wrench className="h-3.5 w-3.5 text-[#2E7D32]" />
          On this device
        </div>
        <p className="mt-1 text-[#4A5B4B]">
          {operationCount} operation {operationCount === 1 ? "ticket" : "tickets"} ·{" "}
          {programCount} program {programCount === 1 ? "record" : "records"} · {usage}
        </p>
        <p className="mt-1 text-[#4A5B4B]">
          Remote Nextcloud / WebDAV push is queued into Background Sync. The
          service worker sends it when the device is online again — even if this
          tab is closed. FTPS still needs a desktop client.
        </p>
      </div>

      <div className="rounded-lg border border-[#D7E6D8] bg-[#F7FBF7] p-3 text-xs text-[#1B2E1C]">
        <div className="flex items-center gap-2 font-semibold">
          <Repeat className="h-3.5 w-3.5 text-[#2E7D32]" />
          Service Worker Sync
        </div>
        <p className="mt-1 text-[#4A5B4B]">
          {syncStatus?.backgroundSync
            ? "Background Sync is available on this browser."
            : "Background Sync is not available here. Reconnect-while-open still works."}
          {syncStatus?.periodicSync
            ? " Periodic Sync is available for Daily / Weekly."
            : " Periodic Sync needs an installed home-screen app in a supporting browser."}
        </p>
        <p className="mt-1 text-[#4A5B4B]">
          {syncStatus?.pendingJobs
            ? `${syncStatus.pendingJobs} backup ${syncStatus.pendingJobs === 1 ? "job" : "jobs"} waiting`
            : "No backup jobs waiting"}
          {syncStatus?.tags?.length ? ` · armed: ${syncStatus.tags.join(", ")}` : ""}
          {syncStatus?.lastOk
            ? ` · last ok ${new Date(syncStatus.lastOk).toLocaleTimeString()}`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleWarm()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#2E7D32] px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1B5E20] disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Pack offline cache
        </button>
        <button
          type="button"
          onClick={() => void handlePersist()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#B7C9B8] bg-white px-3 py-2 text-xs font-semibold text-[#2E7D32] hover:bg-[#E8F5E9] disabled:opacity-60"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Pin logs on this device
        </button>
        <button
          type="button"
          onClick={() => void handleArmSync()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#B7C9B8] bg-white px-3 py-2 text-xs font-semibold text-[#2E7D32] hover:bg-[#E8F5E9] disabled:opacity-60"
        >
          <Repeat className="h-3.5 w-3.5" />
          Arm background sync
        </button>
      </div>

      {note && (
        <p className="text-xs font-semibold text-[#1B5E20]">{note}</p>
      )}
    </section>
  );
}

function StatusChip({
  icon: Icon,
  label,
  detail,
  tone,
}: {
  icon: typeof Wifi;
  label: string;
  detail: string;
  tone: "ok" | "warn" | "off";
}) {
  const toneClass =
    tone === "ok"
      ? "border-[#2E7D32] bg-[#E8F5E9]"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50"
        : "border-[#D7E6D8] bg-[#F7FBF7]";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B2E1C]">
        <Icon className="h-3.5 w-3.5 text-[#2E7D32]" />
        {label}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-[#4A5B4B]">{detail}</p>
    </div>
  );
}
