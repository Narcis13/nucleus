// CorePro service worker.
//
// Responsibilities:
//   1. Web Push — show notifications; focus/open the right tab on click.
//   2. Offline — precache the offline fallback and runtime-cache static
//      assets / GET API responses so the app opens when the network is flaky.
//   3. Background Sync — queue POSTs the client made while offline (via an
//      opt-in `sw-queue: true` header) and replay them when connectivity
//      returns. Messages are the primary consumer (see
//      components/dashboard/messages/composer.tsx).
//
// Kept as plain ES2018 so it runs in every evergreen browser without a
// build step. Bump CACHE_VERSION whenever cache shape changes so old
// caches get evicted on activate.

const CACHE_VERSION = "v1"
const STATIC_CACHE = `corepro-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `corepro-runtime-${CACHE_VERSION}`
const API_CACHE = `corepro-api-${CACHE_VERSION}`
const IMAGE_CACHE = `corepro-images-${CACHE_VERSION}`
const OFFLINE_URL = "/offline"
const QUEUE_DB = "corepro-outbox"
const QUEUE_STORE = "requests"
const SYNC_TAG = "corepro-outbox-sync"

const PRECACHE_URLS = [OFFLINE_URL, "/favicon.ico", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // `addAll` is atomic — one 404 aborts the install. Use individual
      // `add`s so a missing icon doesn't break the whole SW.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => undefined),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter(
            (n) =>
              n.startsWith("corepro-") &&
              ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE].includes(n),
          )
          .map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

// ── Fetch routing ────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") {
    // Non-GETs with `sw-queue: true` are candidates for background sync
    // when the network is down. POSTs without that header fall through
    // to the network untouched.
    if (req.headers.get("sw-queue") === "true") {
      event.respondWith(queueableFetch(req))
    }
    return
  }

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Document requests → network-first with an offline fallback. We can't
  // cache HTML aggressively because Next.js responses depend on the
  // signed-in user; stale-while-revalidate would flash the wrong user's
  // shell on login.
  if (req.mode === "navigate") {
    event.respondWith(handleNavigate(req))
    return
  }

  // Next build output + static assets are content-hashed → cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE))
    return
  }

  // Images → cache-first with a separate bucket so we can cap size later
  // by eviction; Next/Image outputs under `/_next/image`.
  if (url.pathname.startsWith("/_next/image") || /\.(png|jpg|jpeg|webp|avif|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE))
    return
  }

  // Cacheable API reads — only those the server opts in to with
  // `x-sw-cache: true`. We always hit the network first and serve from
  // cache only when offline. This keeps dashboards fresh while letting
  // the app open with *something* when disconnected.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(apiNetworkFirst(req))
    return
  }

  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE))
})

async function handleNavigate(request) {
  try {
    const res = await fetch(request)
    return res
  } catch {
    const cache = await caches.open(STATIC_CACHE)
    const fallback = await cache.match(OFFLINE_URL)
    return fallback || new Response("Offline", { status: 503 })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    if (hit) return hit
    throw err
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || network
}

async function apiNetworkFirst(request) {
  const cache = await caches.open(API_CACHE)
  try {
    const res = await fetch(request)
    // Only cache successful, explicitly-marked-cacheable responses.
    if (res.ok && res.headers.get("x-sw-cache") === "true") {
      cache.put(request, res.clone())
    }
    return res
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

// ── Background sync outbox ───────────────────────────────────────────────────
//
// The client opts a POST in by setting `sw-queue: true`. We try the network
// once; if it fails we persist the request in IndexedDB and register a
// `sync` event. The browser fires the event when connectivity returns.
// Clients can also post {type: "sync-outbox"} to flush manually (useful on
// iOS which does not implement the Background Sync API).

async function queueableFetch(request) {
  try {
    return await fetch(request.clone())
  } catch {
    try {
      await enqueueRequest(request)
      if ("sync" in self.registration) {
        try {
          await self.registration.sync.register(SYNC_TAG)
        } catch {
          // Registration is best-effort; clients can still trigger a flush.
        }
      }
      return new Response(
        JSON.stringify({ queued: true }),
        {
          status: 202,
          headers: { "Content-Type": "application/json", "sw-queued": "true" },
        },
      )
    } catch {
      return new Response(JSON.stringify({ error: "queue-failed" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushOutbox())
  }
})

self.addEventListener("message", (event) => {
  const data = event.data || {}
  if (data.type === "sync-outbox") {
    event.waitUntil(flushOutbox())
  } else if (data.type === "skip-waiting") {
    self.skipWaiting()
  }
})

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, {
        keyPath: "id",
        autoIncrement: true,
      })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function enqueueRequest(request) {
  const body = await request.clone().arrayBuffer()
  const entry = {
    url: request.url,
    method: request.method,
    headers: [...request.headers].filter(([k]) => k.toLowerCase() !== "sw-queue"),
    body: body.byteLength > 0 ? body : null,
    createdAt: Date.now(),
  }
  const db = await openQueueDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite")
    tx.objectStore(QUEUE_STORE).add(entry)
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  await broadcast({ type: "outbox-queued", url: entry.url })
}

async function flushOutbox() {
  const db = await openQueueDb()
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly")
    const req = tx.objectStore(QUEUE_STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })

  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body ? entry.body : undefined,
        credentials: "include",
      })
      if (res.ok) {
        await deleteEntry(db, entry.id)
        await broadcast({ type: "outbox-flushed", url: entry.url })
      } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        // 4xx other than timeout/rate-limit → the request is bad; drop it
        // so we don't retry forever. Broadcast so the UI can surface it.
        await deleteEntry(db, entry.id)
        await broadcast({ type: "outbox-failed", url: entry.url, status: res.status })
      }
    } catch {
      // Still offline — leave the entry in place; the next sync will retry.
    }
  }
  db.close()
}

function deleteEntry(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite")
    tx.objectStore(QUEUE_STORE).delete(id)
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
}

async function broadcast(msg) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) client.postMessage(msg)
}

// ── Web Push (unchanged from the push-notifications session) ─────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Notification", body: "", url: "/", tag: undefined }
  if (event.data) {
    try {
      data = Object.assign({}, data, event.data.json())
    } catch {
      data.body = event.data.text()
    }
  }
  const options = {
    body: data.body,
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag,
    data: { url: data.url || "/" },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientsList) => {
        for (const client of clientsList) {
          if (new URL(client.url).origin === self.location.origin) {
            client.focus()
            if ("navigate" in client) {
              return client.navigate(targetUrl)
            }
            return undefined
          }
        }
        return self.clients.openWindow(targetUrl)
      },
    ),
  )
})
