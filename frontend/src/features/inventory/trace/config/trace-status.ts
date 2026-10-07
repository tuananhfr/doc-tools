import type { StatusMeta } from '@/components/common'
import { TRACE_STATUS, type TraceStatus } from '../types/trace.types'

/** Tông của trạng thái mã (nhãn ở `qr:trace.status.<STATUS>`); `StatusTag` tự gắn icon theo tông. */
export const TRACE_STATUS_TONE: Record<TraceStatus, StatusMeta['tone']> = {
  [TRACE_STATUS.draft]: 'neutral',
  [TRACE_STATUS.active]: 'success',
  [TRACE_STATUS.expired]: 'warning',
  [TRACE_STATUS.suspended]: 'warning',
  [TRACE_STATUS.revoked]: 'danger',
  [TRACE_STATUS.replaced]: 'info',
  [TRACE_STATUS.archived]: 'neutral',
}

/** Trạng thái không dùng bình thường được, có câu giải thích ở `qr:trace.notes.<STATUS>` (spec mục 15). */
export const TRACE_NOTE_STATUSES = [TRACE_STATUS.expired, TRACE_STATUS.suspended, TRACE_STATUS.revoked, TRACE_STATUS.replaced, TRACE_STATUS.archived] as const
export type TraceNoteStatus = (typeof TRACE_NOTE_STATUSES)[number]
