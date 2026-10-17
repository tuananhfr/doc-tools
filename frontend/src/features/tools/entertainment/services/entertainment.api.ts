import { withBase } from '@/utils/url'
import type { EntertainmentEnvelope } from '../types/entertainment.types'

export class EntertainmentError extends Error { constructor(public code: string) { super(code) } }
export function newDrawKey() { return `${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, '')}` }
export async function entRequest<T>(path: string, body?: unknown, key?: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase(`/api/v1/ent/${path}`), { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit', signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CN-Request': '1', ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new EntertainmentError('NETWORK_ERROR')
  }
  // The frontend proxy returns plain text when the backend cannot be reached.
  if (response.status >= 500) throw new EntertainmentError('SERVICE_UNAVAILABLE')
  let value: unknown
  try { value = await response.json() } catch { throw new EntertainmentError('INVALID_RESPONSE') }
  if (!value || typeof value !== 'object') throw new EntertainmentError('INVALID_RESPONSE')
  const envelope = value as { ok?: boolean; code?: unknown }
  if (!response.ok || envelope.ok !== true) throw new EntertainmentError(typeof envelope.code === 'string' ? envelope.code : `HTTP_${response.status}`)
  return value as T
}
export async function entResult<T>(path: string, body: unknown, key?: string): Promise<EntertainmentEnvelope<T>> {
  const value = await entRequest<EntertainmentEnvelope<T>>(path, body, key)
  if (value.disclaimer_id !== 'cn-ent-reference-v1' || typeof value.rule_version !== 'string' || !Array.isArray(value.source_ids) || !value.result) throw new EntertainmentError('INVALID_RESPONSE')
  return value
}
