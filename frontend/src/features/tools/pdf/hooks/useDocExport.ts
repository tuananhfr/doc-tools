import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { translate } from '@/i18n/runtime'
import type { ImageFormat, PageRef, PdfOutput, SourceFile } from '../types/doc-tools.types'
import {
  buildBatch,
  buildImages,
  buildOffice,
  buildPdf,
  buildSplit,
  type BatchFormat,
  type BatchOptions,
  type BuildContext,
  type OfficeKind,
  type SplitGroup,
} from '../services/doc-build'
import { CANVAS_CAP } from '../utils/canvas-cap'
import type { BatchGroup } from '../utils/batch-groups'
import { carryoverSummary, type CarryoverReport } from '../utils/carryover-summary'
import { compressionSummary, type CompressionStats } from '../utils/compression'
import type { ResolvedDecorations } from '../utils/decorations'
import { downloadOutput } from '@/features/tools/hub'
import type { WorkStep } from '../utils/work-step'

export type { BatchFormat, OfficeKind }
export type ExportKind = 'pdf' | 'split' | 'image' | 'batch' | OfficeKind

export interface ExportProgress {
  done: number
  total: number
}

/**
 * Xuất tài liệu đang dựng: một PDF, nhiều PDF (tách), hoặc ảnh từng trang.
 * Dựng tệp là việc của `services/doc-build`; hook này lo tiến độ, huỷ, tải
 * xuống NGAY khi dựng xong và báo kết quả.
 */
export function useDocExport(sources: Record<string, SourceFile>, decorations: ResolvedDecorations) {
  const toast = useToast()
  const [busy, setBusy] = useState<ExportKind | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const controller = useRef<AbortController | null>(null)
  const context = useMemo<BuildContext>(() => ({ sources, decorations }), [sources, decorations])

  useEffect(() => () => controller.current?.abort(), [])

  const run = useCallback(
    /** `true` khi đã tải được tệp — trang dựa vào đó để mời đăng nhập, ẩn gợi ý. */
    async (kind: ExportKind, task: (step: WorkStep) => Promise<void>): Promise<boolean> => {
      const abort = new AbortController()
      controller.current = abort
      setBusy(kind)
      setProgress(null)
      try {
        // Phạm vi trang sai mà vẫn xuất thì ra tệp THIẾU số trang/watermark trông như bình thường.
        const scopeError = decorations.errors.headerFooter ?? decorations.errors.watermark
        if (scopeError) throw new Error(translate('pdf:exportToast.scopeInvalid', { error: scopeError }))
        // Chỉ vẽ lại khi phần trăm nhích: mỗi lần setState là cả lưới 500 thẻ trang render lại.
        let shown = -1
        const onProgress = (done: number, total: number) => {
          const percent = total > 0 ? Math.floor((done / total) * 100) : 0
          if (percent === shown) return
          shown = percent
          setProgress({ done, total })
        }
        await task({ signal: abort.signal, onProgress })
        return true
      } catch (error) {
        if (abort.signal.aborted) toast.info(translate('pdf:exportToast.cancelled'))
        else
          toast.error(
            error instanceof Error && error.message
              ? translate('pdf:exportToast.failedWith', { message: error.message })
              : translate('pdf:exportToast.failed'),
          )
        return false
      } finally {
        controller.current = null
        setBusy(null)
        setProgress(null)
      }
    },
    [toast, decorations],
  )

  const cancel = useCallback(() => controller.current?.abort(), [])

  const reportCompression = useCallback(
    (output: PdfOutput, stats: CompressionStats, finalBytes: number) => {
      if (output.compression === 'none') return
      const summary = compressionSummary(stats, finalBytes)
      toast[summary.tone](summary.text)
    },
    [toast],
  )

  const reportCarryover = useCallback(
    (report: CarryoverReport) => {
      const summary = carryoverSummary(report)
      if (summary) toast[summary.tone](summary.text)
    },
    [toast],
  )

  // Không nói ra thì bản vẽ A0 "300 DPI" thực ra ~100 DPI mà người đem in không hề biết.
  const reportReduced = useCallback(
    (reduced: number[], dpi: number) => {
      if (reduced.length === 0) return
      const lowest = Math.round(Math.min(...reduced))
      const vars = { lowest, dpi, megapixels: CANVAS_CAP.maxArea / 1_000_000 }
      toast.info(
        reduced.length === 1
          ? translate('pdf:exportToast.reducedOne', vars)
          : translate('pdf:exportToast.reducedMany', { ...vars, count: reduced.length }),
      )
    },
    [toast],
  )

  const exportPdf = useCallback(
    (pages: PageRef[], name: string, output: PdfOutput) =>
      run('pdf', async (step) => {
        const built = await buildPdf(context, pages, name, output, step)
        downloadOutput(built.file)
        reportCompression(output, built.compression, built.bytes)
        reportCarryover(built.carryover)
      }),
    [run, context, reportCompression, reportCarryover],
  )

  const splitPdf = useCallback(
    (groups: SplitGroup[], name: string, output: PdfOutput) =>
      run('split', async (step) => {
        const built = await buildSplit(context, groups, name, output, step)
        downloadOutput(built.file)
        reportCompression(output, built.compression, built.bytes)
        reportCarryover(built.carryover)
      }),
    [run, context, reportCompression, reportCarryover],
  )

  const exportImages = useCallback(
    (pages: PageRef[], format: ImageFormat, dpi: number, name: string) =>
      run('image', async (step) => {
        const built = await buildImages(context, pages, format, dpi, name, step)
        downloadOutput(built.file)
        reportReduced(built.reduced, dpi)
      }),
    [run, context, reportReduced],
  )

  const exportOffice = useCallback(
    (kind: OfficeKind, pages: PageRef[], name: string) =>
      run(kind, async (step) => {
        const built = await buildOffice(context, kind, pages, name, step)
        downloadOutput(built.file)
        if (built.withoutText > 0) {
          toast.info(
            kind === 'word'
              ? translate('pdf:exportToast.wordImages', { count: built.withoutText })
              : translate('pdf:exportToast.excelBlank', { count: built.withoutText }),
          )
        }
      }),
    [run, context, toast],
  )

  const exportBatch = useCallback(
    (groups: BatchGroup[], format: BatchFormat, options: BatchOptions, name: string) =>
      run('batch', async (step) => {
        const built = await buildBatch(context, groups, format, options, name, step)
        downloadOutput(built.file)
        if (format === 'pdf') {
          reportCompression(options.output, built.compression, built.bytes)
          reportCarryover(built.carryover)
        }
        if (format === 'image') reportReduced(built.reduced, options.image.dpi)
        if (built.withoutText > 0) toast.info(translate('pdf:exportToast.batchTextless', { count: built.withoutText }))
      }),
    [run, context, reportCompression, reportCarryover, reportReduced, toast],
  )

  return { busy, progress, cancel, exportPdf, splitPdf, exportImages, exportOffice, exportBatch }
}
