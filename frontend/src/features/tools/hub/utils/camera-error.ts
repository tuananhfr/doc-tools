/** Lý do camera không dùng được ở ngữ cảnh không an toàn (`http://<IP LAN>`). */
export const CAMERA_INSECURE = 'Camera chỉ dùng được khi mở trang bằng HTTPS (hoặc localhost).'

/** Trình duyệt chỉ đưa `getUserMedia` cho trang HTTPS / localhost. */
export function cameraAvailable(): boolean {
  return typeof navigator !== 'undefined' && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)
}

/** Đổi lỗi của `getUserMedia` thành câu người dùng làm theo được. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Trình duyệt đang chặn camera với trang này. Bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép, rồi thử lại.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy camera trên máy này.'
  if (name === 'NotReadableError' || name === 'AbortError') return 'Camera đang được ứng dụng khác dùng. Đóng ứng dụng đó rồi thử lại.'
  return 'Không mở được camera.'
}
