import {
  BackupInterval,
  OperationEntry,
  ProgramEntry,
  RemoteProtocol,
  RemoteTarget,
} from "../types";
import {
  BackupPrefs,
  createBackupZip,
  ErrorHistoryStore,
  OperationLogStore,
  ProgramLogStore,
  RemoteBackupPrefs,
} from "../data/storage";
import {
  clearSyncJob,
  putSyncJob,
  registerBackgroundSync,
  SYNC_TAG_BACKUP,
  writeSyncMeta,
} from "./sync-queue";

const QUEUE_KEY = "machinist_sync_queue";

export interface SyncQueue {
  remotePending: boolean;
  lastRemoteOk: number | null;
  lastRemoteError: string | null;
  lastAttempt: number | null;
}

function emptyQueue(): SyncQueue {
  return {
    remotePending: false,
    lastRemoteOk: null,
    lastRemoteError: null,
    lastAttempt: null,
  };
}

function canStore() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadSyncQueue(): SyncQueue {
  if (!canStore()) return emptyQueue();
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return emptyQueue();
    return { ...emptyQueue(), ...JSON.parse(raw) };
  } catch {
    return emptyQueue();
  }
}

function saveSyncQueue(patch: Partial<SyncQueue>): SyncQueue {
  const updated = { ...loadSyncQueue(), ...patch };
  if (canStore()) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }
  return updated;
}

export function markRemotePending() {
  return saveSyncQueue({ remotePending: true, lastAttempt: Date.now() });
}

function basicAuth(user: string, password: string) {
  const raw = `${user}:${password}`;
  const bytes = new TextEncoder().encode(raw);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `Basic ${btoa(bin)}`;
}

export function buildRemoteFileUrl(target: RemoteTarget, filename: string): string {
  const trimmed = target.host.trim();
  const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const url = new URL(withProto);
  if (target.port.trim()) url.port = target.port.trim();

  const folder = (target.remotePath || "MachinistHelper").replace(/^\/+|\/+$/g, "");
  const leaf = `${folder}/${filename}`;

  if (target.protocol === RemoteProtocol.NEXTCLOUD) {
    if (!url.pathname.includes("remote.php")) {
      const user = encodeURIComponent(target.user || "unknown");
      url.pathname = `/remote.php/dav/files/${user}/${leaf}`;
    } else {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/${leaf}`;
    }
  } else {
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${leaf}`;
  }
  return url.toString();
}

async function davPut(target: RemoteTarget, filename: string, blob: Blob) {
  const url = buildRemoteFileUrl(target, filename);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: basicAuth(target.user, target.password),
        "Content-Type": blob.type || "application/octet-stream",
      },
      body: blob,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Remote ${response.status} ${response.statusText}`.trim());
    }
  } finally {
    window.clearTimeout(timer);
  }
}

export async function testRemoteTarget(target: RemoteTarget): Promise<string> {
  if (!target.host.trim()) throw new Error("Enter a server URL first");
  if (target.protocol === RemoteProtocol.FTPS) {
    throw new Error("FTPS cannot run in the browser. Use Nextcloud or WebDAV for auto-resume.");
  }
  new URL(target.host.includes("://") ? target.host : `https://${target.host}`);
  const url = buildRemoteFileUrl(target, ".machinist-helper-probe");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { Authorization: basicAuth(target.user, target.password) },
      signal: controller.signal,
    });
    if (response.status === 404 || response.ok) {
      return `Reachable · ${new Date().toLocaleTimeString()}`;
    }
    throw new Error(`Login check ${response.status}`);
  } finally {
    window.clearTimeout(timer);
  }
}

function backupDue(interval: BackupInterval, lastBackupAt: number | null) {
  if (interval === BackupInterval.OFF) return false;
  if (!lastBackupAt) return true;
  const age = Date.now() - lastBackupAt;
  if (interval === BackupInterval.DAILY) return age >= 20 * 60 * 60 * 1000;
  if (interval === BackupInterval.WEEKLY) return age >= 6 * 24 * 60 * 60 * 1000;
  return false;
}

