/**
 * Tuỳ chọn "Chữ lớn" (spec v3 §04 "Senior mode", quyết định Q6) — nhớ TRÊN MÁY NÀY, không gửi đi đâu,
 * không hỏi tuổi. Khoá riêng (không nằm trong store `erpcons.app`) vì script chặn đầu trang phải đọc được
 * nó trước khi React hydrate, kẻo trang vẽ 16px rồi mới nhảy lên 18px.
 */
export const TEXT_SIZES = ['normal', 'large'] as const
export type TextSize = (typeof TEXT_SIZES)[number]

export const TEXT_SIZE_KEY = 'cn.textSize'

/** Chỉ đúng chuỗi `large` mới bật — giá trị lạ do bản cũ hay tay người ghi coi như mặc định. */
export function textSizeFromStorage(raw: string | null): TextSize {
  return raw === 'large' ? 'large' : 'normal'
}

// Chế độ riêng tư / SSR không có storage: đọc không được thì coi như chữ thường.
export function readTextSize(): TextSize {
  try {
    return textSizeFromStorage(localStorage.getItem(TEXT_SIZE_KEY))
  } catch {
    return 'normal'
  }
}

export function writeTextSize(size: TextSize): void {
  try {
    if (size === 'large') localStorage.setItem(TEXT_SIZE_KEY, 'large')
    else localStorage.removeItem(TEXT_SIZE_KEY)
  } catch {
    // Không ghi được thì lần sau về mặc định — không đáng báo lỗi.
  }
}

/** Chạy inline trong `<head>` trước mọi script khác; phải tự bọc try vì không có React lo hộ. */
export const TEXT_SIZE_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})==='large')document.documentElement.dataset.textSize='large'}catch(e){}`
