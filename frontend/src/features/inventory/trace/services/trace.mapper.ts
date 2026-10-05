import { fromUnix } from '@/utils/drupal-date'
import type { TraceErrorCode, TraceEvent, TraceIdentifier, TraceObject, TraceResolution, TraceStatus } from '../types/trace.types'

/** Hình dạng thô của erp_trace: đã camelCase, chỉ khác ở mốc thời gian (giây). */
export interface RawTraceIdentifier extends Omit<TraceIdentifier, 'validUntil' | 'issuedAt'> {
  validUntil: number | null
  issuedAt: number | null
}

export interface RawTraceEvent extends Omit<TraceEvent, 'eventTime'> {
  eventTime: number
}

export type RawTraceResolution =
  | { outcome: 'identified'; code: string | null; identifier: RawTraceIdentifier; object: TraceObject; events: RawTraceEvent[] }
  | { outcome: 'legacy'; object: TraceObject; events: RawTraceEvent[] }
  | { outcome: 'forbidden'; identifier?: { value: string; status: TraceStatus } }
  | { outcome: 'broken'; identifier: RawTraceIdentifier }
  | { outcome: 'unknown'; value: string }

export function mapTraceIdentifier(raw: RawTraceIdentifier): TraceIdentifier {
  return { ...raw, validUntil: fromUnix(raw.validUntil), issuedAt: fromUnix(raw.issuedAt) }
}

export function mapTraceEvent(raw: RawTraceEvent): TraceEvent {
  return { ...raw, eventTime: fromUnix(raw.eventTime) }
}

/** `value` là chuỗi người dùng vừa quét — backend không trả lại ở nhánh `forbidden`. */
export function mapTraceResolution(raw: RawTraceResolution, value: string): TraceResolution {
  switch (raw.outcome) {
    case 'identified':
      return {
        outcome: 'identified',
        code: raw.code as TraceErrorCode | null,
        identifier: mapTraceIdentifier(raw.identifier),
        object: raw.object,
        events: raw.events.map(mapTraceEvent),
      }
    case 'legacy':
      return { outcome: 'legacy', object: raw.object, events: raw.events.map(mapTraceEvent) }
    case 'forbidden':
      return { outcome: 'forbidden', value: raw.identifier?.value ?? value, status: raw.identifier?.status ?? null }
    case 'broken':
      return { outcome: 'broken', identifier: mapTraceIdentifier(raw.identifier) }
    default:
      return { outcome: 'unknown', value: raw.value }
  }
}
