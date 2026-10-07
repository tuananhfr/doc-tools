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

it.each(['', '/doc-tools'])('serves the default locale without a prefix under %s', async basePath => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', basePath)
  vi.resetModules()
  const { proxy } = await import('./proxy')
  const nextConfig = { basePath }
  const rewritten = proxy(new NextRequest('http://localhost:3002' + basePath + '/cong-cu?q=pdf', { nextConfig }))
  expect(rewritten.headers.get('location')).toBeNull()
  expect(rewritten.headers.get('x-middleware-rewrite')).toBe('http://localhost:3002' + basePath + '/vi/cong-cu?q=pdf')
  const home = proxy(new NextRequest('http://localhost:3002' + basePath + '/', { nextConfig }))
  expect(home.headers.get('x-middleware-rewrite')).toBe('http://localhost:3002' + basePath + '/vi')

  const duplicate = proxy(new NextRequest('http://localhost:3002' + basePath + '/vi/ghep-pdf', { nextConfig }))
  expect(duplicate.status).toBe(308)
  expect(duplicate.headers.get('location')).toBe('http://localhost:3002' + basePath + '/ghep-pdf')

  const english = proxy(new NextRequest('http://localhost:3002' + basePath + '/en/ghep-pdf', { nextConfig }))
  expect(english.headers.get('location')).toBeNull()
  expect(english.headers.get('x-middleware-rewrite')).toBeNull()
})

it('sends a visitor back to the language they picked, never by Accept-Language', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/doc-tools')
  vi.resetModules()
  const { proxy } = await import('./proxy')
  const nextConfig = { basePath: '/doc-tools' }
  const picked = proxy(new NextRequest('http://localhost:3002/doc-tools/ghep-pdf', { nextConfig, headers: { cookie: 'cn_locale=ja', 'sec-fetch-mode': 'navigate' } }))
  expect(picked.status).toBe(307)
  expect(picked.headers.get('location')).toBe('http://localhost:3002/doc-tools/ja/ghep-pdf')
  const home = proxy(new NextRequest('http://localhost:3002/doc-tools/', { nextConfig, headers: { cookie: 'cn_locale=ar', 'sec-fetch-mode': 'navigate' } }))
  expect(home.headers.get('location')).toBe('http://localhost:3002/doc-tools/ar')
  const browser = proxy(new NextRequest('http://localhost:3002/doc-tools/ghep-pdf', { nextConfig, headers: { 'accept-language': 'fr-FR,fr;q=0.9' } }))
  expect(browser.headers.get('location')).toBeNull()
  const unknown = proxy(new NextRequest('http://localhost:3002/doc-tools/ghep-pdf', { nextConfig, headers: { cookie: 'cn_locale=xx', 'sec-fetch-mode': 'navigate' } }))
  expect(unknown.headers.get('location')).toBeNull()
  const precache = proxy(new NextRequest('http://localhost:3002/doc-tools/ghep-pdf', { nextConfig, headers: { cookie: 'cn_locale=ja', 'sec-fetch-mode': 'same-origin' } }))
  expect(precache.headers.get('location')).toBeNull()
})
