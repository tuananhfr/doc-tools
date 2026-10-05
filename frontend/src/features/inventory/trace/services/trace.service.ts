import { http } from '@/api'
import type {
  TraceBatchError,
  TraceIdentifier,
  TraceLabelTarget,
  TraceObjectRef,
  TraceResolution,
  TraceTransition,
} from '../types/trace.types'
import { mapTraceIdentifier, mapTraceResolution } from './trace.mapper'
import type { RawTraceIdentifier, RawTraceResolution } from './trace.mapper'

/**
 * API truy xuất — `erp_trace` (`/api/v1/trace/*`). Trang tra mã công khai
 * `/t/{key}` do Drupal tự render, React không gọi.
 */
const BASE = '/trace'

export interface CreateIdentifierPayload extends TraceObjectRef {
  /** Bỏ trống = mã nội bộ của đối tượng. */
  value?: string
  activate?: boolean
}

export const traceService = {
  async resolve(value: string): Promise<TraceResolution> {
    const res = await http.get<{ result: RawTraceResolution }>(`${BASE}/resolve`, { value })
    return mapTraceResolution(res.result, value)
  },

  async identifiers(ref: TraceObjectRef): Promise<TraceIdentifier[]> {
    const res = await http.get<{ items: RawTraceIdentifier[] }>(`${BASE}/objects/${ref.type}/${ref.id}/identifiers`)
    return res.items.map(mapTraceIdentifier)
  },

  async create({ type, id, value, activate }: CreateIdentifierPayload): Promise<TraceIdentifier> {
    const res = await http.post<{ identifier: RawTraceIdentifier }>(`${BASE}/identifiers`, { objectType: type, objectId: id, value, activate })
    return mapTraceIdentifier(res.identifier)
  },

  async transition(id: number, action: TraceTransition, reason = ''): Promise<TraceIdentifier> {
    const res = await http.post<{ identifier: RawTraceIdentifier }>(`${BASE}/identifiers/${id}/${action}`, { reason })
    return mapTraceIdentifier(res.identifier)
  },

  /** Ghi nhật ký in / in lại — gọi SAU khi tệp nhãn đã dựng xong. */
  async reprint(id: number, copies: number, reason = ''): Promise<TraceIdentifier> {
    const res = await http.post<{ identifier: RawTraceIdentifier }>(`${BASE}/identifiers/${id}/reprint`, { copies, reason })
    return mapTraceIdentifier(res.identifier)
  },

  /** Mã để in nhãn cho cả lô — đối tượng chưa có mã được phát hành mã luôn. Lỗi từng dòng không chặn lô. */
  async prepareLabels(objects: TraceObjectRef[]): Promise<TraceLabelTarget[]> {
    const res = await http.post<{ items: RawLabelTarget[] }>(`${BASE}/labels/prepare`, { objects })
    return res.items.map((item) => ({ ...item, identifier: item.identifier ? mapTraceIdentifier(item.identifier) : null }))
  },

  /** Nhật ký in cho cả lô, sau khi PDF đã dựng xong. Trả các dòng ghi không được. */
  async labelsPrinted(items: { identifierId: number; copies: number }[], reason = ''): Promise<TraceBatchError[]> {
    const res = await http.post<{ items: { identifierId: number; error: TraceBatchError['error'] | null }[] }>(`${BASE}/labels/printed`, { items, reason })
    return res.items.filter((item): item is TraceBatchError => item.error !== null)
  },
}

interface RawLabelTarget extends Omit<TraceLabelTarget, 'identifier'> {
  identifier: RawTraceIdentifier | null
}
