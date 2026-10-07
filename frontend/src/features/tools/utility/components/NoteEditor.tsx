import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { ConfirmAction, Icon } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import type { Note } from '../types/note.types'
import { NOTE_LIMITS } from '../utils/notes'
import { NoteTasks } from './NoteTasks'

interface NoteEditorProps {
  note: Note
  /** Lần ghi gần nhất không vào được máy. */
  saveFailed: boolean
  onChange: (patch: Partial<Pick<Note, 'title' | 'body' | 'tasks'>>) => void
  onDelete: () => void
  /** Về danh sách — chỉ hiện ở màn hẹp, nơi danh sách và khung soạn thay nhau. */
  onBack: () => void
}

/** Khung soạn một ghi chú. Mỗi phím gõ ghi thẳng xuống máy — không có nút Lưu. */
export function NoteEditor({ note, saveFailed, onChange, onDelete, onBack }: NoteEditorProps) {
  const { t } = useTranslation('utility')
  const ids = useId()

  return (
    <section className="erp-tool-panel erp-notes__editor" aria-label={t('notes.editorLabel')}>
      <Button variant="link" size="sm" className="erp-notes__back" onClick={onBack}>
        <Icon name="arrow-left" className="me-2" />
        {t('notes.backToList')}
      </Button>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-title`}>
          {t('notes.titleLabel')}
        </label>
        <Form.Control
          id={`${ids}-title`}
          type="text"
          placeholder={t('notes.titlePlaceholder')}
          maxLength={NOTE_LIMITS.title}
          value={note.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-body`}>
          {t('notes.body')}
        </label>
        <Form.Control
          id={`${ids}-body`}
          as="textarea"
          rows={8}
          className="erp-tool-textarea"
          placeholder={t('notes.bodyPlaceholder')}
          maxLength={NOTE_LIMITS.body}
          value={note.body}
          onChange={(event) => onChange({ body: event.target.value })}
        />
      </div>

      <NoteTasks tasks={note.tasks} onChange={(tasks) => onChange({ tasks })} />

      <div className="erp-notes__foot">
        {saveFailed ? (
          <p className="erp-notes__saved erp-notes__saved--failed" role="alert">
            <Icon name="exclamation-triangle" />
            {t('notes.saveFailed')}
          </p>
        ) : (
          <p className="erp-notes__saved" role="status">
            <Icon name="check2-circle" />
            {t('notes.savedAt', { time: formatDateTime(note.updatedAt) })}
          </p>
        )}
        <ConfirmAction title={t('notes.deleteTitle')} description={t('notes.localOnly')} confirmLabel={t('notes.deleteConfirm')} danger onConfirm={onDelete}>
          {({ onClick }) => (
            <Button variant="outline-danger" size="sm" onClick={onClick}>
              <Icon name="trash3" className="me-2" />
              {t('notes.delete')}
            </Button>
          )}
        </ConfirmAction>
      </div>
    </section>
  )
}
