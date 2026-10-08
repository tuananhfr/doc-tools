import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

const FORMAT = 'v1'
const MIN_KEY_LENGTH = 32

/**
 * Secrets an admin types into the admin area are stored sealed with `CONFIG_ENCRYPTION_KEY`, the one
 * value that must stay in `.env`: a database dump alone then reveals no SMTP password or GoClaw token.
 */
function encryptionKey() {
  const raw = process.env.CONFIG_ENCRYPTION_KEY ?? ''
  if (raw.length < MIN_KEY_LENGTH) return null
  return Buffer.from(hkdfSync('sha256', raw, Buffer.alloc(0), 'chuyen-nho/app-secrets/v1', 32))
}

export function secretBoxReady() { return encryptionKey() !== null }

/** `name` is bound as associated data, so a sealed value copied onto another row does not open. */
export function sealSecret(name: string, plain: string) {
  const key = encryptionKey()
  if (!key) throw new Error('CONFIG_ENCRYPTION_KEY is not set')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(name))
  const sealed = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [FORMAT, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), sealed.toString('base64url')].join('.')
}

/** Null when the key is missing or changed since the value was sealed. */
export function openSecret(name: string, value: string) {
  const key = encryptionKey()
  const [format, iv, tag, sealed] = value.split('.')
  if (!key || format !== FORMAT || !iv || !tag || sealed === undefined) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAAD(Buffer.from(name))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(sealed, 'base64url')), decipher.final()]).toString('utf8')
  } catch { return null }
}
