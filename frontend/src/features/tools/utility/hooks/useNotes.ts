import { useCallback, useSyncExternalStore } from 'react'
import { newId } from '@/utils/id'
import { notesStore } from '../services/notes-store'
import type { Note } from '../types/note.types'
import { NOTE_LIMITS, sortNotes } from '../utils/notes'

/** Ghi chú lưu trên máy: mọi thay đổi ghi ngay, không có nút Lưu. */
export function useNotes() {
  const { notes, saveFailed } = useSyncExternalStore(notesStore.subscribe, notesStore.getSnapshot)

  /** `null` = đã chạm trần số ghi chú. */
  const create = useCallback((): string | null => {
    const current = notesStore.getSnapshot().notes
    if (current.length >= NOTE_LIMITS.notes) return null
    const note: Note = { id: newId(), title: '', body: '', tasks: [], updatedAt: Date.now() }
    notesStore.save([note, ...current])
    return note.id
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Note, 'id' | 'updatedAt'>>) => {
    const current = notesStore.getSnapshot().notes
    notesStore.save(sortNotes(current.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note))))
  }, [])

  const remove = useCallback((id: string) => {
    notesStore.save(notesStore.getSnapshot().notes.filter((note) => note.id !== id))
  }, [])

  const clear = useCallback(() => notesStore.save([]), [])

  return { notes, saveFailed, create, update, remove, clear }
}
