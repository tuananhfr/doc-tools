import type { ImageItem } from '@/features/tools/image'

/** Ảnh đang hiện trong vùng làm việc — mọi toạ độ của trạng thái tính theo ảnh này. */
export interface SourceView {
  url: string
  width: number
  height: number
}

export type OrientationSourceFile =
  | { kind: 'image'; item: ImageItem; view: SourceView }
  | {
      kind: 'pdf'
      name: string
      bytes: Uint8Array
      pageCount: number
      pageIndex: number
      view: SourceView
      /** Cỡ trang như người xem thấy (đã xoay), điểm PDF. */
      points: { width: number; height: number }
    }
  | { kind: 'none' }
