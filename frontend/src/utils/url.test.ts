import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('deployment paths', () => {
  it.each(['', '/doc-tools', '/apps/doc-tools/'])('keeps app URLs inside %s and external URLs unchanged', async prefix => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', prefix)
    vi.resetModules()
    const { withBase, BASE_PATH, SERVICE_WORKER_SCOPE } = await import('./url')
    const { appConfig } = await import('../config/app.config')
    const base = prefix.replace(/\/+$/, '')
    expect(BASE_PATH).toBe(base)
    expect(withBase('/')).toBe(base + '/')
    expect(withBase('/ghep-pdf')).toBe(base + '/ghep-pdf')
    expect(withBase(base + '/ghep-pdf')).toBe(base + '/ghep-pdf')
    expect(withBase('https://lpc.vn/erpcons/login')).toBe('https://lpc.vn/erpcons/login')
    expect(withBase('//cdn.example.com/image.png')).toBe('//cdn.example.com/image.png')
    expect(withBase('#section')).toBe('#section')
    expect(appConfig.apiBaseUrl).toBe(base + '/api/v1')
    expect(SERVICE_WORKER_SCOPE).toBe(base + '/')
  })
})
