import type { FlowOutput } from '../types/flow.types'

/** Trình duyệt tự mở được trong tab mới; .zip / .docx / .xlsx thì không. */
const PREVIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']

const ICON_BY_EXTENSION: Record<string, string> = {
  pdf: 'file-earmark-pdf',
  zip: 'file-earmark-zip',
  docx: 'file-earmark-word',
  xlsx: 'file-earmark-excel',
  txt: 'file-earmark-text',
  jpg: 'file-earmark-image',
  png: 'file-earmark-image',
  webp: 'file-earmark-image',
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function outputIcon(name: string): string {
  return ICON_BY_EXTENSION[extensionOf(name)] ?? 'file-earmark'
}

export function canPreview(type: string): boolean {
  return PREVIEWABLE.includes(type.split(';')[0].trim())
}

/** Thu hồi muộn: thu hồi ngay thì Safari/Firefox huỷ lượt tải hoặc tab xem trước chưa kịp đọc. */
function temporaryUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return url
}

export function downloadOutput(output: FlowOutput): void {
  const link = document.createElement('a')
  link.href = temporaryUrl(output.blob)
  link.download = output.name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function previewOutput(output: FlowOutput): void {
  window.open(temporaryUrl(output.blob), '_blank', 'noopener')
}

function shareFile(output: FlowOutput): File {
  return new File([output.blob], output.name, { type: output.blob.type })
}

/** Chia sẻ TỆP chỉ có ở vài trình duyệt (chủ yếu điện thoại) — không có thì không vẽ nút. */
export function canShare(output: FlowOutput): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [shareFile(output)] })
  } catch {
    return false
  }
}

/** `false` = người dùng đóng bảng chia sẻ; lỗi thật thì ném ra. */
export async function shareOutput(output: FlowOutput): Promise<boolean> {
  try {
    await navigator.share({ files: [shareFile(output)], title: output.name })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}
