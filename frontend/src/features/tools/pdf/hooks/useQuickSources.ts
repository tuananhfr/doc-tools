import { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '@/i18n/runtime'
import type { PageRef, RejectedFile, SourceFile } from '../types/doc-tools.types'
import { ingestFile } from '../services/ingest'
import { clearPageSizes } from '../services/page-size'
import { releaseAll, releaseDocument } from '../services/pdf-render'
import { clearTextLayer } from '../services/text-layer'
import { clearReflowProbes } from '../services/text-reflow'
import { clearTextStyles } from '../services/text-style'
import { releaseThumbnails, thumbnailUrl } from '../services/thumbnails'
import { megabytes, TOOL_ERROR, TOOL_LIMITS } from '@/features/tools/hub'
import type { LoadingProgress, LockedFile } from './useDocWorkspace'
import { useUnlockQueue } from './useUnlockQueue'

export type QuickKind = 'pdf' | 'image'

/** Một tệp người dùng đã chọn cho công cụ nhanh, cùng các trang của nó. */
export interface QuickItem {
  source: SourceFile
  pages: PageRef[]
}

interface QuickOptions {
  /** Loại tệp công cụ nhận — hằng số khai NGOÀI component. */
  accept: readonly QuickKind[]
  /** `false` = công cụ làm trên MỘT tệp: chọn tệp mới là thay tệp cũ. */
  multiple: boolean
}

const kindReason = (kind: QuickKind) => translate(kind === 'pdf' ? 'pdf:limits.onlyPdf' : 'pdf:limits.onlyImage')

/** Bộ nhớ đệm của engine là biến module dùng chung với trình chỉnh sửa — rời công cụ phải trả lại sạch. */
function releaseCaches() {
  releaseAll()
  releaseThumbnails()
  clearPageSizes()
  clearTextLayer()
  clearTextStyles()
  clearReflowProbes()
}

/**
 * Tệp của một công cụ nhanh: danh sách có thứ tự, không có vùng chọn hay hoàn
 * tác như phiên của trình chỉnh sửa. Dùng chung `ingestFile` nên cùng luật
 * nhận tệp (chữ ký byte, 100 MB, mở khoá PDF).
 */
export function useQuickSources({ accept, multiple }: QuickOptions) {
  const [items, setItems] = useState<QuickItem[]>([])
  const [loading, setLoading] = useState<LoadingProgress | null>(null)
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  // Nạp tệp là việc bất đồng bộ — đếm trang HIỆN CÓ qua ref, không qua closure cũ.
  const latest = useRef<QuickItem[]>([])
  useEffect(() => {
    latest.current = items
  }, [items])

  useEffect(() => releaseCaches, [])

  const requested = useRef(new Set<string>())
  useEffect(() => {
    for (const { source } of items) {
      // Mỗi tệp xin MỘT lần; không gắn cờ "còn sống" theo lượt effect — StrictMode chạy effect
      // hai lần, lượt đầu bị đánh dấu chết thì ảnh xin ở lượt đó không bao giờ hiện.
      if (requested.current.has(source.id)) continue
      requested.current.add(source.id)
      thumbnailUrl(source, { pageIndex: 0 }).then(
        (url) => setThumbnails((current) => ({ ...current, [source.id]: url })),
        // Không vẽ được ảnh thu nhỏ thì danh sách hiện icon — không phải lỗi của tệp.
        () => undefined,
      )
    }
  }, [items])

  const add = useCallback(
    async (files: File[]): Promise<LockedFile[]> => {
      const added: QuickItem[] = []
      const refused: RejectedFile[] = []
      const locked: LockedFile[] = []
      const batch = multiple ? files : files.slice(0, 1)
      const current = multiple ? latest.current : []
      const kept = current.reduce((sum, item) => sum + item.pages.length, 0)
      // Tệp nguồn nằm trong RAM tới khi rời công cụ: chặn theo SỐ TỆP và TỔNG dung lượng, không chỉ từng tệp.
      let held = current.reduce((sum, item) => sum + item.source.size, 0)

      setLoading({ done: 0, total: batch.length })
      try {
        for (const [index, file] of batch.entries()) {
          const result = await ingestFile(file)
          setLoading({ done: index + 1, total: batch.length })

          if (!result.ok && 'locked' in result) {
            if (accept.includes('pdf')) locked.push({ name: file.name, bytes: result.bytes, kind: result.locked })
            else refused.push({ name: file.name, code: TOOL_ERROR.unsupportedFormat, reason: kindReason(accept[0]) })
          } else if (!result.ok) {
            refused.push({ name: file.name, code: result.code, reason: result.reason })
          } else if (!accept.includes(result.source.kind === 'pdf' ? 'pdf' : 'image')) {
            refused.push({ name: file.name, code: TOOL_ERROR.unsupportedFormat, reason: kindReason(accept[0]) })
          } else if (kept + added.reduce((sum, item) => sum + item.pages.length, 0) + result.pages.length > TOOL_LIMITS.totalPages) {
            refused.push({ name: file.name, code: TOOL_ERROR.pageLimit, reason: translate('pdf:limits.batchPages', { max: TOOL_LIMITS.totalPages }) })
          } else if (current.length + added.length >= TOOL_LIMITS.batchFiles) {
            refused.push({ name: file.name, code: TOOL_ERROR.quota, reason: translate('pdf:limits.batchFiles', { max: TOOL_LIMITS.batchFiles }) })
          } else if (held + result.source.size > TOOL_LIMITS.heldBytes) {
            refused.push({ name: file.name, code: TOOL_ERROR.fileTooLarge, reason: translate('pdf:limits.batchBytes', { size: megabytes(TOOL_LIMITS.heldBytes) }) })
          } else {
            added.push({ source: result.source, pages: result.pages })
            held += result.source.size
          }
        }
      } finally {
        setLoading(null)
      }

      if (!multiple && files.length > 1) {
        refused.push(...files.slice(1).map((file) => ({ name: file.name, code: TOOL_ERROR.quota, reason: translate('pdf:limits.singleFile') })))
      }
      setRejected(refused)
      if (added.length > 0) {
        if (!multiple) for (const item of latest.current) releaseDocument(item.source.id)
        setItems((current) => (multiple ? [...current, ...added] : added))
      }
      return locked
    },
    [accept, multiple],
  )

  // Tệp có mật khẩu không bị từ chối: xếp hàng hỏi mật khẩu, mở được thì nạp lại bản đã giải.
  const unlock = useUnlockQueue(
    useCallback(
      async (file: File) => {
        await add([file])
      },
      [add],
    ),
  )
  const { enqueue } = unlock

  const addFiles = useCallback(async (files: File[]) => enqueue(await add(files)), [add, enqueue])

  const remove = useCallback((id: string) => {
    releaseDocument(id)
    setItems((current) => current.filter((item) => item.source.id !== id))
  }, [])

  const move = useCallback((id: string, delta: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.source.id === id)
      const next = index + delta
      if (index < 0 || next < 0 || next >= current.length) return current
      const result = [...current]
      ;[result[index], result[next]] = [result[next], result[index]]
      return result
    })
  }, [])

  const clear = useCallback(() => {
    releaseCaches()
    requested.current.clear()
    setThumbnails({})
    setItems([])
    setRejected([])
  }, [])

  const dismissRejected = useCallback(() => setRejected([]), [])

  return { items, loading, rejected, thumbnails, unlock, addFiles, remove, move, clear, dismissRejected }
}

export type QuickSources = ReturnType<typeof useQuickSources>
