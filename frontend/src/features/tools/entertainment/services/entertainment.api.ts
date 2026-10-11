import { withBase } from '@/utils/url'
import type { SandboxEnvelope, SandboxState } from '../types/entertainment.types'

export class EntertainmentError extends Error { constructor(public code: string) { super(code) } }
export function newDrawKey() { return `${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, '')}` }
export async function entRequest<T>(path: string, body?: unknown, key?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(withBase(`/api/v1/ent/${path}`), { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit', signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CN-Request': '1', ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  let value: T & { ok?: boolean; code?: string }
  try { value = await response.json() } catch { throw new EntertainmentError('NETWORK_ERROR') }
  if (!response.ok || value.ok !== true) throw new EntertainmentError(value.code ?? `HTTP_${response.status}`)
  return value
}
export async function entResult<T>(path: string, body: unknown, key?: string): Promise<SandboxEnvelope<T>> {
  const value = await entRequest<SandboxEnvelope<T>>(path, body, key)
  if (value.public_release !== 'BLOCKED' || value.verification_level !== 'TECHNICAL_SANDBOX' || value.disclaimer_id !== 'cn-ent-reference-v1' || typeof value.rule_version !== 'string' || !Array.isArray(value.source_ids) || !value.result) throw new EntertainmentError('INVALID_RESPONSE')
  return value
}
export const sandboxState = (signal: AbortSignal) => entRequest<SandboxState>('tools', undefined, undefined, signal)
