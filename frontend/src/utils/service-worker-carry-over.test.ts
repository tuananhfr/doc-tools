import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SW = readFileSync(fileURLToPath(new URL('../../public/sw.js', import.meta.url)), 'utf8')
const ORIGIN = 'https://site.test'
const absolute = (key: string | { url: string }) => new URL(typeof key === 'string' ? key : key.url, ORIGIN).href

class FakeCache {
  entries = new Map<string, Response>()
  async match(key: string | { url: string }) { return this.entries.get(absolute(key))?.clone() }
  async put(key: string | { url: string }, response: Response) { this.entries.set(absolute(key), response) }
  async addAll(urls: string[]) { for (const url of urls) this.entries.set(absolute(url), new Response(`fresh ${url}`)) }
  async keys() { return [...this.entries.keys()].map((url) => ({ url })) }
}

class FakeCaches {
  stores = new Map<string, FakeCache>()
  async open(name: string) { if (!this.stores.has(name)) this.stores.set(name, new FakeCache()); return this.stores.get(name)! }
  async has(name: string) { return this.stores.has(name) }
}

async function install(caches: FakeCaches, manifest: unknown) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const self = { registration: { scope: ORIGIN + '/' }, location: { origin: ORIGIN }, clients: { claim: async () => {} }, addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler } }
  const fetcher = async () => new Response(JSON.stringify(manifest))
  new Function('self', 'caches', 'fetch', 'Response', 'URL', SW)(self, caches, fetcher, Response, URL)
  let done: Promise<unknown> = Promise.resolve()
  handlers.install({ waitUntil: (promise: Promise<unknown>) => { done = promise } })
  await done
}

const PREFIX = 'doctools-%2F-'
const manifest = { version: 'new', assets: ['/', '/_next/static/media/kept.woff2'], optionalAssets: ['/vendor/tts/voice.onnx'], locales: [] }

describe('service worker install carries runtime downloads across deploys', () => {
  it('copies optional assets and hashed media from the active cache, not pages', async () => {
    const caches = new FakeCaches()
    await (await caches.open(PREFIX + 'metadata')).put('/__sw-active-cache', new Response(PREFIX + 'old'))
    const old = await caches.open(PREFIX + 'old')
    await old.put('/vendor/tts/voice.onnx', new Response('model'))
    await old.put('/_next/static/media/font.abc123.woff2', new Response('font'))
    await old.put('/_next/static/media/kept.woff2', new Response('old copy'))
    await old.put('/tien-dien', new Response('stale page'))
    await old.put('/vendor/tts/removed-voice.onnx', new Response('no longer shipped'))
    await install(caches, manifest)
    const fresh = caches.stores.get(PREFIX + 'new')!
    expect(await (await fresh.match('/vendor/tts/voice.onnx'))?.text()).toBe('model')
    expect(await (await fresh.match('/_next/static/media/font.abc123.woff2'))?.text()).toBe('font')
    expect(await (await fresh.match('/_next/static/media/kept.woff2'))?.text()).toBe('fresh /_next/static/media/kept.woff2')
    expect(await fresh.match('/tien-dien')).toBeUndefined()
    expect(await fresh.match('/vendor/tts/removed-voice.onnx')).toBeUndefined()
  })
  it('still installs when the copy runs out of storage, leaving that download to be fetched again', async () => {
    const caches = new FakeCaches()
    await (await caches.open(PREFIX + 'metadata')).put('/__sw-active-cache', new Response(PREFIX + 'old'))
    await (await caches.open(PREFIX + 'old')).put('/vendor/tts/voice.onnx', new Response('model'))
    const fresh = await caches.open(PREFIX + 'new')
    fresh.put = async () => { throw new DOMException('full', 'QuotaExceededError') }
    await install(caches, manifest)
    expect(await fresh.match('/vendor/tts/voice.onnx')).toBeUndefined()
    expect(await (await caches.open(PREFIX + 'metadata')).match('/__sw-pending-cache')).toBeDefined()
  })
  it('installs normally on a first visit', async () => {
    const caches = new FakeCaches()
    await install(caches, manifest)
    expect([...(caches.stores.get(PREFIX + 'new')!.entries.keys())]).toEqual([ORIGIN + '/', ORIGIN + '/_next/static/media/kept.woff2'])
  })
})