export async function flushNetworkServices(options?: {
  operations?: OperationEntry[];
  programs?: ProgramEntry[];
  forceRemote?: boolean;
}): Promise<{ pushed: boolean; reason: string }> {
  const operations = options?.operations ?? OperationLogStore.load();
  const programs = options?.programs ?? ProgramLogStore.load();
  const target = RemoteBackupPrefs.load();
  const prefs = BackupPrefs.load();
  const queue = loadSyncQueue();

  const shouldPush =
    Boolean(options?.forceRemote) ||
    queue.remotePending ||
    (target.enabled &&
      target.host.trim().length > 0 &&
      backupDue(prefs.interval, prefs.lastBackupAt ?? null));

  if (!shouldPush) {
    return { pushed: false, reason: "nothing pending" };
  }

  if (!target.host.trim()) {
    saveSyncQueue({
      remotePending: true,
      lastRemoteError: "Remote host is empty",
      lastAttempt: Date.now(),
    });
    return { pushed: false, reason: "no remote host" };
  }

  if (target.protocol === RemoteProtocol.FTPS) {
    const reason = "FTPS waits for a desktop client";
    saveSyncQueue({
      remotePending: true,
      lastRemoteError: reason,
      lastAttempt: Date.now(),
    });
    return { pushed: false, reason };
  }

  try {
    const { blob, filename } = await createBackupZip(
      operations,
      programs,
      prefs.password,
    );
    await davPut(target, filename, blob);
    await clearSyncJob("backup");
    await writeSyncMeta("lastOk", Date.now());
    await writeSyncMeta("lastError", null);
    const stamp = `Pushed ${filename} · ${new Date().toLocaleTimeString()}`;
    RemoteBackupPrefs.save({
      ...target,
      enabled: true,
      lastCheck: stamp,
    });
    BackupPrefs.save({ lastStatus: stamp, lastBackupAt: Date.now() });
    saveSyncQueue({
      remotePending: false,
      lastRemoteOk: Date.now(),
      lastRemoteError: null,
      lastAttempt: Date.now(),
    });
    return { pushed: true, reason: stamp };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Remote push failed";
    ErrorHistoryStore.record("remote", "HTTP", message);
    RemoteBackupPrefs.save({
      ...target,
      lastCheck: `Queued · ${message}`,
    });
    saveSyncQueue({
      remotePending: true,
      lastRemoteError: message,
      lastAttempt: Date.now(),
    });
    await enqueueRemoteBackup({
      operations,
      programs,
      force: true,
    });
    return { pushed: false, reason: message };
  }
}

let enqueueTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleRemoteBackupEnqueue() {
  if (enqueueTimer) clearTimeout(enqueueTimer);
  enqueueTimer = setTimeout(() => {
    void enqueueRemoteBackup();
  }, 1500);
}

export async function enqueueRemoteBackup(options?: {
  operations?: OperationEntry[];
  programs?: ProgramEntry[];
  force?: boolean;
}): Promise<boolean> {
  const target = RemoteBackupPrefs.load();
  if (!target.host.trim()) return false;
  if (!target.enabled && !options?.force) return false;
  if (target.protocol === RemoteProtocol.FTPS) return false;

  const operations = options?.operations ?? OperationLogStore.load();
  const programs = options?.programs ?? ProgramLogStore.load();
  const prefs = BackupPrefs.load();
  const { blob, filename } = await createBackupZip(
    operations,
    programs,
    prefs.password,
  );
  const body = await blob.arrayBuffer();
  await putSyncJob({
    id: "backup",
    tag: SYNC_TAG_BACKUP,
    url: buildRemoteFileUrl(target, filename),
    authorization: basicAuth(target.user, target.password),
    contentType: blob.type || "application/octet-stream",
    filename,
    body,
    queuedAt: Date.now(),
    attempts: 0,
  });
  markRemotePending();

  const registration =
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? await navigator.serviceWorker.ready.catch(() => null)
      : null;
  await registerBackgroundSync(registration);
  return true;
}
