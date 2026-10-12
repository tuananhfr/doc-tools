/** Tốc độ đọc theo spec v3 §06: 0.75×–1.5×. */
export const READ_RATE = { min: 0.75, max: 1.5, step: 0.05 } as const

/**
 * Một lượt đọc tối đa chừng này ký tự. Giọng của máy phải xếp hàng MỌI câu ngay trong lượt bấm (iOS), và tệp WAV của
 * Piper giữ cả lượt trong RAM — văn bản dài hơn được chia thành nhiều phần để chọn.
 */
export const READ_PART_CHARS = 20_000
/** Trần cứng của một nguồn: quá mức này ô nhập và khung đọc đã ì trên điện thoại. */
export const READ_TEXT_MAX_CHARS = 1_000_000
/** TXT / DOCX được đọc cả tệp vào RAM; PDF dùng trần chung `TOOL_LIMITS.fileBytes`. */
export const READ_FILE_MAX_BYTES = 20 * 1024 * 1024
/** Cỡ `word/document.xml` khai trong zip — kiểm TRƯỚC khi giải nén để chặn tệp "bom". */
export const READ_DOCX_XML_MAX_BYTES = 50 * 1024 * 1024
/** OCR một trang mất vài chục giây trên điện thoại; quá số này thì phần còn lại bị bỏ và báo ra. */
export const READ_OCR_MAX_PAGES = 20

/** Thẻ "Link bài viết" cần máy chủ tải trang hộ (WP4-B, chờ Legal). Tắt thì thẻ không hiện. */
export const READ_LINK_TAB_ENABLED = false

export const READ_REMEMBER_KEY = 'cn.readAloud.remember'
export const READ_POSITIONS_KEY = 'cn.readAloud.positions'
export const READ_POSITIONS_MAX = 20
