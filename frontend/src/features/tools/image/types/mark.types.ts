import type { Rect } from './image.types'

export const MARK_ANCHORS = ['topLeft', 'topCenter', 'topRight', 'middleLeft', 'center', 'middleRight', 'bottomLeft', 'bottomCenter', 'bottomRight'] as const
export type MarkAnchor = (typeof MARK_ANCHORS)[number]

export type MarkColor = 'red' | 'black' | 'white'

/** Dòng chữ đóng lên ảnh. `text` rỗng = không đóng dấu. */
export interface TextStamp {
  text: string
  anchor: MarkAnchor
  /** Cỡ chữ theo tỉ lệ cạnh NGẮN của ảnh — cùng một mức ra cùng độ lớn tương đối trên ảnh 1 MP lẫn 12 MP. */
  sizeRatio: number
  /** 0,1–1. */
  opacity: number
  color: MarkColor
  /** Lặp chéo khắp ảnh thay vì đặt ở một góc. */
  tile: boolean
}

/** Mọi thứ người dùng đã vẽ lên một ảnh. `boxes` theo điểm ảnh của ảnh gốc (đã xoay theo EXIF). */
export interface MarkState {
  boxes: Rect[]
  stamp: TextStamp
}
