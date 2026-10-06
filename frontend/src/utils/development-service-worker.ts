import { SERVICE_WORKER_CACHE_PREFIX, SERVICE_WORKER_SCOPE, withBase } from './url'

declare global {
  interface Window {
    __docToolsDevelopmentWorker?: Promise<void>
  }
}

export async function clearDevelopmentWorker(scope: string, prefix: string, scriptPath: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const registrations = await navigator.serviceWorker.getRegistrations()
  const owned = registrations.filter(registration => {
    const worker = registration.active ?? registration.waiting ?? registration.installing
    if (!worker || registration.scope !== new URL(scope, location.origin).href) return false
    const script = new URL(worker.scriptURL)
    return script.origin === location.origin && script.pathname === scriptPath
  })
  const removed = await Promise.all(owned.map(registration => registration.unregister()))
  const names = 'caches' in globalThis ? (await caches.keys()).filter(name => name.startsWith(prefix)) : []
  const deleted = await Promise.all(names.map(name => caches.delete(name)))
  return removed.some(Boolean) || deleted.some(Boolean)
}

export function developmentWorkerBootstrap(): string {
  const args = [SERVICE_WORKER_SCOPE, SERVICE_WORKER_CACHE_PREFIX, withBase('/sw.js')]
    .map(value => JSON.stringify(value).replaceAll('<', '\\u003c')).join(',')
  const reloadKey = JSON.stringify('doctools-dev-reload:' + SERVICE_WORKER_SCOPE)
  // Inline server HTML reaches tabs whose cached layout bundle cannot run the new cleanup.
  return `window.__docToolsDevelopmentWorker = (${clearDevelopmentWorker.toString()})(${args}).then(function(cleared) {
    try {
      if (!cleared) { sessionStorage.removeItem(${reloadKey}); return; }
      if (sessionStorage.getItem(${reloadKey})) return;
      sessionStorage.setItem(${reloadKey}, '1');
    } catch (_) {}
    if (cleared) location.reload();
  }).catch(function(error) { console.warn('DocTools development cache cleanup failed', error); });`
}
