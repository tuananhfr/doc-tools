/**
 * Bảng giới hạn của MỌI công cụ (Limit Matrix, spec v2.0 §10) — một chỗ duy nhất
 * để đổi số. Căn cứ đo ở `docs/modules/doc-tools-registry.md` mục 7.5: mọi thứ
 * chạy trong RAM của tab, công cụ nào giữ cả lô tệp cùng lúc thì bộ nhớ tăng
 * 5–6 lần dung lượng đầu vào.
 */
const MB = 1024 * 1024

export const TOOL_LIMITS = {
  /** Một tệp đầu vào. */
  fileBytes: 100 * MB,
  /** Số tệp trong một lượt. */
  batchFiles: 100,
  /** Tổng dung lượng của công cụ GIỮ mọi tệp trong RAM (ghép PDF, scan ảnh → PDF, trình chỉnh sửa). */
  heldBytes: 300 * MB,
  /** Tệp ra nặng hơn mức này thì cảnh báo: không nạp lại được vào công cụ nào ở đây. */
  outputWarnBytes: 100 * MB,
  /** Tổng số trang của một lượt / một phiên chỉnh sửa. */
  totalPages: 500,
  /** 80 triệu điểm ảnh ≈ 320 MB lúc giải mã — đủ cho máy ảnh 50 MP, chặn ảnh ghép toàn cảnh làm sập tab. */
  imagePixels: 80_000_000,
  /** Điện thoại: một ảnh 79 MP cần ~2 GB để đổi định dạng (mục 7.5) — quá sức một tab di động. */
  imagePixelsTouch: 50_000_000,
  /** Số ảnh chụp trong một lượt mở camera. */
  cameraShots: 50,
} as const

export const MAX_IMAGE_BYTES = TOOL_LIMITS.fileBytes

/** Trần điểm ảnh của THIẾT BỊ này: màn cảm ứng không có chuột coi là điện thoại / máy tính bảng. */
export function maxImagePixels(): number {
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0
  return touch ? TOOL_LIMITS.imagePixelsTouch : TOOL_LIMITS.imagePixels
}

/** "300 MB" — số trần in ra trong câu từ chối. */
export const megabytes = (bytes: number): string => `${Math.round(bytes / MB)} MB`
