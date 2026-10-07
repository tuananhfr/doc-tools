import { translate } from '@/i18n/runtime'

/** Phần "cấp tài liệu" đã giữ / bỏ khi dựng tệp PDF mới — xem `services/pdf-carryover.ts`. */
export interface CarryoverReport {
  /** Trường form gốc còn dùng được trong tệp ra. */
  fields: number
  /** Trường trùng tên (trang form nhân bản) phải đổi tên để không dính giá trị nhau. */
  renamedFields: number
  attachments: number
  layers: number
  /** Liên kết nội bộ trỏ tới trang không có trong tệp ra. */
  droppedLinks: number
  /** JavaScript / lệnh chạy tệp gỡ khỏi annotation (spec 07 — không mang nội dung chủ động). */
  removedScripts: number
  /** Chữ ký số của tệp nguồn — tệp ra là tệp mới nên chữ ký không còn hiệu lực. */
  signatures: number
  /** Số tệp nguồn có form XFA — chỉ giữ được phần AcroForm. */
  xfaForms: number
}

export const NO_CARRYOVER: CarryoverReport = {
  fields: 0,
  renamedFields: 0,
  attachments: 0,
  layers: 0,
  droppedLinks: 0,
  removedScripts: 0,
  signatures: 0,
  xfaForms: 0,
}

/** Cộng báo cáo của nhiều tệp ra (tách PDF) — tệp đính kèm / layer lặp ở mỗi phần nên lấy lớn nhất. */
export function addCarryover(a: CarryoverReport, b: CarryoverReport): CarryoverReport {
  return {
    fields: a.fields + b.fields,
    renamedFields: a.renamedFields + b.renamedFields,
    attachments: Math.max(a.attachments, b.attachments),
    layers: Math.max(a.layers, b.layers),
    droppedLinks: a.droppedLinks + b.droppedLinks,
    removedScripts: a.removedScripts + b.removedScripts,
    signatures: Math.max(a.signatures, b.signatures),
    xfaForms: Math.max(a.xfaForms, b.xfaForms),
  }
}

export interface CarryoverSummary {
  tone: 'info' | 'warning'
  text: string
}

/**
 * Một câu cho người dùng sau khi xuất. Nói ra cả phần BỊ BỎ — form mất tương
 * tác hay chữ ký số hết hiệu lực mà im lặng thì người nhận mới phát hiện.
 */
export function carryoverSummary(report: CarryoverReport): CarryoverSummary | null {
  const kept = [
    report.fields && translate('pdf:carryover.fields', { count: report.fields }),
    report.attachments && translate('pdf:carryover.attachments', { count: report.attachments }),
    report.layers && translate('pdf:carryover.layers', { count: report.layers }),
  ].filter(Boolean)
  const dropped = [
    report.droppedLinks && translate('pdf:carryover.droppedLinks', { count: report.droppedLinks }),
    report.removedScripts && translate('pdf:carryover.removedScripts', { count: report.removedScripts }),
  ].filter(Boolean)
  const warnings = [
    report.signatures > 0 && translate('pdf:carryover.signatures', { count: report.signatures }),
    report.xfaForms > 0 && translate('pdf:carryover.xfa'),
  ].filter(Boolean)

  const parts: string[] = []
  if (kept.length) parts.push(translate('pdf:carryover.kept', { items: kept.join(', ') }))
  if (report.renamedFields) parts.push(translate('pdf:carryover.renamed', { count: report.renamedFields }))
  if (dropped.length) parts.push(translate('pdf:carryover.dropped', { items: dropped.join(', ') }))
  parts.push(...(warnings as string[]))
  if (parts.length === 0) return null
  return { tone: warnings.length || report.renamedFields ? 'warning' : 'info', text: parts.join(' ') }
}
