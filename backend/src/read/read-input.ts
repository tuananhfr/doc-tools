/** `{url}` with a parseable https URL and nothing else; which hosts may be fetched is decided in net/safe-fetch.ts. */
export function readInput(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const value = body as Record<string, unknown>
  if (Object.keys(value).length !== 1 || typeof value.url !== 'string') return null
  const url = value.url.trim()
  if (!url || url.length > 2048) return null
  try { return new URL(url).protocol === 'https:' ? url : null } catch { return null }
}
