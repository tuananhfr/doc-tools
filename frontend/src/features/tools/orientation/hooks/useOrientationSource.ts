import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError, TOOL_ERROR, TOOL_LIMITS, megabytes, type FlowRejected } from '@/features/tools/hub'
import { intakeImage } from '@/features/tools/image'
import type { OrientationSourceFile } from '../types/source.types'

/** Cạnh dài của trang PDF vẽ ra để làm việc: đủ nét để đặt điểm, không nặng như bản xuất. */
const PDF_VIEW_SIDE = 1800

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

function release(source: OrientationSourceFile | null) {
  if (!source || source.kind === 'none') return
  URL.revokeObjectURL(source.view.url)
  if (source.kind === 'image' && source.item.thumbnail) URL.revokeObjectURL(source.item.thumbnail)
  if (source.kind === 'pdf') void import('../services/pdf-page').then(({ releasePdf }) => releasePdf(source.bytes))
}

/**
 * Nguồn đang đo: một ảnh, một trang PDF, hoặc "không ảnh" (la bàn đứng riêng).
 * pdf.js chỉ được nạp khi người dùng thật sự chọn PDF. Mở ra là "không ảnh": gia chủ
 * vào thẳng la bàn sống, ảnh / bản vẽ là bước phụ khi cần.
 */
export function useOrientationSource() {
  const [source, setSource] = useState<OrientationSourceFile | null>({ kind: 'none' })
  const [loading, setLoading] = useState(false)
  const [rejected, setRejected] = useState<FlowRejected | null>(null)

  const latest = useRef<OrientationSourceFile | null>(null)
  useEffect(() => {
    latest.current = source
  }, [source])
  useEffect(() => () => release(latest.current), [])

  const replace = useCallback((next: OrientationSourceFile) => {
    release(latest.current)
    latest.current = next
    setSource(next)
  }, [])

  const openPdf = useCallback(async (name: string, bytes: Uint8Array, pageIndex: number, pageCount?: number) => {
    const { pdfPageCount, renderPdfPage } = await import('../services/pdf-page')
    const count = pageCount ?? (await pdfPageCount(bytes))
    const page = await renderPdfPage(bytes, pageIndex, PDF_VIEW_SIDE)
    return {
      kind: 'pdf' as const,
      name,
      bytes,
      pageCount: count,
      pageIndex,
      points: page.points,
      view: { url: URL.createObjectURL(page.blob), width: page.width, height: page.height },
    }
  }, [])

  const addFiles = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setRejected(null)
      setLoading(true)
      try {
        if (isPdf(file)) {
          if (file.size > TOOL_LIMITS.fileBytes) {
            setRejected({ name: file.name, code: TOOL_ERROR.fileTooLarge, reason: `Tệp vượt ${megabytes(TOOL_LIMITS.fileBytes)}.` })
            return
          }
          replace(await openPdf(file.name, new Uint8Array(await file.arrayBuffer()), 0))
          return
        }
        const result = await intakeImage(file)
        if (!result.ok) {
          setRejected({ name: file.name, code: result.code, reason: result.reason })
          return
        }
        const { item } = result
        replace({ kind: 'image', item, view: { url: item.url, width: item.width, height: item.height } })
      } catch (error) {
        const failure = describeError(error, 'Không mở được tệp này.')
        setRejected({ name: file.name, code: failure.code, reason: failure.message })
      } finally {
        setLoading(false)
      }
    },
    [openPdf, replace],
  )

  /** Đổi trang của PDF đang mở: vẽ trang mới, giữ nguyên tệp. */
  const choosePage = useCallback(
    async (pageIndex: number) => {
      const current = latest.current
      if (current?.kind !== 'pdf' || pageIndex === current.pageIndex) return
      setLoading(true)
      try {
        const next = await openPdf(current.name, current.bytes, pageIndex, current.pageCount)
        URL.revokeObjectURL(current.view.url)
        latest.current = next
        setSource(next)
      } catch (error) {
        const failure = describeError(error, 'Không vẽ được trang này.')
        setRejected({ name: current.name, code: failure.code, reason: failure.message })
      } finally {
        setLoading(false)
      }
    },
    [openPdf],
  )

  const chooseNone = useCallback(() => replace({ kind: 'none' }), [replace])

  const clear = useCallback(() => {
    release(latest.current)
    latest.current = null
    setSource(null)
    setRejected(null)
  }, [])

  return { source, loading, rejected, addFiles, choosePage, chooseNone, clear, dismissRejected: () => setRejected(null) }
}

export type OrientationSourceState = ReturnType<typeof useOrientationSource>
