import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { translate } from '@/i18n/runtime'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { recognizePage, stopOcr, type OcrStage } from '../services/ocr'
import { saveOcrText } from '../services/ocr-store'
import { loadPageText } from '../services/text-layer'

export interface OcrState {
  /** Số trang đã xong / cần nhận dạng. */
  done: number
  total: number
  stage: OcrStage
  progress: number
}

/** Nhận dạng chữ các trang CHƯA có lớp chữ, lần lượt từng trang, dừng được giữa chừng. */
export function useOcr(sources: Record<string, SourceFile>) {
  const toast = useToast()
  const [state, setState] = useState<OcrState | null>(null)
  const cancelled = useRef(false)

  useEffect(
    () => () => {
      cancelled.current = true
      void stopOcr()
    },
    [],
  )

  const run = useCallback(
    async (pages: PageRef[]) => {
      cancelled.current = false
      setState({ done: 0, total: 0, stage: 'loading', progress: 0 })
      const targets: PageRef[] = []
      for (const page of pages) {
        const source = sources[page.sourceId]
        if (!source) continue
        const text = await loadPageText(source, page).catch(() => ({ runs: [] }))
        if (text.runs.length === 0) targets.push(page)
      }
      if (targets.length === 0) {
        setState(null)
        toast.info(translate('pdf:ocr.alreadyText'))
        return
      }

      let done = 0
      let words = 0
      try {
        for (const page of targets) {
          if (cancelled.current) break
          setState({ done, total: targets.length, stage: 'loading', progress: 0 })
          const text = await recognizePage(sources[page.sourceId], page, ({ stage, progress }) =>
            setState((current) => (current ? { ...current, stage, progress } : current)),
          )
          if (cancelled.current) break
          saveOcrText(page.sourceId, page, text)
          words += text.runs.length
          done++
        }
      } catch (error) {
        // Dừng tay = huỷ worker giữa chừng → recognize ném lỗi; đó không phải lỗi thật.
        if (!cancelled.current) {
          await stopOcr()
          setState(null)
          toast.error(
            error instanceof Error && error.message
              ? translate('pdf:ocr.failedWith', { message: error.message })
              : translate('pdf:ocr.failed'),
          )
          return
        }
      }
      setState(null)
      if (cancelled.current) {
        toast.info(done > 0 ? translate('pdf:ocr.stoppedKept', { count: done }) : translate('pdf:ocr.stopped'))
      } else if (words === 0) {
        toast.info(translate('pdf:ocr.noText'))
      } else {
        toast.success(translate('pdf:ocr.done', { count: done, words }))
      }
    },
    [sources, toast],
  )

  const cancel = useCallback(() => {
    cancelled.current = true
    void stopOcr()
  }, [])

  return { state, running: state !== null, run, cancel }
}

export type Ocr = ReturnType<typeof useOcr>
