import { useEffect, useState, type RefObject } from 'react'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { basePageSize } from '../services/page-size'
import { thumbnailUrl } from '../services/thumbnails'
import { sheetKey } from '../utils/image-sheet'
import type { Size } from '../utils/page-geometry'

/** `base` = khổ trang (pt) trước xoay thêm — để dựng tờ giấy và lớp phủ đúng tỉ lệ. */
export type ThumbnailState = { status: 'loading' } | { status: 'ready'; url: string; base: Size } | { status: 'error' }

type Loaded = { key: string; url: string; base: Size } | { key: string; url: null }

/**
 * Ảnh thu nhỏ của một trang, CHỈ vẽ khi thẻ trang sắp lọt vào màn hình — thả
 * tệp 300 trang mà vẽ hết một lượt là treo tab vài giây trên máy yếu.
 */
export function usePageThumbnail(
  target: RefObject<HTMLElement | null>,
  source: SourceFile | undefined,
  page: Pick<PageRef, 'pageIndex' | 'sheet'>,
): ThumbnailState {
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const { pageIndex, sheet } = page
  const key = source ? `${source.id}:${pageIndex}:${sheetKey(sheet)}` : ''

  useEffect(() => {
    const element = target.current
    if (!element || visible) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true)
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [target, visible])

  useEffect(() => {
    if (!visible || !source) return
    let alive = true
    // `thumbnailUrl` có cache theo trang nên chạy lại effect không vẽ lại.
    Promise.all([thumbnailUrl(source, { pageIndex, sheet }), basePageSize(source, { pageIndex, sheet })]).then(
      ([url, base]) => alive && setLoaded({ key, url, base }),
      () => alive && setLoaded({ key, url: null }),
    )
    return () => {
      alive = false
    }
  }, [visible, source, pageIndex, sheet, key])

  if (!loaded || loaded.key !== key) return { status: 'loading' }
  return loaded.url ? { status: 'ready', url: loaded.url, base: loaded.base } : { status: 'error' }
}
