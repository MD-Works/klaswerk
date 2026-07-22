// ═══════════════════════════════════════════════════
// KlasWerk — Service Worker (PWA)
// ───────────────────────────────────────────────────
// Strategy:
//   App shell (HTML/JS/CSS)  — Cache First with network fallback
//   API / Supabase requests  — Network First (always fresh)
//   Fonts (Google Fonts)     — Stale While Revalidate
//
// Session 9
// ═══════════════════════════════════════════════════

const CACHE_NAME     = 'klaswerk-v1'
const FONT_CACHE     = 'klaswerk-fonts-v1'
const OFFLINE_PAGE   = '/index.html'

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/config.js',
]

// ── Install — pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate — clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch — routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase / PayFast / Whereby API calls — always network
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('payfast.co.za') ||
    url.hostname.includes('whereby.com') ||
    url.hostname.includes('resend.com')
  ) {
    event.respondWith(fetch(request))
    return
  }

  // Google Fonts — Stale While Revalidate
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    return
  }

  // App shell + static assets — Cache First
  event.respondWith(cacheFirst(request))
})

// ── Cache strategies ─────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline fallback — return cached index.html for navigation
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_PAGE)
    }
    throw new Error('Network error and no cache')
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? fetchPromise
}
