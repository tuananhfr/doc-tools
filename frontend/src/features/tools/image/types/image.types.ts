/** Ba định dạng trình duyệt vừa đọc vừa ghi được bằng canvas. HEIC không nằm trong số đó. */
export type ImageFormat = 'jpeg' | 'png' | 'webp'

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** Toạ độ theo ĐIỂM ẢNH của ảnh (gốc trên-trái), không theo điểm trên màn hình. */
export interface Rect extends Point, Size {}

export type Rotation = 0 | 90 | 180 | 270

/** Một ảnh người dùng đã chọn. `file` nằm trên đĩa của người dùng — chỉ giải mã khi cần. */
export interface ImageItem extends Size {
  id: string
  file: File
  name: string
  size: number
  format: ImageFormat
  /** URL của chính tệp gốc, để hiện ảnh ở cỡ đầy đủ. Do `useImageFiles` thu hồi. */
  url: string
  /** URL ảnh thu nhỏ; null khi không vẽ được — danh sách hiện icon thay thế. */
  thumbnail: string | null
}
