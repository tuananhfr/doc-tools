import { useEffect, useRef, useState, type RefObject } from 'react'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { measurePage, PREVIEW_MAX_AREA, renderPreview, type PageSize } from '../services/page-preview'
import { sheetKey } from '../utils/image-sheet'
import { resolveZoom, targetPixelRatio, type Box, type ZoomMode } from '../utils/preview-zoom'

/** Chờ người dùng ngừng bấm +/− (hoặc ngừng kéo cửa sổ) rồi mới vẽ lại — mỗi lần vẽ A3 ở 300% mất cả trăm ms. */
const RERENDER_DELAY = 150

export type PreviewStatus = 'loading' | 'ready' | 'error'

export interface PagePreview {
  /** Nơi gắn canvas — canvas được gắn thẳng, không đổi ra ảnh để khỏi tốn một lượt mã hoá JPEG/PNG. */
  host: RefObject<HTMLDivElement | null>
  size: PageSize | null
  zoom: number | null
  status: PreviewStatus
}

type Measured = { key: string; size: PageSize | null }
type Rendered = { key: string; ratio: number }

/**
 * Vẽ một trang ở độ phân giải hợp với mức phóng đang xem. Phóng to quá độ phân
 * giải đã vẽ thì vẽ lại; thu nhỏ thì giữ canvas cũ (thu bằng CSS vẫn nét).
 */
export function usePagePreview(source: SourceFile, page: PageRef, mode: ZoomMode, frame: Box | null): PagePreview {
  const host = useRef<HTMLDivElement>(null)
  // pdf.js dùng chung một đối tượng trang cho mọi lần vẽ và `cleanup()` sau mỗi
  // lần — hai lần vẽ chồng nhau thì lần sau có thể ra canvas trắng. Xếp hàng.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const [measured, setMeasured] = useState<Measured | null>(null)
  const [rendered, setRendered] = useState<Rendered | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)

  const key = `${source.id}:${page.pageIndex}:${page.rotation}:${sheetKey(page.sheet)}`

  useEffect(() => {
    let alive = true
    measurePage(source, page).then(
      (size) => alive && setMeasured({ key, size }),
      () => alive && setMeasured({ key, size: null }),
    )
    return () => {
      alive = false
    }
  }, [source, page, key])

  const size = measured?.key === key ? measured.size : null
  const zoom = size && frame ? resolveZoom(mode, size, frame) : null
  const ratio =
    size && zoom !== null
      ? targetPixelRatio(zoom, window.devicePixelRatio || 1, size, PREVIEW_MAX_AREA)
      : null
  const renderedRatio = rendered?.key === key ? rendered.ratio : 0
  const needsRender = ratio !== null && ratio > renderedRatio * 1.001

  // Sang trang khác: gỡ canvas trang cũ ngay, đừng để nó hiện dưới khung của trang mới.
  useEffect(() => {
    if (rendered?.key !== key) host.current?.replaceChildren()
  }, [key, rendered?.key])

  useEffect(() => {
    if (!needsRender || ratio === null) return
    let cancelled = false
    const timer = window.setTimeout(
      () => {
        queue.current = queue.current.then(async () => {
          if (cancelled) return
          try {
            const canvas = await renderPreview(source, page, ratio)
            if (cancelled) return
            host.current?.replaceChildren(canvas)
            setRendered({ key, ratio })
          } catch {
            if (!cancelled) setFailedKey(key)
          }
        })
      },
      renderedRatio === 0 ? 0 : RERENDER_DELAY,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [needsRender, ratio, renderedRatio, source, page, key])

  const measureFailed = measured?.key === key && measured.size === null
  const status: PreviewStatus =
    measureFailed || failedKey === key ? 'error' : rendered?.key === key ? 'ready' : 'loading'

  return { host, size, zoom, status }
}
