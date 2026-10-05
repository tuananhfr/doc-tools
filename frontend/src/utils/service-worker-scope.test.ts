import fs from 'node:fs'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'

it('does not intercept APIs or sibling applications, even after a client navigates outside its scope', async () => {
  const handlers: Record<string, (event: any) => void> = {}
  const cache = { match: vi.fn(), put: vi.fn(), addAll: vi.fn() }
  const fetch = vi.fn().mockResolvedValue({ ok: true, clone: () => ({}) })
  const caches = { keys: vi.fn().mockResolvedValue(['erpcons-cache', 'doctools-%2Fdoc-tools%2F-build']), open: vi.fn().mockResolvedValue(cache) }
  vm.runInNewContext(fs.readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL, fetch, caches,
    self: { registration: { scope: 'https://lpc.vn/doc-tools/' }, location: { origin: 'https://lpc.vn' }, addEventListener: (name: string, listener: (event: any) => void) => { handlers[name] = listener } },
  })
  for (const path of ['/', '/erpcons/app.js', '/doc-tools-other/a', '/doc-tools/api/v1/tools/stats']) {
    const respondWith = vi.fn()
    handlers.fetch({ request: { url: 'https://lpc.vn' + path, method: 'GET', mode: 'navigate' }, respondWith })
    expect(respondWith).not.toHaveBeenCalled()
  }
  let result: Promise<unknown> | undefined
  handlers.fetch({ request: { url: 'https://lpc.vn/doc-tools/ghep-pdf', method: 'GET', mode: 'navigate' }, respondWith: (promise: Promise<unknown>) => { result = promise } })
  await result
  expect(cache.match).toHaveBeenCalled()
  expect(caches.open.mock.calls.every(([name]) => name.startsWith('doctools-%2Fdoc-tools%2F-'))).toBe(true)
})
