import { withBase } from '@/utils/url'
import type { OfflineAssetGroup } from '../config/offline-asset-groups'

export type { OfflineAssetGroup }

/** Chỉ tải trước được khi service worker đang điều khiển trang — tệp vào cache là nhờ worker, không phải nhờ trang. */
export function offlineCacheReady(): boolean {
  return typeof caches !== 'undefined' && typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller)
}

export async function offlineGroupUrls(group: OfflineAssetGroup, fetcher: typeof fetch = fetch): Promise<string[] | null> {
  try {
    const response = await fetcher(withBase('/offline-manifest.json'), { cache: 'no-store' })
    if (!response.ok) return null
    const manifest = await response.json() as { optionalGroups?: Record<string, unknown> }
    const urls = manifest?.optionalGroups?.[group]
    return Array.isArray(urls) && urls.length > 0 && urls.every((url) => typeof url === 'string') ? urls as string[] : null
  } catch { return null }
}

export async function assetsCached(urls: string[], cacheStorage: Pick<CacheStorage, 'match'>): Promise<boolean> {
  if (!urls.length) return false
  for (const url of urls) if (!await cacheStorage.match(url)) return false
  return true
}

/** Tải lần lượt để worker cất vào cache; hỏng một tệp là dừng, vì thiếu một tệp thì công cụ vẫn không chạy khi mất mạng. */
export async function prepareAssets(urls: string[], fetcher: typeof fetch = fetch, onProgress?: (done: number, total: number) => void): Promise<boolean> {
  let done = 0
  for (const url of urls) {
    try {
      const response = await fetcher(url)
      if (!response.ok) return false
      // Worker đã đọc hết bản sao để cất; trang không cần giữ 60 MB trong bộ nhớ.
      await response.body?.cancel()
    } catch { return false }
    onProgress?.(++done, urls.length)
  }
  return true
}
