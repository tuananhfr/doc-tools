import { useEffect } from 'react'

/** Đặt tiêu đề tab khi trang đang mở, rời trang thì trả lại tiêu đề cũ. `null` = không đụng. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
