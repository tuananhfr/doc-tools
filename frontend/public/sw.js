const scopePath = new URL(self.registration.scope).pathname
const basePath = scopePath.replace(/\/+$/, '')
const appPath = path => basePath + path
const CACHE_PREFIX = 'doctools-' + encodeURIComponent(scopePath) + '-'
const METADATA_CACHE = CACHE_PREFIX + 'metadata'
const activeKey = appPath('/__sw-active-cache')
const pendingKey = appPath('/__sw-pending-cache')
let installedCache
let activeCache
async function readCacheName(key) {
  const stored = await (await caches.open(METADATA_CACHE)).match(key)
  const name = stored && await stored.text()
  return name && name.startsWith(CACHE_PREFIX) && name !== METADATA_CACHE ? name : undefined
}
function currentCacheName() {
  // Worker globals disappear when the browser suspends it; persist the active build.
  activeCache ??= readCacheName(activeKey).then(name => name ?? CACHE_PREFIX + 'runtime')
  return activeCache
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const manifest = await fetch(appPath('/offline-manifest.json'), { cache: 'no-store' }).then(response => response.json())
  installedCache = CACHE_PREFIX + manifest.version
  const cache = await caches.open(installedCache)
  await cache.addAll(manifest.assets)
  await (await caches.open(METADATA_CACHE)).put(pendingKey, new Response(installedCache))
})()))
self.addEventListener('activate', event => event.waitUntil((async () => {
  const name = installedCache ?? await readCacheName(pendingKey)
  if (name) {
    await (await caches.open(METADATA_CACHE)).put(activeKey, new Response(name))
    activeCache = Promise.resolve(name)
  }
  await self.clients.claim()
})()))
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  const withinScope = url.pathname === basePath || url.pathname.startsWith(scopePath)
  const apiPath = appPath('/api')
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !withinScope || url.pathname === apiPath || url.pathname.startsWith(apiPath + '/')) return
  const nextPath = appPath('/_next/')
  const devAsset = url.pathname.startsWith(nextPath) && (
    url.pathname.includes('/webpack-hmr') || url.pathname.includes('.hot-update.') ||
    /\/(?:main-app|app-pages-internals|webpack)\.js$/.test(url.pathname) ||
    /\/static\/chunks\/app\/.*\.js$/.test(url.pathname) && !/-[a-f0-9]{8,}\.js$/.test(url.pathname)
  )
  if (devAsset) return
  event.respondWith((async () => {
    const cache = await caches.open(await currentCacheName())
    const cached = await cache.match(event.request)
    if (cached && event.request.mode !== 'navigate') return cached
    try {
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    } catch (error) {
      if (cached) return cached
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(appPath('/'))
        if (shell) return shell
      }
      throw error
    }
  })())
})
