import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules() })

it.each(['', '/doc-tools'])('removes only app-owned development workers and caches at %s', async basePath => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', basePath)
  const scope = basePath + '/'
  const prefix = 'doctools-' + encodeURIComponent(scope) + '-'
  const own = { scope: 'https://lpc.vn' + scope, active: { scriptURL: 'https://lpc.vn' + basePath + '/sw.js' }, unregister: vi.fn() }
  const parent = { scope: 'https://lpc.vn/', active: { scriptURL: 'https://lpc.vn/parent-worker.js' }, unregister: vi.fn() }
  const sibling = { scope: 'https://lpc.vn/erpcons/', active: { scriptURL: 'https://lpc.vn/erpcons/sw.js' }, unregister: vi.fn() }
  const remove = vi.fn()
  const register = vi.fn()
  vi.stubGlobal('location', { origin: 'https://lpc.vn' })
  vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([own, parent, sibling]), register } })
  vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([prefix + 'old', prefix + 'metadata', 'erpcons-cache', 'doctools-%2Fother%2F-build']), delete: remove })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const { configureServiceWorker } = await import('./service-worker')
  await configureServiceWorker()
  expect(own.unregister).toHaveBeenCalledOnce()
  expect(parent.unregister).not.toHaveBeenCalled()
  expect(sibling.unregister).not.toHaveBeenCalled()
  expect(remove.mock.calls).toEqual([[prefix + 'old'], [prefix + 'metadata']])
  expect(register).not.toHaveBeenCalled()
})

it('recognizes an app worker that is still installing', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  const unregister = vi.fn()
  vi.stubGlobal('location', { origin: 'https://lpc.vn' })
  vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ scope: 'https://lpc.vn/doc-tools/', installing: { scriptURL: 'https://lpc.vn/doc-tools/sw.js' }, unregister }]) } })
  vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const { configureServiceWorker } = await import('./service-worker')
  await configureServiceWorker()
  expect(unregister).toHaveBeenCalledOnce()
})

it('registers production workers with fresh update checks and preserves offline caches', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  const register = vi.fn()
  const getRegistrations = vi.fn()
  const remove = vi.fn()
  vi.stubGlobal('navigator', { serviceWorker: { register, getRegistrations } })
  vi.stubGlobal('caches', { delete: remove })
  const { configureServiceWorker } = await import('./service-worker')
  await configureServiceWorker()
  expect(register).toHaveBeenCalledExactlyOnceWith('/doc-tools/sw.js', { scope: '/doc-tools/', updateViaCache: 'none' })
  expect(getRegistrations).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
})

it('does nothing when service workers are unsupported', async () => {
  vi.stubGlobal('navigator', {})
  const { configureServiceWorker } = await import('./service-worker')
  await expect(configureServiceWorker()).resolves.toBeUndefined()
})
