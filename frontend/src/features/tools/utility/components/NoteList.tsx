import { Icon } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import type { Note } from '../types/note.types'
import { noteLabel, taskProgress } from '../utils/notes'

interface NoteListProps {
  notes: Note[]
  /** Ghi chú đang mở ở khung soạn. */
  openId: string | null
  onOpen: (id: string) => void
}

/** Danh sách ghi chú, mới sửa ở trên. */
export function NoteList({ notes, openId, onOpen }: NoteListProps) {
  return (
    <ul className="erp-notes__items">
      {notes.map((note) => {
        const progress = taskProgress(note)
        return (
          <li key={note.id}>
            <button type="button" className={`erp-note-item${note.id === openId ? ' is-active' : ''}`} aria-current={note.id === openId ? 'true' : undefined} onClick={() => onOpen(note.id)}>
              <span className="erp-note-item__name">{noteLabel(note)}</span>
              <span className="erp-note-item__meta">
                {progress.total > 0 ? (
                  <span className="erp-note-item__tasks">
                    <Icon name="check2-square" />
                    {progress.done}/{progress.total}
                  </span>
                ) : null}
                {formatDateTime(note.updatedAt)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
