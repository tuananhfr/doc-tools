import { useEffect, useState, useSyncExternalStore } from 'react'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { PageText } from '../types/text-layer.types'
import { ocrVersion, subscribeOcr } from '../services/ocr-store'
import { loadPageText } from '../services/text-layer'
import { sheetKey } from '../utils/image-sheet'

/** Lớp chữ của một trang, chỉ đọc khi cần (`enabled`). Lỗi đọc = coi như trang không có chữ. */
export function usePageText(source: SourceFile, page: Pick<PageRef, 'pageIndex' | 'sheet'>, enabled: boolean): PageText | null {
  const ocr = useSyncExternalStore(subscribeOcr, ocrVersion)
  const { pageIndex, sheet } = page
  const key = `${source.id}:${pageIndex}:${sheetKey(sheet)}:${ocr}`
  const [state, setState] = useState<{ key: string; text: PageText } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    void loadPageText(source, { pageIndex, sheet })
      .catch((): PageText => ({ runs: [] }))
      .then((text) => {
        if (alive) setState({ key, text })
      })
    return () => {
      alive = false
    }
  }, [enabled, key, source, pageIndex, sheet])

  return enabled && state?.key === key ? state.text : null
}
