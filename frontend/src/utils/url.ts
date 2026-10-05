export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '')
export const ROUTER_BASENAME = BASE_PATH + '/'
export const SERVICE_WORKER_SCOPE = BASE_PATH + '/'
export const SERVICE_WORKER_CACHE_PREFIX = 'doctools-' + encodeURIComponent(SERVICE_WORKER_SCOPE) + '-'

export function withBase(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path
  if (!BASE_PATH || path === BASE_PATH || path.startsWith(BASE_PATH + '/') || path.startsWith(BASE_PATH + '?') || path.startsWith(BASE_PATH + '#')) return path
  return BASE_PATH + path
}

export function drupalUrl(path: string, apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/v\d+\/?$/, '') + '/' + path.replace(/^\/+/, '')
}
