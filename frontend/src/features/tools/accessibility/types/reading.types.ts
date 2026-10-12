/** Phần đang đọc, tính bằng vị trí trong văn bản gốc. Chỉ có `word*` khi trình duyệt báo ranh giới từ. */
export interface ReadingHighlight {
  start: number
  end: number
  wordStart?: number
  wordEnd?: number
}
