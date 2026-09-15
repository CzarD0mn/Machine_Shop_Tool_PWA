/* Machinist Helper — shop-floor offline cache. Does not own the web manifest. */
const CACHE_NAME = "machinist-helper-offline-v1";

const PRECACHE_URLS = [
  "/",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
];

let preferNetwork = true;

function isDevPreview() {
  return self.location.port === "8080" || self.location.port === "3000";
}

function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  if (url.pathname.startsWith("/@")) return true;
  if (url.pathname.startsWith("/src/")) return true;
  if (url.pathname.includes("node_modules")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.hostname === "grok.com" || url.hostname.endsWith(".grok.com")) return true;
  if (url.searchParams.has("install")) return true;
  if (url.searchParams.has("alive")) return true;
  return false;
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/assets/")) return true;
  return /\.(?:js|css|woff2?|ttf|png|svg|ico|webp|jpg|jpeg|gif)$/i.test(url.pathname);
}

function isFontCdn(url) {
  return (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  );
}

async function putOk(cache, request, response) {
  if (!response || !response.ok) return response;
  try {
    await cache.put(request, response.clone());
  } catch {
    /* quota / opaque */
  }
  return response;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request, { ignoreSearch: false });
  if (hit) return hit;
  const response = await fetch(request);
  return putOk(cache, request, response);
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    await putOk(cache, request, response);
    return response;
  } catch (err) {
    const hit =
      (await cache.match(request)) ||
      (fallbackUrl ? await cache.match(fallbackUrl) : undefined);
    if (hit) return hit;
    throw err;
  }
}

async function addAllSettled(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
          cache: "reload",
        });
        if (response.ok) await cache.put(url, response);
      } catch {
        /* skip missing */
      }
    }),
  );
}

async function revalidateCached() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, 48).map(async (request) => {
      try {
        const response = await fetch(request, { cache: "reload" });
        if (response.ok) await cache.put(request, response);
      } catch {
        /* still offline for this URL */
      }
    }),
  );
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of windows) {
    client.postMessage(message);
  }
}

async function notifyClientsResume() {
  await notifyClients({ type: "RESUME_NETWORK" });
}

const SYNC_DB = "machinist-helper-sync";
const SYNC_DB_VERSION = 1;

function openSyncDb() {
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

function idbReq(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function flushSyncJobs() {
  const db = await openSyncDb();
  try {
    const jobs = await idbReq(db.transaction("jobs").objectStore("jobs").getAll());
    if (!jobs.length) return { flushed: 0, pending: 0 };

    let flushed = 0;
    let retry = false;
    for (const job of jobs) {
      try {
        const response = await fetch(job.url, {
          method: "PUT",
          headers: {
            Authorization: job.authorization,
            "Content-Type": job.contentType || "application/octet-stream",
          },
          body: job.body,
        });
        if (!response.ok) {
          throw new Error(`Remote ${response.status}`);
        }
        await idbReq(db.transaction("jobs", "readwrite").objectStore("jobs").delete(job.id));
        flushed += 1;
      } catch (error) {
        job.attempts = (job.attempts || 0) + 1;
        if (job.attempts >= 5) {
          await idbReq(db.transaction("jobs", "readwrite").objectStore("jobs").delete(job.id));
          await idbReq(
            db.transaction("meta", "readwrite").objectStore("meta").put({
              key: "lastError",
              value: error instanceof Error ? error.message : "Sync failed",
            }),
          );
        } else {
          await idbReq(db.transaction("jobs", "readwrite").objectStore("jobs").put(job));
          retry = true;
        }
      }
    }

    if (flushed) {
      await idbReq(
        db.transaction("meta", "readwrite").objectStore("meta").put({
          key: "lastOk",
          value: Date.now(),
        }),
      );
      await idbReq(
        db.transaction("meta", "readwrite").objectStore("meta").put({
          key: "lastError",
          value: null,
        }),
      );
    }

    if (retry) {
      throw new Error("shop-sync-retry");
    }
    return { flushed, pending: jobs.length - flushed };
  } finally {
    db.close();
  }
}

async function readJobCount() {
  try {
    const db = await openSyncDb();
    try {
      const jobs = await idbReq(db.transaction("jobs").objectStore("jobs").getAll());
      return jobs.length;
    } finally {
      db.close();
    }
  } catch {
    return 0;
  }
}

async function runShopSync(tag) {
  preferNetwork = true;
  await revalidateCached();
  const result = await flushSyncJobs();
  await notifyClients({
    type: "SYNC_DONE",
    tag,
    flushed: result.flushed,
  });
  await notifyClientsResume();
  return result;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await addAllSettled(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypass(request, url)) return;

  const accept = request.headers.get("accept") || "";
  const isNavigate =
    request.mode === "navigate" || accept.includes("text/html");

  if (isNavigate) {
    if (isDevPreview()) return;
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (isStaticAsset(url) || isFontCdn(url)) {
    if (preferNetwork) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const hit = await cache.match(request);
          const refreshing = fetch(request)
            .then((response) => putOk(cache, request, response))
            .catch(() => null);
          if (hit) {
            event.waitUntil(refreshing);
            return hit;
          }
          const fresh = await refreshing;
          if (fresh) return fresh;
          throw new Error("offline and uncached");
        })(),
      );
      return;
    }
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "NETWORK_STATE") {
    preferNetwork = Boolean(data.online);
    event.waitUntil(
      (async () => {
        if (preferNetwork) await revalidateCached();
        port?.postMessage({
          type: "NETWORK_ACK",
          online: preferNetwork,
        });
      })(),
    );
    return;
  }

  if (data.type === "PRECACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      addAllSettled(data.urls).then(async () => {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        port?.postMessage({
          type: "PRECACHE_DONE",
          version: CACHE_NAME,
          cached: keys.length,
        });
      }),
    );
    return;
  }

  if (data.type === "GET_STATUS") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        port?.postMessage({
          type: "STATUS",
          version: CACHE_NAME,
          cached: keys.map((req) => req.url),
          preferNetwork,
          pendingJobs: await readJobCount(),
        });
      })(),
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "shop-resume" && event.tag !== "shop-backup") return;
  event.waitUntil(runShopSync(event.tag));
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "shop-periodic") return;
  event.waitUntil(runShopSync(event.tag));
});
