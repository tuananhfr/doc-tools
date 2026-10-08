/**
 * Mail and GoClaw settings an owner sets from the admin area. They win over `.env`, which stays the
 * fallback for servers that never used the admin form. The service in `settings/` fills this store
 * from the database; `configuration()` reads it, so every caller sees the same merged view.
 */
export interface MailOverrides {
  transport: 'direct' | 'smtp' | 'log'; from: string; fromName: string; heloName: string
  smtpHost: string; smtpPort: number; smtpSecure: boolean; smtpUser: string
  dkimDomain: string; dkimSelector: string
}

export interface GoclawOverrides { url: string; publicWsUrl: string; publicFilesUrl: string; mcpPublicUrl: string; mcpAllowedIps: string[] }

export const SECRET_NAMES = ['mail.smtpPassword', 'mail.dkimPrivateKey', 'goclaw.gatewayToken'] as const
export type SecretName = (typeof SECRET_NAMES)[number]

export interface RuntimeOverrides {
  mail: MailOverrides | null
  goclaw: GoclawOverrides | null
  secrets: Partial<Record<SecretName, string>>
}

const NONE: RuntimeOverrides = { mail: null, goclaw: null, secrets: {} }

let current: RuntimeOverrides = NONE
let signature = JSON.stringify(NONE)
let version = 0

/** `CONFIG_FROM_ENV_ONLY=1` ignores the admin form: a way back in when a bad value locks everyone out, and isolation for tests. */
export function runtimeOverrides(): RuntimeOverrides {
  return process.env.CONFIG_FROM_ENV_ONLY === '1' ? NONE : current
}

export function applyRuntimeOverrides(next: RuntimeOverrides) {
  const nextSignature = JSON.stringify(next)
  if (nextSignature === signature) return
  current = next
  signature = nextSignature
  version++
}

/** Bumped only when a value really changed, so long-lived clients (the mail transport) rebuild once per change. */
export function runtimeConfigVersion() { return version }
