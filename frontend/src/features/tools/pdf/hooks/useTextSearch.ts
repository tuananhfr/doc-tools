import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useDebounce } from '@/hooks'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { Quad, TextRun } from '../types/text-layer.types'
import { ocrVersion, subscribeOcr } from '../services/ocr-store'
import { canvasRunMeasure, loadPageText } from '../services/text-layer'
import { sheetKey } from '../utils/image-sheet'
import { buildPageIndex, findInPage, matchCarets, matchQuads, matchSnippet, normalizeQuery, type SearchOptions, type Snippet } from '../utils/text-search'
import { selectedLines, type LineSpan } from '../utils/text-select'

export interface SearchHit {
  id: string
  pageId: string
  /** Số thứ tự trang trên lưới, đếm từ 1. */
  pageNumber: number
  quads: Quad[]
  snippet: Snippet
  /** Đoạn khớp theo từng dòng — tìm & thay chỉ thay được đoạn nằm trên MỘT dòng. */
  spans: LineSpan[]
  /** Mảnh chữ đầu đoạn khớp — để đoán phông khi thay. */
  fontRun: TextRun | null
}

interface SearchResult {
  key: string
  hits: SearchHit[]
  done: number
  total: number
  /** Trang không có lớp chữ (ảnh, bản scan) — tìm không thấy gì ở đó. */
  textless: number
  truncated: boolean
}

/** Trần kết quả: tìm "a" trong 500 trang ra hàng chục nghìn chỗ, vẽ hết là treo tab. */
export const MAX_HITS = 1000

const DEFAULT_OPTIONS: SearchOptions = { ignoreAccents: true, matchCase: false }

/** Tìm chữ trên mọi trang theo thứ tự đang xếp. Lớp chữ đọc một lần/trang rồi giữ lại. */
export function useTextSearch(pages: PageRef[], sources: Record<string, SourceFile>) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_OPTIONS)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const debounced = useDebounce(query, 250)
  const ocr = useSyncExternalStore(subscribeOcr, ocrVersion)

  const needle = normalizeQuery(debounced, options)
  // Khoá gồm cả thứ tự trang: dời trang là số trang trong kết quả đổi theo.
  const key = needle
    ? `${needle}|${options.ignoreAccents}|${options.matchCase}|${ocr}|${pages.map((page) => `${page.id}:${page.sourceId}:${page.pageIndex}:${sheetKey(page.sheet)}`).join(',')}`
    : ''

  useEffect(() => {
    if (!key) return
    let alive = true
    void (async () => {
      const hits: SearchHit[] = []
      let textless = 0
      let truncated = false
      for (const [position, page] of pages.entries()) {
        const source = sources[page.sourceId]
        const text = source ? await loadPageText(source, page).catch(() => ({ runs: [] })) : { runs: [] }
        if (!alive) return
        if (text.runs.length === 0) textless++
        const index = buildPageIndex(text)
        for (const [n, match] of findInPage(index, debounced, options).entries()) {
          if (hits.length >= MAX_HITS) {
            truncated = true
            break
          }
          const carets = matchCarets(index, match)
          const spans = carets ? selectedLines(text.runs, carets[0], carets[1], canvasRunMeasure) : []
          hits.push({
            id: `${page.id}:${n}`,
            pageId: page.id,
            pageNumber: position + 1,
            quads: matchQuads(index, match, canvasRunMeasure),
            snippet: matchSnippet(index, match),
            spans,
            fontRun: spans[0] ? text.runs[spans[0].run] : null,
          })
        }
        // Báo dần mỗi 10 trang để tệp dài vẫn thấy kết quả sớm.
        if (truncated || position % 10 === 9 || position === pages.length - 1) {
          setResult({ key, hits: [...hits], done: position + 1, total: pages.length, textless, truncated })
        }
        if (truncated) break
      }
    })()
    return () => {
      alive = false
    }
    // `key` đã gói query + tuỳ chọn + thứ tự trang; `pages`/`sources` đổi mà khoá giữ nguyên là chỉ đổi dấu, không cần tìm lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = key && result?.key === key ? result : null
  const hits = useMemo(() => current?.hits ?? [], [current])
  const activeIndex = hits.findIndex((hit) => hit.id === activeId)

  return {
    query,
    setQuery,
    options,
    setOptions,
    active: key !== '',
    searching: key !== '' && (!current || current.done < current.total) && !current?.truncated,
    progress: current ? { done: current.done, total: current.total } : { done: 0, total: pages.length },
    textless: current?.textless ?? 0,
    truncated: current?.truncated ?? false,
    hits,
    activeIndex,
    activeHit: activeIndex >= 0 ? hits[activeIndex] : undefined,
    setActiveId,
  }
}

export type TextSearch = ReturnType<typeof useTextSearch>
