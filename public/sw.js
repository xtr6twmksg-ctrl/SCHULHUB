// Service Worker für SCHULHUB BS.
// Speichert nur die App-Hülle (HTML, JS, CSS, Icons) – niemals API-Antworten,
// damit keine Stundenpläne o. Ä. im Gerätespeicher landen.
const CACHE = 'schulhub-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Netzwerk zuerst, bei fehlender Verbindung aus dem Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('/'))),
  )
})
