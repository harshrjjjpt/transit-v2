/**
 * MetroFlow Service Worker
 * Strategy:
 *   App shell (JS/CSS/fonts)  → Cache-first  (fast load, long TTL)
 *   GTFS-RT API (/api/gtfs-rt) → Network-first, fall back to cache (max 30s stale)
 *   Static data pages          → Stale-while-revalidate
 *   Map tiles (CartoDB)        → Cache-first, 7 day TTL, max 500 tiles
 *   Everything else            → Network-first, fall back to offline page
 */

const SW_VERSION = 'v1.0.0'
const SHELL_CACHE    = `metroflow-shell-${SW_VERSION}`
const TILE_CACHE     = `metroflow-tiles-${SW_VERSION}`
const API_CACHE      = `metroflow-api-${SW_VERSION}`
const STATIC_CACHE   = `metroflow-static-${SW_VERSION}`
const ALL_CACHES     = [SHELL_CACHE, TILE_CACHE, API_CACHE, STATIC_CACHE]

// App shell — these are cached on install so the app loads instantly offline
const SHELL_URLS = [
  '/',
  '/live',
  '/route',
  '/map',
  '/fare',
  '/stations',
  '/offline',
  '/manifest.json',
]

// External resources to pre-cache
const EXTERNAL_SHELL = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap',
]

const MAX_TILE_ENTRIES = 500
const TILE_TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days
const API_STALE_SECONDS = 30                 // 30 seconds

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing', SW_VERSION)
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Cache shell URLs — ignore individual failures so install always succeeds
      const results = await Promise.allSettled([
        ...SHELL_URLS.map((url) => cache.add(url).catch(() => {})),
        ...EXTERNAL_SHELL.map((url) => cache.add(url).catch(() => {})),
      ])
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) console.log(`[SW] ${failed} shell URLs failed to cache (OK)`)
      console.log('[SW] Shell cached')
    }).then(() => self.skipWaiting())
  )
})

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', SW_VERSION)
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
      await self.clients.claim()
      console.log('[SW] Active and controlling')
    })
  )
})

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') return

  // ── Map tiles → Cache-first with expiry ─────────────────────────────────
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('tile.openstreetmap')) {
    event.respondWith(handleTile(request))
    return
  }

  // ── GTFS-RT API → Network-first, stale fallback ─────────────────────────
  if (url.pathname.startsWith('/api/gtfs-rt')) {
    event.respondWith(handleGtfsRt(request))
    return
  }

  // ── Other API routes → Network-only ────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}',
      { status: 503, headers: { 'Content-Type': 'application/json' } })))
    return
  }

  // ── CDN libs (Leaflet, D3) → Cache-first ────────────────────────────────
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(handleCdnLib(request))
    return
  }

  // ── Next.js static assets (_next/static) → Cache-first long TTL ─────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStatic(request))
    return
  }

  // ── Pages → Stale-while-revalidate ──────────────────────────────────────
  event.respondWith(handlePage(request))
})

// ── Strategy implementations ───────────────────────────────────────────────

async function handleTile(request) {
  const cache = await caches.open(TILE_CACHE)
  const cached = await cache.match(request)

  if (cached) {
    const dateHeader = cached.headers.get('sw-cached-at')
    if (dateHeader) {
      const age = (Date.now() - parseInt(dateHeader)) / 1000
      if (age < TILE_TTL_SECONDS) return cached
    } else {
      return cached // no date header, trust it
    }
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Enforce max tile count
      const keys = await cache.keys()
      if (keys.length >= MAX_TILE_ENTRIES) {
        // Delete oldest 50
        await Promise.all(keys.slice(0, 50).map((k) => cache.delete(k)))
      }

      // Clone and add cached-at timestamp
      const headers = new Headers(response.headers)
      headers.set('sw-cached-at', String(Date.now()))
      const body = await response.arrayBuffer()
      await cache.put(request, new Response(body, { status: response.status, headers }))
      return new Response(body, { status: response.status, headers: response.headers })
    }
    return response
  } catch {
    return cached || new Response('', { status: 503 })
  }
}

async function handleGtfsRt(request) {
  const cache = await caches.open(API_CACHE)

  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response.ok) {
      const clone = response.clone()
      const headers = new Headers(clone.headers)
      headers.set('sw-cached-at', String(Date.now()))
      const body = await clone.arrayBuffer()
      await cache.put(request, new Response(body, { status: clone.status, headers }))
    }
    return response
  } catch {
    // Network failed — serve stale if < 30s old
    const cached = await cache.match(request)
    if (cached) {
      const age = (Date.now() - parseInt(cached.headers.get('sw-cached-at') ?? '0')) / 1000
      if (age < API_STALE_SECONDS) {
        const body = await cached.json().catch(() => ({}))
        return new Response(JSON.stringify({ ...body, stale: true, offline: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'SW-STALE' },
        })
      }
    }
    return new Response(
      JSON.stringify({ error: 'offline', tripUpdates: [], vehicles: [], alerts: [], offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCdnLib(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function handlePage(request) {
  const cache = await caches.open(SHELL_CACHE)

  // Stale-while-revalidate
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  if (cached) {
    // Update cache in background, serve stale immediately
    fetchPromise // fire and forget
    return cached
  }

  // No cache — await the fetch
  const response = await fetchPromise
  if (response) return response

  // Fully offline — serve offline page
  const offline = await cache.match('/offline')
  return offline || new Response('<h1>MetroFlow is offline</h1><p>Please check your connection.</p>',
    { headers: { 'Content-Type': 'text/html' } })
}

// ── Background sync for refresh ────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls ?? []
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(urls)).catch(() => {})
  }
})
