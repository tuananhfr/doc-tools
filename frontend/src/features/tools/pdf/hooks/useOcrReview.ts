import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuickItem } from './useQuickSources'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { OcrPageResult } from '../types/ocr-result.types'
import { ocrText, saveOcrText } from '../services/ocr-store'
import { reviewedPageText } from '../utils/ocr-review'

export interface OcrReviewPage {
  source: SourceFile
  page: PageRef
  result: OcrPageResult
}

export function useOcrReview() {
  const [pages, setPages] = useState<OcrReviewPage[] | null>(null)
  const pending = useRef<{ reject: (reason: unknown) => void; resolve: (pages: OcrReviewPage[]) => void } | null>(null)

  useEffect(() => () => pending.current?.reject(new DOMException('Aborted', 'AbortError')), [])

  const request = useCallback((items: QuickItem[], signal: AbortSignal): Promise<void> => {
    signal.throwIfAborted()
    const review = items.flatMap(item => item.pages.flatMap(page => {
      const result = ocrText(item.source.id, page)?.ocr
      return result ? [{ source: item.source, page, result }] : []
    }))
    if (!review.length) return Promise.resolve()
    return new Promise<OcrReviewPage[]>((resolve, reject) => {
      pending.current = { resolve, reject }
      const abort = () => pending.current?.reject(signal.reason)
      signal.addEventListener('abort', abort, { once: true })
      const finish = (callback: () => void) => {
        signal.removeEventListener('abort', abort)
        pending.current = null
        setPages(null)
        callback()
      }
      pending.current = { resolve: value => finish(() => resolve(value)), reject: reason => finish(() => reject(reason)) }
      setPages(review)
    }).then(confirmed => {
      signal.throwIfAborted()
      const reviewed = confirmed.map(item => ({ item, text: reviewedPageText(item.result) }))
      for (const { item, text } of reviewed) saveOcrText(item.source.id, item.page, text)
    })
  }, [])

  const complete = useCallback((confirmed: OcrReviewPage[]) => {
    // Validate all pages before changing any cached text layer.
    for (const item of confirmed) reviewedPageText(item.result)
    pending.current?.resolve(confirmed)
  }, [])

  return { pages, request, complete }
}
