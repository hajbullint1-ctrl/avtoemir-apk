/* AvtoEmir Service Worker v7 — force fresh load */
const CACHE = 'avtoemir-v7'
const PRECACHE = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache signs
  if (url.pathname.startsWith('/signs/')) {
    event.respondWith(fetch(request))
    return
  }

  // Network-first for everything else important
  const isFresh =
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.js')

  if (isFresh) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  )
})
