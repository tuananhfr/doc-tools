const scopePath = new URL(self.registration.scope).pathname
const basePath = scopePath.replace(/\/+$/, '')
const appPath = path => basePath + path
const CACHE_PREFIX = 'doctools-' + encodeURIComponent(scopePath) + '-'
let cacheName = CACHE_PREFIX + 'runtime'
self.addEventListener('install', event => event.waitUntil((async () => {
  const manifest = await fetch(appPath('/offline-manifest.json')).then(response => response.json())
  cacheName = CACHE_PREFIX + manifest.version
  const cache = await caches.open(cacheName)
  await cache.addAll(manifest.assets)
})()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  const withinScope = url.pathname === basePath || url.pathname.startsWith(scopePath)
  const apiPath = appPath('/api')
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !withinScope || url.pathname === apiPath || url.pathname.startsWith(apiPath + '/')) return
  event.respondWith((async () => {
    const keys = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX))
    let cached
    for (const key of keys) {
      cached = await (await caches.open(key)).match(event.request)
      if (cached) break
    }
    if (cached && event.request.mode !== 'navigate') return cached
    try {
      const response = await fetch(event.request)
      if (response.ok) { const cache = await caches.open(cacheName); await cache.put(event.request, response.clone()) }
      return response
    } catch (error) {
      if (cached) return cached
      if (event.request.mode === 'navigate') {
        for (const key of keys) { const shell = await (await caches.open(key)).match(appPath('/')); if (shell) return shell }
      }
      throw error
    }
  })())
})
