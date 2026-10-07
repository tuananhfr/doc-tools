export interface ProfileInput { displayName: string | null; publicAttribution: boolean }

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254) return null
  const match = /^([a-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64})@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/.exec(email)
  if (!match || match[1].startsWith('.') || match[1].endsWith('.') || match[1].includes('..')) return null
  if (match[2].split('.').some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null
  return email
}

export function parseProfileInput(body: unknown): ProfileInput | null {
  if (!body || typeof body !== 'object') return null
  const { displayName, publicAttribution } = body as Record<string, unknown>
  if (typeof publicAttribution !== 'boolean') return null
  if (displayName === null || displayName === '') return { displayName: null, publicAttribution }
  if (typeof displayName !== 'string') return null
  const name = displayName.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f<>]/.test(name)) return null
  return { displayName: name, publicAttribution }
}
