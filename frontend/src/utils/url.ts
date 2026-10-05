export const BASE_PATH = ''
export const ROUTER_BASENAME = '/'
export function withBase(path: string): string { return path }
export function drupalUrl(path: string, apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/v\d+\/?$/, '') + '/' + path.replace(/^\/+/, '')
}
