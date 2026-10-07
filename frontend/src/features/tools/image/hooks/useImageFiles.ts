import { useCallback, useEffect, useRef, useState } from 'react'
import { TOOL_ERROR, TOOL_LIMITS, type FlowRejected } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import { intakeImage } from '../services/image-intake'
import type { ImageItem } from '../types/image.types'

interface ImageFilesOptions {
  /** `false` = công cụ làm trên MỘT ảnh: chọn ảnh mới là thay ảnh cũ. */
  multiple: boolean
}

function release(items: ImageItem[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.url)
    if (item.thumbnail) URL.revokeObjectURL(item.thumbnail)
  }
}

/** Ảnh người dùng đã chọn cho một công cụ ảnh: danh sách có thứ tự + ảnh bị từ chối kèm lý do. */
export function useImageFiles({ multiple }: ImageFilesOptions) {
  const [items, setItems] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null)
  const [rejected, setRejected] = useState<FlowRejected[]>([])

  // URL của ảnh phải thu hồi khi rời công cụ — đọc danh sách MỚI NHẤT qua ref, không qua closure cũ.
  const latest = useRef<ImageItem[]>([])
  useEffect(() => {
    latest.current = items
  }, [items])
  useEffect(() => () => release(latest.current), [])

  const addFiles = useCallback(
    async (files: File[]) => {
      const batch = multiple ? files : files.slice(0, 1)
      const added: ImageItem[] = []
      const refused: FlowRejected[] = []

      setLoading({ done: 0, total: batch.length })
      try {
        for (const [index, file] of batch.entries()) {
          // Ảnh xử lý từng tấm rồi nhả nên không cần trần tổng dung lượng; trần số tệp giữ .zip ra và thời gian chờ ở mức chịu được.
          if (multiple && latest.current.length + added.length >= TOOL_LIMITS.batchFiles) {
            refused.push({ name: file.name, code: TOOL_ERROR.quota, reason: translate('image:files.batchLimit', { limit: TOOL_LIMITS.batchFiles }) })
            setLoading({ done: index + 1, total: batch.length })
            continue
          }
          const result = await intakeImage(file)
          if (result.ok) added.push(result.item)
          else refused.push({ name: file.name, code: result.code, reason: result.reason })
          setLoading({ done: index + 1, total: batch.length })
        }
      } finally {
        setLoading(null)
      }

      if (!multiple && files.length > 1) {
        refused.push(...files.slice(1).map((file) => ({ name: file.name, code: TOOL_ERROR.quota, reason: translate('image:files.singleOnly') })))
      }
      setRejected(refused)
      if (added.length === 0) return
      if (!multiple) release(latest.current)
      setItems((current) => (multiple ? [...current, ...added] : added))
    },
    [multiple],
  )

  const remove = useCallback((id: string) => {
    release(latest.current.filter((item) => item.id === id))
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const move = useCallback((id: string, delta: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      const next = index + delta
      if (index < 0 || next < 0 || next >= current.length) return current
      const result = [...current]
      ;[result[index], result[next]] = [result[next], result[index]]
      return result
    })
  }, [])

  const clear = useCallback(() => {
    release(latest.current)
    setItems([])
    setRejected([])
  }, [])

  const dismissRejected = useCallback(() => setRejected([]), [])

  return { items, loading, rejected, addFiles, remove, move, clear, dismissRejected }
}

export type ImageFiles = ReturnType<typeof useImageFiles>
