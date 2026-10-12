import { create } from 'zustand'
import { readTextSize, writeTextSize, type TextSize } from '../utils/text-size'

interface TextSizeState {
  size: TextSize
  setSize: (size: TextSize) => void
}

// Đọc storage ngay khi module nạp ở client (server nhận 'normal' vì readTextSize tự bắt lỗi). Không lệch
// hydrate: menu của react-bootstrap chỉ render mục sau lần mở đầu tiên.
const useTextSizeStore = create<TextSizeState>()((set) => ({
  size: readTextSize(),
  setSize: (size) => {
    writeTextSize(size)
    set({ size })
  },
}))

export function useTextSize() {
  const size = useTextSizeStore((state) => state.size)
  const setSize = useTextSizeStore((state) => state.setSize)
  return { size, setSize }
}

/** Thuộc tính trên <html> là nguồn duy nhất CSS đọc (`:root[data-text-size='large']`). */
export function applyTextSize(size: TextSize): void {
  const root = document.documentElement
  if (size === 'large') root.dataset.textSize = 'large'
  else delete root.dataset.textSize
}
