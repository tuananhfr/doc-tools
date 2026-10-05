const CACHE_PREFIX = 'doctools-'
let cacheName = CACHE_PREFIX + 'runtime'
self.addEventListener('install', event => event.waitUntil((async () => {
  const manifest = await fetch('/offline-manifest.json').then(response => response.json())
  cacheName = CACHE_PREFIX + manifest.version
  const cache = await caches.open(cacheName)
  await cache.addAll(manifest.assets)
})()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith((async () => {
    const cached = await caches.match(event.request)
    if (cached && event.request.mode !== 'navigate') return cached
    try {
      const response = await fetch(event.request)
      if (response.ok) { const cache = await caches.open(cacheName); await cache.put(event.request, response.clone()) }
      return response
    } catch (error) {
      if (cached) return cached
      if (event.request.mode === 'navigate') { const shell = await caches.match('/doc-tools'); if (shell) return shell }
      throw error
    }
  })())
})
