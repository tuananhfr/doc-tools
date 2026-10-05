/**
 * Luồng ba bước của một công cụ nhanh: chọn tệp → chạy → kết quả.
 *
 * Khung này không biết gì về PDF hay ảnh: công cụ đưa vào danh sách tệp để
 * hiện và một `FlowTask` trả về tệp kết quả. Mọi thứ chạy trong trình duyệt,
 * tệp kết quả chỉ là một `Blob` trong RAM cho tới khi người dùng bấm Tải về.
 */
import type { ToolErrorCode, ToolFailure } from '../utils/tool-error'

/** Một tệp người dùng đã chọn, đủ để vẽ một dòng trong danh sách. */
export interface FlowFile {
  id: string
  name: string
  size: number
  icon: string
  /** "12 trang", "Ảnh"… */
  detail?: string
  /** Ảnh thu nhỏ (URL do công cụ cấp và tự thu hồi). */
  thumbnail?: string
}

export interface FlowRejected {
  name: string
  code: ToolErrorCode
  reason: string
}

export interface FlowOutput {
  name: string
  blob: Blob
  /** "17 trang", "3 tệp PDF"… */
  detail?: string
}

export type FlowTone = 'success' | 'info' | 'warning'

export interface FlowNote {
  tone: FlowTone
  text: string
}

export interface FlowResult {
  title: string
  /** Bỏ trống = `success`. Lượt chạy xong nhưng không đạt điều người dùng muốn (nén không nhẹ hơn) thì `warning`. */
  tone?: FlowTone
  output: FlowOutput
  /** Điều người dùng cần biết về tệp vừa ra: nén được bao nhiêu, thứ gì không giữ được… */
  notes: FlowNote[]
  /** Kết quả là chữ (OCR, báo cáo so sánh): hiện ngay trên màn kết quả để xem và sao chép. */
  text?: string
  /** Tên khối chữ đó; bỏ trống = "Nội dung văn bản". */
  textLabel?: string
}

export interface FlowProgress {
  done: number
  total: number
  label?: string
}

export interface FlowStep {
  signal: AbortSignal
  onProgress: (done: number, total: number, label?: string) => void
}

export type FlowTask = (step: FlowStep) => Promise<FlowResult>

export type FlowState =
  | { phase: 'idle'; error: ToolFailure | null }
  | { phase: 'running'; progress: FlowProgress | null }
  | { phase: 'done'; result: FlowResult }
