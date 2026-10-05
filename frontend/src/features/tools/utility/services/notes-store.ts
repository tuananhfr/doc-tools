import type { Note } from '../types/note.types'
import { parseNotes, serializeNotes } from '../utils/notes'

/**
 * Kho ghi chú trong localStorage CỦA TRÌNH DUYỆT NÀY — không gửi đi đâu, không
 * theo tài khoản: ai mở trình duyệt này cũng đọc được, xoá dữ liệu duyệt web là
 * mất. Màn hình phải nói rõ điều đó.
 */
const STORAGE_KEY = 'erpcons.tools.notes'

interface Snapshot {
  notes: Note[]
  /** Lần ghi gần nhất không vào được máy (hết chỗ, chế độ riêng tư chặn storage). */
  saveFailed: boolean
}

let snapshot: Snapshot | null = null
const listeners = new Set<() => void>()

function read(): Note[] {
  try {
    return parseNotes(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function emit(next: Snapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

/** Tab khác vừa sửa ghi chú: lấy bản của nó, không để hai tab ghi đè nhau bằng bản cũ. */
function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) emit({ notes: read(), saveFailed: false })
}

export const notesStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },

  /** Trả CÙNG một object cho tới khi có thay đổi — `useSyncExternalStore` so bằng tham chiếu. */
  getSnapshot(): Snapshot {
    snapshot ??= { notes: read(), saveFailed: false }
    return snapshot
  },

  /** Ghi cả danh sách. Không ghi được vẫn giữ trong RAM để người dùng kịp chép ra chỗ khác. */
  save(notes: Note[]): void {
    let saveFailed = false
    try {
      localStorage.setItem(STORAGE_KEY, serializeNotes(notes))
    } catch {
      saveFailed = true
    }
    emit({ notes, saveFailed })
  },
}
