import { useCallback, useState, type ReactNode } from 'react'
import { useEmbed } from '@/features/embed'
import { useAuthStore } from '@/store/auth.store'
import { LoginNudge } from '../components/LoginNudge'

interface DownloadNudge {
  /** Gọi ngay sau khi người dùng bấm Tải về. */
  onDownloaded: () => void
  /** Lời mời để gắn dưới hàng nút của màn kết quả; null = không mời. */
  extra: ReactNode
}

/**
 * Mời khách đăng nhập MỘT lần, sau lượt tải đầu tiên. Xét theo phiên chứ không
 * theo nhánh route: người đã đăng nhập mở link công khai cũng không bị mời.
 */
export function useDownloadNudge(): DownloadNudge {
  const guest = useAuthStore((state) => state.status) === 'unauthenticated'
  // Embedded in ERPCons the user is already signed in there; a Chuyện Nhỏ login prompt is noise.
  const embedded = useEmbed().host !== null
  const [nudge, setNudge] = useState<'hidden' | 'shown' | 'dismissed'>('hidden')

  const onDownloaded = useCallback(() => {
    if (guest && !embedded) setNudge((current) => (current === 'hidden' ? 'shown' : current))
  }, [guest, embedded])

  return { onDownloaded, extra: nudge === 'shown' ? <LoginNudge onDismiss={() => setNudge('dismissed')} /> : null }
}
