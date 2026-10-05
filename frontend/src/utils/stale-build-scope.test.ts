import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })

it('recovers only DocTools registrations and caches on a shared domain', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  vi.resetModules()
  const own = { scope: 'https://lpc.vn/doc-tools/', unregister: vi.fn() }
  const sibling = { scope: 'https://lpc.vn/erpcons/', unregister: vi.fn() }
  const getRegistration = vi.fn().mockResolvedValue(own)
  const remove = vi.fn()
  vi.stubGlobal('location', { origin: 'https://lpc.vn' })
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: { controller: {}, getRegistration, getRegistrations: vi.fn().mockResolvedValue([own, sibling]) } })
  vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['workbox-precache-erpcons', 'doctools-%2Fdoc-tools%2F-build']), delete: remove })
  const { prepareReloadForNewBuild } = await import('./stale-build')
  await prepareReloadForNewBuild({ force: true })
  expect(getRegistration).toHaveBeenCalledWith('/doc-tools/')
  expect(own.unregister).toHaveBeenCalledOnce()
  expect(sibling.unregister).not.toHaveBeenCalled()
  expect(remove).toHaveBeenCalledExactlyOnceWith('doctools-%2Fdoc-tools%2F-build')
})

it('does not remove a parent website worker returned as a fallback registration', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  vi.resetModules()
  const unregister = vi.fn()
  vi.stubGlobal('location', { origin: 'https://lpc.vn' })
  vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ scope: 'https://lpc.vn/', unregister }) } })
  const { prepareReloadForNewBuild } = await import('./stale-build')
  await prepareReloadForNewBuild({ force: true })
  expect(unregister).not.toHaveBeenCalled()
})
