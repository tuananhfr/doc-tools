import { useEffect, useRef } from 'react'
import type { ReadingHighlight } from '../types/reading.types'
import type { ReadFontScale } from '../types/read-listen.types'

interface ReadingViewProps {
  text: string
  highlight: ReadingHighlight | null
  label: string
  describedBy?: string
  fontScale?: ReadFontScale
}

/** Văn bản đang đọc, chỉ để xem: `textarea` không tô được một phần chữ, và sửa giữa chừng làm lệch vị trí đang đọc. */
export function ReadingView({ text, highlight, label, describedBy, fontScale = 'normal' }: ReadingViewProps) {
  const box = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLElement>(null)
  const start = highlight?.start

  // Chỉ cuộn khung đọc, không cuộn cả trang: `scrollIntoView` kéo trang đi khi người dùng đang xem bảng điều khiển.
  useEffect(() => {
    const container = box.current
    const current = mark.current
    if (!container || !current) return
    // Khung có `position: relative` nên `offsetTop` của câu tính từ đầu khung.
    const top = current.offsetTop
    const bottom = top + current.offsetHeight
    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = Math.max(0, top - container.clientHeight / 3)
    }
  }, [start])

  const body = highlight ? <>
    {text.slice(0, highlight.start)}
    <mark ref={mark} className="erp-read-view__sentence">
      {highlight.wordStart !== undefined && highlight.wordEnd !== undefined ? <>
        {text.slice(highlight.start, highlight.wordStart)}
        <span className="erp-read-view__word">{text.slice(highlight.wordStart, highlight.wordEnd)}</span>
        {text.slice(highlight.wordEnd, highlight.end)}
      </> : text.slice(highlight.start, highlight.end)}
    </mark>
    {text.slice(highlight.end)}
  </> : text

  return <div ref={box} className={`form-control erp-read-view erp-read-text--${fontScale}`} role="region" tabIndex={0} aria-label={label} aria-describedby={describedBy}>
    {body}
  </div>
}
