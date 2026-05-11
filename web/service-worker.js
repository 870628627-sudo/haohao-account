const CACHE_NAME = 'haohudget-v66'
const APP_VERSION = '20260511-trip-city-sheet'
const ASSETS = [
  '/',
  '/index.html',
  `/styles.css?v=${APP_VERSION}`,
  `/app.js?v=${APP_VERSION}`,
  '/manifest.webmanifest',
  '/assets/bear-ledger.jpg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
      const clients = await self.clients.matchAll({ type: 'window' })
      await Promise.all(clients.map((client) => client.navigate(client.url)))
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
