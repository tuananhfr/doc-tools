import { useCallback, useState } from 'react'
import { READ_POSITIONS_KEY, READ_REMEMBER_KEY } from '../config/read-listen'
import { recallPosition, rememberPosition } from '../utils/read-position'

function readFlag(): boolean {
  try {
    return localStorage.getItem(READ_REMEMBER_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * "Nhớ chỗ đang đọc" là lựa chọn của người dùng, mặc định tắt. Kho chỉ giữ dấu băm văn bản + vị trí; tắt là xoá sạch.
 * localStorage có thể bị chặn (chế độ riêng tư) — khi đó lựa chọn chỉ sống tới lúc tải lại trang.
 */
export function useReadPosition() {
  const [enabled, setEnabledState] = useState(readFlag)

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      localStorage.setItem(READ_REMEMBER_KEY, on ? '1' : '0')
      if (!on) localStorage.removeItem(READ_POSITIONS_KEY)
    } catch {
      /* xem chú thích đầu hook */
    }
  }, [])

  const recall = useCallback((fingerprint: string): number | null => {
    if (!enabled) return null
    try {
      return recallPosition(localStorage.getItem(READ_POSITIONS_KEY), fingerprint)
    } catch {
      return null
    }
  }, [enabled])

  const save = useCallback((fingerprint: string, offset: number) => {
    if (!enabled) return
    try {
      localStorage.setItem(READ_POSITIONS_KEY, rememberPosition(localStorage.getItem(READ_POSITIONS_KEY), fingerprint, offset, Date.now()))
    } catch {
      /* xem chú thích đầu hook */
    }
  }, [enabled])

  return { enabled, setEnabled, recall, save }
}
