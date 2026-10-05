import { useRef, useState, type DragEvent } from 'react'
import type { InsertPosition, PageRef, SourceFile } from '../types/doc-tools.types'
import type { Placement } from '../hooks/useDocWorkspace'
import type { SelectMode } from '../utils/workspace-reducer'
import type { StampView } from './DecorationOverlay'
import { PageThumb } from './PageThumb'

interface PageGridProps {
  pages: PageRef[]
  sources: Record<string, SourceFile>
  stamp: StampView
  /** Số kết quả tìm trên từng trang (khoá = PageRef.id). */
  hitCounts: Map<string, number>
  selected: string[]
  onSelect: (id: string, mode: SelectMode) => void
  onPreview: (id: string) => void
  onShift: (id: string, delta: -1 | 1) => void
  onMove: (ids: string[], targetIndex: number) => void
  onDropFiles: (files: File[], placement: Placement) => void
}

interface DropTarget {
  id: string
  side: InsertPosition
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

/**
 * Lưới trang: bấm để chọn (Shift = chọn dải), kéo để đổi chỗ, thả tệp từ máy
 * vào giữa hai trang để chèn đúng chỗ đó. Kéo thả HTML5 không chạy bằng cảm
 * ứng — trên điện thoại dùng nút ←/→ của từng thẻ.
 */
export function PageGrid({ pages, sources, stamp, hitCounts, selected, onSelect, onPreview, onShift, onMove, onDropFiles }: PageGridProps) {
  const selectedSet = new Set(selected)
  // `dataTransfer.getData` không đọc được lúc dragover — giữ danh sách đang kéo ở ref.
  const dragging = useRef<string[] | null>(null)
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  const [target, setTarget] = useState<DropTarget | null>(null)

  const endDrag = () => {
    dragging.current = null
    setDraggingIds([])
    setTarget(null)
  }

  const handleDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    const ids = selectedSet.has(id) ? pages.filter((page) => selectedSet.has(page.id)).map((page) => page.id) : [id]
    dragging.current = ids
    setDraggingIds(ids)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${ids.length} trang`)
  }

  const handleDragOver = (event: DragEvent<HTMLElement>, id: string) => {
    if (!dragging.current && !hasFiles(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = dragging.current ? 'move' : 'copy'

    const rect = event.currentTarget.getBoundingClientRect()
    const side: InsertPosition = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
    if (target?.id !== id || target.side !== side) setTarget({ id, side })
  }

  const handleDrop = (event: DragEvent<HTMLElement>, id: string, index: number) => {
    event.preventDefault()
    event.stopPropagation()
    const side = target?.id === id ? target.side : 'after'

    if (dragging.current) {
      onMove(dragging.current, side === 'before' ? index : index + 1)
    } else {
      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) onDropFiles(files, { anchorId: id, position: side })
    }
    endDrag()
  }

  return (
    <ol
      className="erp-doc-grid"
      aria-label="Các trang của tài liệu"
      onDragOver={(event) => {
        if (!dragging.current && !hasFiles(event)) return
        event.preventDefault()
      }}
      onDrop={(event) => {
        // Thả vào khoảng trống sau thẻ cuối → cuối tài liệu.
        event.preventDefault()
        if (dragging.current) {
          onMove(dragging.current, pages.length)
        } else {
          const files = Array.from(event.dataTransfer.files)
          if (files.length > 0) onDropFiles(files, { anchorId: null, position: 'after' })
        }
        endDrag()
      }}
    >
      {pages.map((page, index) => (
        <PageThumb
          key={page.id}
          page={page}
          position={index + 1}
          total={pages.length}
          source={sources[page.sourceId]}
          stamp={stamp}
          hitCount={hitCounts.get(page.id) ?? 0}
          selected={selectedSet.has(page.id)}
          dragging={draggingIds.includes(page.id)}
          dropSide={target?.id === page.id ? target.side : null}
          onSelect={(event) => onSelect(page.id, event.shiftKey ? 'range' : 'toggle')}
          onPreview={() => onPreview(page.id)}
          onShift={(delta) => onShift(page.id, delta)}
          onDragStart={(event) => handleDragStart(event, page.id)}
          onDragOver={(event) => handleDragOver(event, page.id)}
          onDrop={(event) => handleDrop(event, page.id, index)}
          onDragEnd={endDrag}
        />
      ))}
    </ol>
  )
}
