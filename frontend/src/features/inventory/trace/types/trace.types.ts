/** Trạng thái định danh — khớp `TraceStatus` (erp_trace). EXPIRED do backend suy ra từ hạn, không lưu. */
export const TRACE_STATUS = {
  draft: 'DRAFT',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  suspended: 'SUSPENDED',
  revoked: 'REVOKED',
  replaced: 'REPLACED',
  archived: 'ARCHIVED',
} as const

export type TraceStatus = (typeof TRACE_STATUS)[keyof typeof TRACE_STATUS]

/** 12 mã lỗi ổn định của spec mục 17 — khớp `TraceError` (erp_trace). */
export const TRACE_ERROR = {
  invalidCode: 'INVALID_CODE',
  unsupportedSymbology: 'UNSUPPORTED_SYMBOLOGY',
  identifierNotFound: 'IDENTIFIER_NOT_FOUND',
  identifierExpired: 'IDENTIFIER_EXPIRED',
  identifierRevoked: 'IDENTIFIER_REVOKED',
  identifierReplaced: 'IDENTIFIER_REPLACED',
  objectNotFound: 'OBJECT_NOT_FOUND',
  forbidden: 'FORBIDDEN',
  rateLimited: 'RATE_LIMITED',
  offlinePending: 'OFFLINE_PENDING',
  labelRenderFailed: 'LABEL_RENDER_FAILED',
  batchPartialFailure: 'BATCH_PARTIAL_FAILURE',
} as const

export type TraceErrorCode = (typeof TRACE_ERROR)[keyof typeof TRACE_ERROR]

/** Đợt đầu chỉ có vật tư + tài sản (`supplies`). */
export type TraceObjectType = 'supplies'

export interface TraceObjectRef {
  type: TraceObjectType
  id: number
}

export interface TraceObject extends TraceObjectRef {
  bundle: string
  /** Nhãn loại theo bundle: "Vật tư" / "Tài sản". */
  kind: string
  name: string
  code: string
  unit: string
  serial: string
}

export interface TraceIdentifier {
  id: number
  objectType: TraceObjectType
  objectId: number
  identifierType: string
  /** Giá trị người đọc được — in dưới mã, bất biến sau khi phát hành. */
  value: string
  carrier: string
  resolverKey: string
  /** URL đặt trong QR — trang tra mã công khai `/t/{key}` của Drupal. */
  resolverUrl: string
  status: TraceStatus
  permanent: boolean
  validUntil: string
  replacedBy: { id: number; resolverKey: string } | null
  printCount: number
  issuedAt: string
}

export interface TraceEvent {
  id: number
  eventType: string
  eventLabel: string
  eventTime: string
  location: string
  note: string
  qty: number | null
  unit: string
  source: 'online' | 'offline'
  actor: string
}

/**
 * Kết quả tra một chuỗi vừa quét. `unknown` KHÔNG phải lỗi: mã đọc được, chỉ
 * là chưa vào sổ — giao diện vẫn cho chép giá trị thô.
 */
export type TraceResolution =
  | { outcome: 'identified'; code: TraceErrorCode | null; identifier: TraceIdentifier; object: TraceObject; events: TraceEvent[] }
  | { outcome: 'legacy'; object: TraceObject; events: TraceEvent[] }
  | { outcome: 'forbidden'; value: string; status: TraceStatus | null }
  | { outcome: 'broken'; identifier: TraceIdentifier }
  | { outcome: 'unknown'; value: string }

export type TraceTransition = 'activate' | 'suspend' | 'revoke' | 'replace'

interface TraceRowError {
  code: TraceErrorCode | null
  message: string
}

/** Một dòng của lô in nhãn: có mã + dữ liệu đối tượng, hoặc lý do bị loại. */
export interface TraceLabelTarget extends TraceObjectRef {
  identifier: TraceIdentifier | null
  object: TraceObject | null
  error: TraceRowError | null
}

export interface TraceBatchError {
  identifierId: number
  error: TraceRowError
}
