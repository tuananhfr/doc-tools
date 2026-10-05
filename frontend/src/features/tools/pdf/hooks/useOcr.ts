import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
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
        toast.info('Các trang này đã có lớp chữ — không cần nhận dạng.')
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
          toast.error(error instanceof Error && error.message ? `Không nhận dạng được: ${error.message}` : 'Không nhận dạng được. Thử lại.')
          return
        }
      }
      setState(null)
      if (cancelled.current) {
        toast.info(done > 0 ? `Đã dừng — giữ kết quả ${done} trang đã nhận dạng xong.` : 'Đã dừng nhận dạng.')
      } else if (words === 0) {
        toast.info('Không đọc được chữ nào — ảnh có thể quá mờ, quá nhỏ hoặc không có chữ.')
      } else {
        toast.success(`Đã nhận dạng ${done} trang (${words.toLocaleString('vi-VN')} từ) — giờ tìm, tô, sửa chữ được trên các trang này.`)
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
