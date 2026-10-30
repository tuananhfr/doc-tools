import { useEffect, useState } from 'react'
import { fetchPihTemplatesEnabled } from '../services/templates-config.api'

/**
 * Mọi nút "Mẫu để thử PI Holding" chỉ hiện khi máy chủ bật `templates.piholding.enabled`.
 * Mặc định false (cả lúc SSR lẫn khi chưa hỏi xong) để HTML máy chủ và lần hydrate đầu khớp
 * nhau, và để tắt cờ ở máy chủ là nút biến mất ngay lần mở sau — giống `useReadLinkEnabled`.
 */
export function usePihTemplatesEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void fetchPihTemplatesEnabled(controller.signal).then((value) => { if (!controller.signal.aborted) setEnabled(value) })
    return () => controller.abort()
  }, [])
  return enabled
}
