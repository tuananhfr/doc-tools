import type { ReactNode } from 'react'
import type { Rotation } from '../types/doc-tools.types'
import { visualSize, type Size } from '../utils/page-geometry'

interface PageSheetProps {
  url: string
  /** Khổ trang (pt) trước khi áp xoay thêm. */
  base: Size
  rotation: Rotation
  overlay: (size: Size) => ReactNode
}

/**
 * Tờ giấy trong ô thu nhỏ: khung mang đúng tỉ lệ trang SAU khi xoay, ảnh xoay
 * bên trong, lớp phủ KHÔNG xoay — số trang phải nằm ở chân tờ giấy người đọc
 * thấy, không xoay theo nội dung.
 */
export function PageSheet({ url, base, rotation, overlay }: PageSheetProps) {
  const size = visualSize(base, rotation)
  const sideways = rotation === 90 || rotation === 270
  const landscape = size.width >= size.height

  return (
    <div
      className="erp-doc-sheet"
      style={{ aspectRatio: `${size.width} / ${size.height}`, [landscape ? 'width' : 'height']: '100%' }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        className="erp-doc-sheet__img"
        style={{
          width: sideways ? `${(size.height / size.width) * 100}%` : '100%',
          height: sideways ? `${(size.width / size.height) * 100}%` : '100%',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      />
      {overlay(size)}
    </div>
  )
}
