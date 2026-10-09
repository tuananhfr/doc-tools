import { useEffect, useState } from 'react'

/** `null` cho tới khi có URL của ĐÚNG blob này — `src=""` làm trình duyệt tải lại cả trang. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => {
    if (!blob) { setEntry(null); return }
    const url = URL.createObjectURL(blob)
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  // Giữa lúc đổi blob và lúc effect chạy, URL cũ đã bị thu hồi.
  return entry && entry.blob === blob ? entry.url : null
}
