import type { Note, NoteTask } from '../types/note.types'

/** Trần để một ô localStorage (~5 MB cho cả origin) không bị ghi chú ăn hết. */
export const NOTE_LIMITS = { notes: 200, title: 120, body: 20_000, tasks: 100, task: 300 } as const

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '')

function parseTask(raw: unknown): NoteTask | null {
  if (typeof raw !== 'object' || raw === null) return null
  const task = raw as Record<string, unknown>
  if (typeof task.id !== 'string' || task.id === '') return null
  return { id: task.id, text: text(task.text, NOTE_LIMITS.task), done: task.done === true }
}

function parseNote(raw: unknown): Note | null {
  if (typeof raw !== 'object' || raw === null) return null
  const note = raw as Record<string, unknown>
  if (typeof note.id !== 'string' || note.id === '') return null
  const tasks = Array.isArray(note.tasks) ? note.tasks.map(parseTask).filter((task): task is NoteTask => task !== null) : []
  return {
    id: note.id,
    title: text(note.title, NOTE_LIMITS.title),
    body: text(note.body, NOTE_LIMITS.body),
    tasks: tasks.slice(0, NOTE_LIMITS.tasks),
    updatedAt: typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt) ? note.updatedAt : 0,
  }
}

/**
 * Đọc chuỗi đã lưu. Dữ liệu trong localStorage có thể do bản cũ, tab khác hoặc
 * tay người ghi — không tin kiểu của nó; mục hỏng bị bỏ, không làm hỏng cả kho.
 */
export function parseNotes(raw: string | null): Note[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    const list = typeof value === 'object' && value !== null && Array.isArray((value as { notes?: unknown }).notes) ? (value as { notes: unknown[] }).notes : []
    const seen = new Set<string>()
    const notes: Note[] = []
    for (const item of list) {
      const note = parseNote(item)
      if (!note || seen.has(note.id)) continue
      seen.add(note.id)
      notes.push(note)
    }
    return sortNotes(notes).slice(0, NOTE_LIMITS.notes)
  } catch {
    return []
  }
}

export function serializeNotes(notes: Note[]): string {
  return JSON.stringify({ version: 1, notes })
}

/** Mới sửa lên đầu. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((first, second) => second.updatedAt - first.updatedAt)
}

/** Tên hiện trong danh sách: tiêu đề, không có thì dòng chữ đầu, rồi việc đầu tiên. */
export function noteLabel(note: Note): string {
  const title = note.title.trim()
  if (title) return title
  const firstLine = note.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  if (firstLine) return firstLine
  return note.tasks.find((task) => task.text.trim())?.text.trim() ?? 'Ghi chú chưa có nội dung'
}

export function isBlankNote(note: Note): boolean {
  return note.title.trim() === '' && note.body.trim() === '' && note.tasks.every((task) => task.text.trim() === '')
}

export function taskProgress(note: Note): { done: number; total: number } {
  return { done: note.tasks.filter((task) => task.done).length, total: note.tasks.length }
}
