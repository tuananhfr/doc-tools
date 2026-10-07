/** Client-side mirror of the backend's first check, so an obvious mistake never costs a round trip. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}
