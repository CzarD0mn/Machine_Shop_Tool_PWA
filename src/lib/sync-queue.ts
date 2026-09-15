export const SYNC_DB = "machinist-helper-sync";
export const SYNC_DB_VERSION = 1;
export const SYNC_TAG_RESUME = "shop-resume";
export const SYNC_TAG_BACKUP = "shop-backup";
export const SYNC_TAG_PERIODIC = "shop-periodic";

export interface SyncJob {
  id: string;
  tag: string;
  url: string;
  authorization: string;
  contentType: string;
  filename: string;
  body: ArrayBuffer;
  queuedAt: number;
  attempts: number;
}

export interface SyncApiStatus {
  backgroundSync: boolean;
  periodicSync: boolean;
  pendingJobs: number;
  lastQueued: number | null;
  lastOk: number | null;
  lastError: string | null;
  tags: string[];
  periodicTags: string[];
}

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openSyncDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB, SYNC_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("jobs")) {
        db.createObjectStore("jobs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putSyncJob(job: SyncJob) {
  const db = await openSyncDb();
  try {
    const tx = db.transaction(["jobs", "meta"], "readwrite");
    tx.objectStore("jobs").put(job);
    tx.objectStore("meta").put({ key: "lastQueued", value: job.queuedAt });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listSyncJobs(): Promise<SyncJob[]> {
  if (!isBrowser()) return [];
  const db = await openSyncDb();
  try {
    return await idbRequest(db.transaction("jobs").objectStore("jobs").getAll());
  } finally {
    db.close();
  }
}

export async function clearSyncJob(id: string) {
  const db = await openSyncDb();
  try {
    await idbRequest(db.transaction("jobs", "readwrite").objectStore("jobs").delete(id));
  } finally {
    db.close();
  }
}

async function readMeta(key: string): Promise<number | string | null> {
  if (!isBrowser()) return null;
  const db = await openSyncDb();
  try {
    const row = await idbRequest<{ key: string; value: number | string } | undefined>(
      db.transaction("meta").objectStore("meta").get(key),
    );
    return row?.value ?? null;
  } finally {
    db.close();
  }
}

export async function writeSyncMeta(key: string, value: number | string | null) {
  const db = await openSyncDb();
  try {
    await idbRequest(
      db.transaction("meta", "readwrite").objectStore("meta").put({ key, value }),
    );
  } finally {
    db.close();
  }
}

type SyncManagerLike = {
  register: (tag: string) => Promise<void>;
  getTags?: () => Promise<string[]>;
};

type PeriodicSyncManagerLike = {
  register: (tag: string, options?: { minInterval?: number }) => Promise<void>;
  getTags?: () => Promise<string[]>;
  unregister?: (tag: string) => Promise<void>;
};

function syncManager(registration: ServiceWorkerRegistration | null) {
  return (registration as ServiceWorkerRegistration & { sync?: SyncManagerLike })
    ?.sync;
}

function periodicManager(registration: ServiceWorkerRegistration | null) {
  return (
    registration as ServiceWorkerRegistration & {
      periodicSync?: PeriodicSyncManagerLike;
    }
  )?.periodicSync;
}

export function backgroundSyncSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "SyncManager" in window
  );
}

export async function registerBackgroundSync(
  registration: ServiceWorkerRegistration | null,
  tags: string[] = [SYNC_TAG_RESUME, SYNC_TAG_BACKUP],
): Promise<{ supported: boolean; registered: string[] }> {
  const sync = syncManager(registration);
  if (!sync) return { supported: false, registered: [] };
  const registered: string[] = [];
  for (const tag of tags) {
    try {
      await sync.register(tag);
      registered.push(tag);
    } catch {
      /* permission / private mode */
    }
  }
  return { supported: true, registered };
}

export async function registerPeriodicBackup(
  registration: ServiceWorkerRegistration | null,
  interval: "OFF" | "DAILY" | "WEEKLY",
): Promise<boolean> {
  const periodic = periodicManager(registration);
  if (!periodic) return false;
  try {
    if (interval === "OFF") {
      await periodic.unregister?.(SYNC_TAG_PERIODIC);
      return false;
    }
    const minInterval =
      interval === "WEEKLY"
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    await periodic.register(SYNC_TAG_PERIODIC, { minInterval });
    return true;
  } catch {
    return false;
  }
}

export async function readSyncApiStatus(
  registration: ServiceWorkerRegistration | null,
): Promise<SyncApiStatus> {
  const jobs = isBrowser() ? await listSyncJobs() : [];
  const lastQueued = isBrowser() ? ((await readMeta("lastQueued")) as number | null) : null;
  const lastOk = isBrowser() ? ((await readMeta("lastOk")) as number | null) : null;
  const lastError = isBrowser() ? ((await readMeta("lastError")) as string | null) : null;
  let tags: string[] = [];
  let periodicTags: string[] = [];
  let syncEnabled = backgroundSyncSupported();
  try {
    tags = (await syncManager(registration)?.getTags?.()) ?? [];
  } catch {
    tags = [];
    syncEnabled = false;
  }
  try {
    periodicTags = (await periodicManager(registration)?.getTags?.()) ?? [];
  } catch {
    periodicTags = [];
  }
  return {
    backgroundSync: syncEnabled,
    periodicSync: Boolean(periodicManager(registration)),
    pendingJobs: jobs.length,
    lastQueued,
    lastOk,
    lastError,
    tags,
    periodicTags,
  };
}
