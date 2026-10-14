import { QR_TEXT_MAX } from '@/features/embed/embed-protocol'
import { readScanContent } from './scan-content'

/** Mã truy xuất ERPCons là chữ thường hoặc link `/t/<key>`; Wi-Fi, số điện thoại, email thì không bao giờ. */
export const TRACEABLE_KINDS: ReadonlySet<string> = new Set(['text', 'url'])

/** Chuỗi gửi cho trang cha tra mã, hoặc null khi lần quét này không đáng tra. */
export function traceReportText(text: string): string | null {
  if (text.trim() === '' || !TRACEABLE_KINDS.has(readScanContent(text).kind)) return null
  return text.slice(0, QR_TEXT_MAX)
}
