import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

it.each(['', '/doc-tools'])('redirects query links without dropping the configured prefix %s', async basePath => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', basePath)
  vi.resetModules()
  const { proxy } = await import('./proxy')
  const request = new NextRequest('http://localhost:3002' + (basePath || '') + '/?tool=merge&keep=1', { nextConfig: { basePath } })
  const response = proxy(request)
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('http://localhost:3002' + basePath + '/ghep-pdf?keep=1')
})

it('preserves legacy redirects only in the root deployment', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '')
  vi.resetModules()
  const { proxy } = await import('./proxy')
  const response = proxy(new NextRequest('http://localhost:3002/doc-tools/ghep-pdf'))
  expect(response.status).toBe(308)
  expect(response.headers.get('location')).toBe('http://localhost:3002/ghep-pdf')
})

it('keeps the homepage within the worker scope without redirecting to the main website', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  vi.resetModules()
  const { proxy } = await import('./proxy')
  const response = proxy(new NextRequest('http://localhost:3002/doc-tools', { nextConfig: { basePath: '/doc-tools' } }))
  expect(response.status).toBe(308)
  expect(response.headers.get('location')).toBe('http://localhost:3002/doc-tools/')
  const scoped = proxy(new NextRequest('http://localhost:3002/doc-tools/', { nextConfig: { basePath: '/doc-tools' } }))
  expect(scoped.headers.get('location')).toBeNull()
})
