/** Explicit deployments win. An omitted allowlist must never mean every Origin. */
export function trustedOrigins(explicit: string[], siteUrl: string, host: string, production: boolean): string[] {
  if (explicit.length) return explicit
  const origins: string[] = []
  try { origins.push(new URL(siteUrl).origin) } catch { /* Invalid config fails closed. */ }
  if (!production && ['localhost', '127.0.0.1', '::1'].includes(host)) {
    origins.push('http://localhost:3002', 'http://127.0.0.1:3002')
  }
  return origins
}
