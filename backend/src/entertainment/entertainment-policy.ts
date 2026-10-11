import { HttpException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { SandboxEnvelope } from './entertainment.types'

export const SOURCE_ID = 'cn-dev-pack-1.1'
export const RULE_VERSIONS = { numerology: 'pythagorean-total-draft-v1', cards: 'cards-manifest-draw-v1', tarot: 'tarot-manifest-draw-v1', calendar: 'cn-lunar-utc7-draft-v1' } as const
export function entError(status: number, code: string): never { throw new HttpException({ ok: false, code }, status) }
export function requireSandbox() { if (process.env.ENT_SANDBOX_ENABLED !== '1') entError(503, 'SANDBOX_DISABLED') }
export function sandboxTtl() {
  const value = Number(process.env.ENT_SESSION_TTL_SECONDS ?? 900)
  return Number.isInteger(value) && value >= 60 && value <= 3600 ? value : 900
}
export function sandboxEnvelope<T>(ruleVersion: string, result: T, requestId = randomUUID()): SandboxEnvelope<T> {
  return { ok: true, request_id: requestId, rule_version: ruleVersion, source_ids: [SOURCE_ID], verification_level: 'TECHNICAL_SANDBOX', disclaimer_id: 'cn-ent-reference-v1', public_release: 'BLOCKED', result }
}
export function sessionKey(value: unknown, now = Date.now()) {
  if (typeof value !== 'string' || !/^[a-z0-9]{8,10}_[a-f0-9]{32}$/.test(value)) entError(400, 'IDEMPOTENCY_REQUIRED')
  const started = parseInt(value.split('_')[0], 36)
  if (!Number.isSafeInteger(started) || started > now + 30_000) entError(400, 'INVALID_SESSION_TIME')
  if (now - started >= sandboxTtl() * 1000) entError(410, 'SESSION_EXPIRED')
  return { key: value, expires: Math.floor(started / 1000) + sandboxTtl() }
}
