import axios from 'axios'
import type { ErpErrorResponse } from './types'

export const API_ERROR_KIND = {
  network: 'network',
  timeout: 'timeout',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'notFound',
  validation: 'validation',
  /** 429 - flood control cua Drupal (dang nhap sai qua nhieu lan). */
  rateLimited: 'rateLimited',
  server: 'server',
  unknown: 'unknown',
} as const

export type ApiErrorKind = (typeof API_ERROR_KIND)[keyof typeof API_ERROR_KIND]

/** Header ma tra cuu — trung `ApiExceptionSubscriber::CORRELATION_HEADER` (erp_api). */
export const CORRELATION_HEADER = 'X-Correlation-Id'

/**
 * Loi API da chuan hoa. UI chi lam viec voi class nay,
 * khong can biet axios hay hinh dang loi cua Drupal.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  /** Loi theo tung field, dung de do nguoc vao React Hook Form. */
  readonly fieldErrors: Record<string, string[]>
  readonly raw: unknown
  /**
   * Ma tra cuu cua request hong — tim dung dong log ben Drupal bang ma nay.
   * Lay tu header phan hoi; mat mang thi lay ma client da gui (server co the
   * da nhan va ghi log, chi la phan hoi khong ve toi).
   */
  readonly correlationId: string | null
  /**
   * Ma loi MAY DOC trong than phan hoi (`code`), vd `CHECKSUM_MISMATCH`,
   * `SYNC_CONFLICT`, `ASSET_BINARY_MISSING` (erp_evidence API_FRONTEND muc 12),
   * `IN_PROGRESS` (erp_offline). Re nhanh theo ma nay, KHONG theo cau `message`
   * — cau chu co the doi. `null` khi than khong co ma (loi mang, 403 cua Drupal).
   */
  readonly code: string | null
  /**
   * Than phan hoi loi (da parse) — du lieu may chu gui kem loi: ban dang co
   * (`annotation` / `pair` khi SYNC_CONFLICT), `upload` khi UPLOAD_INCOMPLETE,
   * `retry_after` khi RATE_LIMITED. `null` khi khong co than JSON.
   */
  readonly body: Record<string, unknown> | null

  constructor(params: {
    message: string
    kind: ApiErrorKind
    status?: number
    fieldErrors?: Record<string, string[]>
    raw?: unknown
    correlationId?: string | null
    code?: string | null
    body?: Record<string, unknown> | null
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.kind = params.kind
    this.status = params.status ?? 0
    this.fieldErrors = params.fieldErrors ?? {}
    this.raw = params.raw
    this.correlationId = params.correlationId ?? null
    this.code = params.code ?? null
    this.body = params.body ?? null
  }

  get isAuthError() {
    return this.kind === API_ERROR_KIND.unauthorized
  }
}

const MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Không kết nối được máy chủ. Vui lòng kiểm tra đường truyền.',
  timeout: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  notFound: 'Không tìm thấy dữ liệu.',
  validation: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.',
  rateLimited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  server: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
  unknown: 'Đã có lỗi xảy ra.',
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return API_ERROR_KIND.unauthorized
  if (status === 403) return API_ERROR_KIND.forbidden
  if (status === 404) return API_ERROR_KIND.notFound
  if (status === 422 || status === 400) return API_ERROR_KIND.validation
  if (status === 429) return API_ERROR_KIND.rateLimited
  if (status >= 500) return API_ERROR_KIND.server
  return API_ERROR_KIND.unknown
}

/**
 * Loi theo tung field ve dang chung `string[]`.
 * erp_api gui mot chuoi cho moi field; RHF thi nhan ca mang (xem
 * `components/form/applyServerErrors.ts`).
 */
function toFieldErrors(
  errors?: Record<string, string | string[]>,
): Record<string, string[]> {
  if (!errors) return {}

  const result: Record<string, string[]> = {}
  for (const [field, value] of Object.entries(errors)) {
    result[field] = Array.isArray(value) ? value : [value]
  }
  return result
}

/** Doc mot header tu AxiosHeaders HOAC object thuong (headers cua axios co the la ca hai). */
function headerOf(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null
  const h = headers as { get?: (key: string) => unknown } & Record<string, unknown>
  const value = typeof h.get === 'function' ? h.get(name) : (h[name] ?? h[name.toLowerCase()])
  return typeof value === 'string' && value !== '' ? value : null
}

function isBlob(value: unknown): boolean {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

/** Chuyen bat ky loi nao (axios/Drupal/JS) thanh ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError<ErpErrorResponse>(error)) {
    const correlationId =
      headerOf(error.response?.headers, CORRELATION_HEADER) ?? headerOf(error.config?.headers, CORRELATION_HEADER)

    if (error.code === 'ECONNABORTED') {
      return new ApiError({
        message: MESSAGES.timeout,
        kind: API_ERROR_KIND.timeout,
        raw: error,
        correlationId,
      })
    }

    if (!error.response) {
      return new ApiError({
        message: MESSAGES.network,
        kind: API_ERROR_KIND.network,
        raw: error,
        correlationId,
      })
    }

    const status = error.response.status
    const kind = kindFromStatus(status)
    // Than co the la chuoi (trang HTML cua proxy) hoac Blob (request tai tep) —
    // chi doc khoa khi no la object JSON.
    const data: unknown = error.response.data
    const body = data && typeof data === 'object' && !Array.isArray(data) && !isBlob(data)
      ? (data as ErpErrorResponse & Record<string, unknown>)
      : null

    return new ApiError({
      message: (typeof body?.message === 'string' && body.message) || MESSAGES[kind],
      kind,
      status,
      fieldErrors: toFieldErrors(body?.errors),
      raw: error,
      correlationId,
      code: typeof body?.code === 'string' && body.code !== '' ? body.code : null,
      body,
    })
  }

  return new ApiError({
    message: error instanceof Error ? error.message : MESSAGES.unknown,
    kind: API_ERROR_KIND.unknown,
    raw: error,
  })
}
