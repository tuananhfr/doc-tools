export interface CodeInput { destinationUrl: string; expiresAt: number | null }
export const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{32}$/
export const MANAGEMENT_KEY = /^[A-Za-z0-9_-]{43}$/
export const CODE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function codeInput(body: unknown, now: number): CodeInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const value = body as Record<string, unknown>
  if (Object.keys(value).some(key => !['destination_url', 'expires_at'].includes(key))) return null
  if (typeof value.destination_url !== 'string' || value.destination_url.length > 1800 || /[\u0000-\u0020\u007f]/u.test(value.destination_url)) return null
  let url: URL
  try { url = new URL(value.destination_url) } catch { return null }
  if(url.href.length>1800)return null
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return null
  // IP literals, single-label intranet hosts and special-use suffixes are never public destinations.
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i.test(host)
    || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|onion)$/i.test(host)) return null
  let expiresAt: number | null = null
  if (value.expires_at !== null && value.expires_at !== undefined) {
    if (typeof value.expires_at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value.expires_at)) return null
    const [year,month,day,hour,minute,second]=value.expires_at.match(/\d+/g)!.slice(0,6).map(Number)
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate()
    if(month<1||month>12||day<1||day>lastDay||hour>23||minute>59||second>59)return null
    expiresAt = Date.parse(value.expires_at)
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return null
  }
  return { destinationUrl: url.href, expiresAt }
}

export function revokeInput(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const value = body as Record<string, unknown>
  return Object.keys(value).length === 1 && typeof value.manage_key === 'string' && MANAGEMENT_KEY.test(value.manage_key) ? value.manage_key : null
}
