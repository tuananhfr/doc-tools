import fs from 'node:fs'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'

const script = fs.readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://lpc.vn'
const prefix = 'doctools-%2Fdoc-tools%2F-'

function harness() {
  const storage = new Map<string, Map<string, Response>>()
  const key = (request: string | { url: string }) => typeof request === 'string' ? new URL(request, origin).href : request.url
  const open = vi.fn(async (name: string) => {
    if (!storage.has(name)) storage.set(name, new Map())
    const entries = storage.get(name)!
    return {
      match: async (request: string | { url: string }) => entries.get(key(request))?.clone(),
      put: async (request: string | { url: string }, response: Response) => { entries.set(key(request), response.clone()) },
      addAll: async (urls: string[]) => { for (const url of urls) entries.set(key(url), new Response(url)) },
    }
  })
  const fetch = vi.fn(async (_request: unknown, _options?: unknown) => new Response('network'))
  const claim = vi.fn()
  function restart() {
    const handlers: Record<string, (event: any) => void> = {}
    vm.runInNewContext(script, {
      URL, Response, fetch, caches: { open },
      self: { registration: { scope: origin + '/doc-tools/' }, location: { origin }, clients: { claim },
        addEventListener: (name: string, listener: (event: any) => void) => { handlers[name] = listener } },
    })
    return {
      async lifecycle(name: 'install' | 'activate') {
        let pending: Promise<unknown> | undefined
        handlers[name]({ waitUntil: (promise: Promise<unknown>) => { pending = promise } })
        await pending
      },
      request(path: string, mode = 'cors') {
        let response: Promise<Response> | undefined
        handlers.fetch({ request: { url: origin + path, method: 'GET', mode }, respondWith: (promise: Promise<Response>) => { response = promise } })
        return response
      },
    }
  }
  async function seed(name: string, path: string, value: string) { await (await open(name)).put(path, new Response(value)) }
  async function install(worker: ReturnType<typeof restart>, version: string) {
    fetch.mockResolvedValueOnce(Response.json({ version, assets: ['/doc-tools/'] }))
    await worker.lifecycle('install')
  }
  return { restart, seed, install, fetch, open, claim }
}

it('uses the activated build even when an older cache contains the same URL', async () => {
  const h = harness()
  await h.seed(prefix + 'old', '/doc-tools/brand/logo.svg', 'old')
  const worker = h.restart()
  await h.install(worker, 'new')
  await worker.lifecycle('activate')
  await h.seed(prefix + 'new', '/doc-tools/brand/logo.svg', 'new')
  expect(await (await worker.request('/doc-tools/brand/logo.svg'))!.text()).toBe('new')
  expect(h.claim).toHaveBeenCalledOnce()
})

it('retains the active cache after suspension and does not use a waiting build', async () => {
  const h = harness()
  let worker = h.restart()
  await h.install(worker, 'active')
  await worker.lifecycle('activate')
  await h.seed(prefix + 'active', '/doc-tools/brand/logo.svg', 'active')
  await h.install(h.restart(), 'waiting')
  await h.seed(prefix + 'waiting', '/doc-tools/brand/logo.svg', 'waiting')
  worker = h.restart()
  expect(await (await worker.request('/doc-tools/brand/logo.svg'))!.text()).toBe('active')
})

it('activates the installed cache even if the worker was suspended while waiting', async () => {
  const h = harness()
  await h.install(h.restart(), 'new')
  const worker = h.restart()
  await worker.lifecycle('activate')
  h.fetch.mockRejectedValueOnce(new Error('offline'))
  expect(await (await worker.request('/doc-tools/missing', 'navigate'))!.text()).toBe('/doc-tools/')
})

it('never falls back to an obsolete asset when the active cache misses', async () => {
  const h = harness()
  await h.seed(prefix + 'old', '/doc-tools/brand/logo.svg', 'obsolete')
  const worker = h.restart()
  await h.install(worker, 'new')
  await worker.lifecycle('activate')
  expect(await (await worker.request('/doc-tools/brand/logo.svg'))!.text()).toBe('network')
  h.fetch.mockRejectedValueOnce(new Error('offline'))
  expect(await (await worker.request('/doc-tools/brand/logo.svg'))!.text()).toBe('network')
})

it('leaves mutable Next dev scripts and hot updates to the network', () => {
  const worker = harness().restart()
  for (const path of [
    '/doc-tools/_next/static/chunks/app/layout.js', '/doc-tools/_next/static/chunks/app/page.js',
    '/doc-tools/_next/static/chunks/main-app.js?v=123', '/doc-tools/_next/static/chunks/app-pages-internals.js',
    '/doc-tools/_next/static/chunks/webpack.js?v=123', '/doc-tools/_next/webpack-hmr',
    '/doc-tools/_next/static/webpack/abc.hot-update.json',
  ]) expect(worker.request(path)).toBeUndefined()
})

it('still caches immutable production chunks', async () => {
  const h = harness()
  const worker = h.restart()
  await h.install(worker, 'new')
  await worker.lifecycle('activate')
  const chunk = '/doc-tools/_next/static/chunks/app/layout-1234567890abcdef.js'
  expect(await (await worker.request(chunk))!.text()).toBe('network')
  h.fetch.mockRejectedValueOnce(new Error('offline'))
  expect(await (await worker.request(chunk))!.text()).toBe('network')
})
