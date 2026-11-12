/* AvtoEmir Service Worker — network-first so app updates without APK rebuild */
const CACHE = 'avtoemir-v3'
const PRECACHE = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Always prefer network for HTML and JS so deploys apply without new APK
  const isAppShell =
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.js')

  if (isAppShell) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(js|css)$/))) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && url.pathname.match(/\.(png|jpg|svg|woff2?)$/)) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
