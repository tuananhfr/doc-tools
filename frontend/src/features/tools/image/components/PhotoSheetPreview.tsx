import { useTranslation } from 'react-i18next'
import type { SheetLayout } from '../utils/photo-layout'

interface PhotoSheetPreviewProps {
  layout: SheetLayout
}

/** Sơ đồ tờ in thu nhỏ: tờ giấy và vị trí từng ảnh, vẽ theo đúng số đo milimét của bố cục. */
export function PhotoSheetPreview({ layout }: PhotoSheetPreviewProps) {
  const { t } = useTranslation('image')
  return (
    <svg
      className="erp-photo-sheet"
      viewBox={`0 0 ${layout.paper.width} ${layout.paper.height}`}
      role="img"
      aria-label={t('idPhoto.sheetAria', { count: layout.cells.length })}
    >
      <rect className="erp-photo-sheet__paper" x={0} y={0} width={layout.paper.width} height={layout.paper.height} />
      {layout.cells.map((cell, index) => (
        <rect key={index} className="erp-photo-sheet__cell" x={cell.x} y={cell.y} width={layout.photo.width} height={layout.photo.height} />
      ))}
    </svg>
  )
}
