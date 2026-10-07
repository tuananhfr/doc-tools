import { translate } from '@/i18n/runtime'

/** Trình duyệt chỉ đưa `getUserMedia` cho trang HTTPS / localhost. */
export function cameraAvailable(): boolean {
  return typeof navigator !== 'undefined' && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)
}

/** Đổi lỗi của `getUserMedia` thành câu người dùng làm theo được. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return translate('common:camera.blocked')
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return translate('common:camera.notFound')
  if (name === 'NotReadableError' || name === 'AbortError') return translate('common:camera.busy')
  return translate('common:camera.failed')
}
