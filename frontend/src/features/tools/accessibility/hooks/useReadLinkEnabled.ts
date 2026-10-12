import { useEffect, useState } from 'react'
import { fetchReadLinkEnabled } from '../services/read-extract.api'

/**
 * Tab "Link" chỉ hiện khi máy chủ bật `read.linkEnabled`. Mặc định false (cả lúc SSR lẫn khi chưa hỏi
 * xong) để HTML máy chủ và lần hydrate đầu khớp nhau, và để tắt cờ ở máy chủ là tab biến mất ngay lần mở sau.
 */
export function useReadLinkEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void fetchReadLinkEnabled(controller.signal).then((value) => { if (!controller.signal.aborted) setEnabled(value) })
    return () => controller.abort()
  }, [])
  return enabled
}
