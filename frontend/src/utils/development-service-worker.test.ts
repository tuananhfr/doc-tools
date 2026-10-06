import vm from 'node:vm'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules() })

async function bootstrapContext() {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  const { developmentWorkerBootstrap } = await import('./development-service-worker')
  const unregister = vi.fn().mockResolvedValue(true)
  const foreignUnregister = vi.fn()
  const remove = vi.fn().mockResolvedValue(true)
  const reload = vi.fn()
  const memory = new Map<string, string>()
  const context = {
    URL, window: {} as { __docToolsDevelopmentWorker: Promise<void> },
    location: { origin: 'https://lpc.vn', reload },
    navigator: { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([
      { scope: 'https://lpc.vn/doc-tools/', active: { scriptURL: 'https://lpc.vn/doc-tools/sw.js' }, unregister },
      { scope: 'https://lpc.vn/', active: { scriptURL: 'https://lpc.vn/sw.js' }, unregister: foreignUnregister },
    ]) } },
    caches: { keys: vi.fn().mockResolvedValue(['doctools-%2Fdoc-tools%2F-old', 'other-cache']), delete: remove },
    sessionStorage: { getItem: (key: string) => memory.get(key), setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) },
    console: { warn: vi.fn() },
  }
  const script = developmentWorkerBootstrap()
  async function run() { vm.runInNewContext(script, context); await context.window.__docToolsDevelopmentWorker }
  return { context, run, unregister, foreignUnregister, remove, reload, memory }
}

it('runs serialized cleanup from HTML and reloads only after removing app caches', async () => {
  const h = await bootstrapContext()
  await h.run()
  expect(h.unregister).toHaveBeenCalledOnce()
  expect(h.foreignUnregister).not.toHaveBeenCalled()
  expect(h.remove).toHaveBeenCalledExactlyOnceWith('doctools-%2Fdoc-tools%2F-old')
  expect(h.reload).toHaveBeenCalledOnce()
  expect(h.remove.mock.invocationCallOrder[0]).toBeLessThan(h.reload.mock.invocationCallOrder[0])
  expect(h.context.console.warn).not.toHaveBeenCalled()
})

it('prevents a reload loop and resets the guard once the origin is clean', async () => {
  const h = await bootstrapContext()
  await h.run()
  await h.run()
  expect(h.reload).toHaveBeenCalledOnce()
  h.context.navigator.serviceWorker.getRegistrations.mockResolvedValue([])
  h.context.caches.keys.mockResolvedValue([])
  await h.run()
  expect(h.memory.size).toBe(0)
  expect(h.reload).toHaveBeenCalledOnce()
})

it('works when session storage is blocked', async () => {
  const h = await bootstrapContext()
  h.context.sessionStorage.getItem = () => { throw new Error('blocked') }
  await h.run()
  expect(h.reload).toHaveBeenCalledOnce()
})

it('does not reload when no removal succeeded', async () => {
  const h = await bootstrapContext()
  h.unregister.mockResolvedValue(false)
  h.remove.mockResolvedValue(false)
  await h.run()
  expect(h.reload).not.toHaveBeenCalled()
})

it('reports unavailable worker APIs without reloading', async () => {
  const h = await bootstrapContext()
  h.context.navigator.serviceWorker.getRegistrations.mockRejectedValue(new Error('blocked'))
  await h.run()
  expect(h.context.console.warn).toHaveBeenCalledOnce()
  expect(h.reload).not.toHaveBeenCalled()
})
