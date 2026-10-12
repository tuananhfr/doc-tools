import { describe, expect, it, vi } from 'vitest'
import { assetsCached, offlineGroupUrls, prepareAssets } from './offline-assets'

const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('offlineGroupUrls', () => {
  it('reads one group from the offline manifest', async () => {
    expect(await offlineGroupUrls('tts', json({ optionalGroups: { tts: ['/vendor/tts/a.onnx'] } }))).toEqual(['/vendor/tts/a.onnx'])
  })
  it('returns null for an old manifest, a bad shape or no network', async () => {
    expect(await offlineGroupUrls('tts', json({ optionalAssets: ['/x'] }))).toBeNull()
    expect(await offlineGroupUrls('tts', json({ optionalGroups: { tts: [1] } }))).toBeNull()
    expect(await offlineGroupUrls('tts', json({}, 404))).toBeNull()
    expect(await offlineGroupUrls('tts', vi.fn(async () => { throw new TypeError('offline') }) as unknown as typeof fetch)).toBeNull()
  })
})

describe('assetsCached', () => {
  it('is true only when every file is in a cache', async () => {
    const stored = new Set(['/a', '/b'])
    const caches = { match: async (url: RequestInfo | URL) => stored.has(String(url)) ? new Response('x') : undefined }
    expect(await assetsCached(['/a', '/b'], caches)).toBe(true)
    expect(await assetsCached(['/a', '/c'], caches)).toBe(false)
    expect(await assetsCached([], caches)).toBe(false)
  })
})

describe('prepareAssets', () => {
  it('fetches each file in order and reports progress', async () => {
    const fetcher = vi.fn(async () => new Response('bytes')) as unknown as typeof fetch
    const progress = vi.fn()
    expect(await prepareAssets(['/a', '/b'], fetcher, progress)).toBe(true)
    expect(vi.mocked(fetcher).mock.calls.map((call) => call[0])).toEqual(['/a', '/b'])
    expect(progress.mock.calls).toEqual([[1, 2], [2, 2]])
  })
  it('stops at the first failure', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => new Response('', { status: String(url) === '/a' ? 500 : 200 })) as unknown as typeof fetch
    expect(await prepareAssets(['/a', '/b'], fetcher)).toBe(false)
    expect(vi.mocked(fetcher)).toHaveBeenCalledTimes(1)
    expect(await prepareAssets(['/a'], vi.fn(async () => { throw new TypeError('offline') }) as unknown as typeof fetch)).toBe(false)
  })
})
