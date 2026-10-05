/**
 * Mười một mã lỗi của mọi công cụ (spec v2.0 §9). Câu báo cho người dùng vẫn là
 * tiếng Việt do từng công cụ viết; mã là thứ ổn định để hỗ trợ và kiểm thử bám
 * vào khi câu chữ đổi.
 */
export const TOOL_ERROR = {
  fileTooLarge: 'FILE_TOO_LARGE',
  pageLimit: 'PAGE_LIMIT_EXCEEDED',
  pixelLimit: 'PIXEL_LIMIT_EXCEEDED',
  unsupportedFormat: 'UNSUPPORTED_FORMAT',
  corruptFile: 'CORRUPT_FILE',
  timeout: 'PROCESSING_TIMEOUT',
  /** Vượt số tệp một lượt — bản Free chưa có quota theo tài khoản. */
  quota: 'QUOTA_EXCEEDED',
  memory: 'MEMORY_LIMIT',
  /** Camera / bộ nhớ tạm bị từ chối, và tệp bị khoá bằng mật khẩu. */
  permission: 'PERMISSION_DENIED',
  exportFailed: 'EXPORT_FAILED',
  unknown: 'UNKNOWN_ERROR',
} as const

export type ToolErrorCode = (typeof TOOL_ERROR)[keyof typeof TOOL_ERROR]

export interface ToolFailure {
  code: ToolErrorCode
  message: string
}

/** Lỗi có mã: ném từ service của công cụ để khung luồng báo đúng loại. */
export class ToolError extends Error {
  readonly code: ToolErrorCode

  constructor(code: ToolErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ToolError'
    this.code = code
  }
}

/** Trình duyệt báo hết bộ nhớ bằng `RangeError` ("Array buffer allocation failed", "Invalid array length"). */
function codeOf(error: unknown): ToolErrorCode | null {
  if (error instanceof ToolError) return error.code
  if (error instanceof RangeError) return TOOL_ERROR.memory
  if (error instanceof Error) {
    // `shared/` không import hub nên lỗi mã hoá canvas của nó được nhận theo tên.
    if (error.name === 'CanvasEncodeError') return TOOL_ERROR.exportFailed
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return TOOL_ERROR.permission
    if (error.name === 'TimeoutError') return TOOL_ERROR.timeout
  }
  return null
}

/**
 * Mã + câu báo của một lỗi bất kỳ. Service hay bọc lỗi gốc để thêm tên tệp
 * (`new Error('"a.jpg": …', { cause })`), nên mã được tìm dọc theo chuỗi `cause`.
 */
export function describeError(error: unknown, fallback: string): ToolFailure {
  const message = error instanceof Error && error.message ? error.message : fallback
  let current: unknown = error
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = codeOf(current)
    if (code) return { code, message }
    current = current instanceof Error ? current.cause : null
  }
  return { code: TOOL_ERROR.unknown, message }
}
