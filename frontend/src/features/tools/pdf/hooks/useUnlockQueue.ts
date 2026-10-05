import { useCallback, useState } from 'react'
import { unlockPdf } from '../services/pdf-unlock'
import type { LockedFile, Placement } from './useDocWorkspace'

interface QueuedFile extends LockedFile {
  placement?: Placement
}

export type UnlockError = 'wrong-password' | 'restricted' | 'failed' | 'unavailable'

/**
 * Tệp cần mật khẩu xếp hàng, hỏi lần lượt từng tệp. Mở khoá xong thì nạp lại
 * bản đã giải như một tệp thả vào bình thường, cùng vị trí chèn lúc thả.
 */
export function useUnlockQueue(addUnlocked: (file: File, placement?: Placement) => Promise<void>) {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [busy, setBusy] = useState(false)

  const enqueue = useCallback((files: LockedFile[], placement?: Placement) => {
    if (files.length > 0) setQueue((current) => [...current, ...files.map((file) => ({ ...file, placement }))])
  }, [])

  const current = queue[0] ?? null

  const submit = useCallback(
    async (password: string): Promise<UnlockError | null> => {
      if (!current) return null
      setBusy(true)
      try {
        const result = await unlockPdf(current.bytes, password)
        if (!result.ok) {
          // Đúng mật khẩu mở nhưng tệp cấm sửa: từ giờ cần mật khẩu chủ, đổi lời hỏi cho khớp.
          if (result.reason === 'restricted') setQueue(([head, ...rest]) => [{ ...head, kind: 'owner' }, ...rest])
          return result.reason
        }
        setQueue((items) => items.slice(1))
        await addUnlocked(new File([result.bytes], current.name, { type: 'application/pdf' }), current.placement)
        return null
      } catch {
        return 'unavailable'
      } finally {
        setBusy(false)
      }
    },
    [current, addUnlocked],
  )

  const skip = useCallback(() => setQueue((items) => items.slice(1)), [])

  return { current, remaining: queue.length, busy, enqueue, submit, skip }
}

export type UnlockQueue = ReturnType<typeof useUnlockQueue>
