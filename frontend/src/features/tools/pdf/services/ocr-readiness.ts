import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import { withBase } from '@/utils/url'

const assets = () => [workerUrl, coreUrl, withBase('/vendor/tesseract/vie.traineddata.gz')].map(url => new URL(url, window.location.href).href)

export async function ocrOfflineReady(): Promise<boolean> {
  if (!('caches' in window) || !navigator.serviceWorker?.controller) return false
  return (await Promise.all(assets().map(url => caches.match(url)))).every(response => response?.ok)
}

export async function prepareOcrOffline(): Promise<boolean> {
  if (!navigator.serviceWorker?.controller) return false
  const responses = await Promise.all(assets().map(url => fetch(url)))
  if (responses.some(response => !response.ok)) return false
  await Promise.all(responses.map(response => response.arrayBuffer()))
  // Cache writes finish after the fetch response; acknowledge only actual cached assets.
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await ocrOfflineReady()) return true
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  return false
}
