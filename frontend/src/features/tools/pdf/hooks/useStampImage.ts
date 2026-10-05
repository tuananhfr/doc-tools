import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError, type ToolFailure } from '@/features/tools/hub'
import { prepareStampImage, type StampImage } from '../services/stamp-image'

export interface PickedStamp extends StampImage {
  /** URL xem trước — hook tự thu hồi khi đổi ảnh hoặc rời màn. */
  url: string
}

/** Ảnh dấu / logo / chữ ký của "Đóng dấu PDF" và "Chèn chữ ký". Ảnh chỉ nằm trong RAM của tab. */
export function useStampImage() {
  const [image, setImage] = useState<PickedStamp | null>(null)
  const [error, setError] = useState<ToolFailure | null>(null)
  const [loading, setLoading] = useState(false)
  // Chọn ảnh thứ hai khi ảnh đầu còn đang chuẩn hoá: chỉ lượt chọn SAU CÙNG được ghi kết quả.
  const turn = useRef(0)
  const url = useRef<string | null>(null)

  const release = () => {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }

  useEffect(() => release, [])

  /** `make` dựng ảnh đã chuẩn hoá: từ tệp người dùng chọn, hoặc từ nét ký tay. */
  const load = useCallback(async (make: () => Promise<StampImage>) => {
    const mine = ++turn.current
    setLoading(true)
    setError(null)
    try {
      const prepared = await make()
      if (mine !== turn.current) return
      release()
      url.current = URL.createObjectURL(new Blob([prepared.bytes], { type: prepared.mime }))
      setImage({ ...prepared, url: url.current })
    } catch (failure) {
      if (mine === turn.current) setError(describeError(failure, 'Không mở được ảnh dấu.'))
    } finally {
      if (mine === turn.current) setLoading(false)
    }
  }, [])

  const pick = useCallback((file: File) => load(() => prepareStampImage(file)), [load])

  const clear = useCallback(() => {
    turn.current++
    release()
    setImage(null)
    setError(null)
    setLoading(false)
  }, [])

  return { image, error, loading, pick, load, clear }
}
