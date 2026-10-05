import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { SIDE_PANEL_ID } from '../utils/export-sections'

interface ExportJumpProps {
  pageCount: number
  onJump: () => void
}

/**
 * ≤1024px cột xuất rơi xuống DƯỚI cả lưới trang — 50 trang là phải cuộn cả chục
 * màn hình mới thấy nút Tải. Nút dính đáy này đưa thẳng tới đó, tự ẩn khi cột
 * xuất đã lọt vào màn hình. Màn rộng ẩn bằng CSS (cột xuất luôn ở bên phải).
 */
export function ExportJump({ pageCount, onJump }: ExportJumpProps) {
  const [panelVisible, setPanelVisible] = useState(false)

  useEffect(() => {
    const panel = document.getElementById(SIDE_PANEL_ID)
    if (!panel) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting))
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  if (panelVisible) return null
  return (
    <div className="erp-doc-jump">
      <Button className="erp-doc-jump__button" onClick={onJump}>
        <Icon name="download" className="me-2" />
        Xuất tệp ({pageCount} trang)
      </Button>
    </div>
  )
}
