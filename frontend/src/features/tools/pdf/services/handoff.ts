import { handOff, takeHandoff as takeFor } from '@/features/tools/shared'

/**
 * Đường cũ của "Sửa tiếp" công cụ PDF nhanh → trình chỉnh sửa. Handoff đã chuyển sang
 * `tools/shared/handoff.ts` (dùng chung cho ảnh thẻ, CV…); giữ hai hàm này để chỗ gọi cũ
 * (`QuickToolShell`, `DocToolsPage`) không phải sửa. Đích là màn `editor`.
 */
export function handOffFiles(files: File[]): void {
  handOff('editor', files)
}

/** Lấy MỘT lần: F5 hay quay lại trình chỉnh sửa lần sau không nạp lại tệp cũ. */
export function takeHandoff(): File[] {
  return takeFor('editor')
}
