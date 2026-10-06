import { SERVICE_WORKER_CACHE_PREFIX, SERVICE_WORKER_SCOPE, withBase } from './url'
import { clearDevelopmentWorker } from './development-service-worker'

export async function configureServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (process.env.NODE_ENV === 'production') {
    await navigator.serviceWorker.register(withBase('/sw.js'), { scope: SERVICE_WORKER_SCOPE, updateViaCache: 'none' })
    return
  }

  if (typeof window !== 'undefined' && window.__docToolsDevelopmentWorker) {
    await window.__docToolsDevelopmentWorker
    return
  }
  if (await clearDevelopmentWorker(SERVICE_WORKER_SCOPE, SERVICE_WORKER_CACHE_PREFIX, withBase('/sw.js'))) {
    console.info('DocTools development worker/cache cleared. Reload this tab to load current scripts.')
  }
}
