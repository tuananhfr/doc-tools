import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { newId } from '@/utils/id'
import type { NoteTask } from '../types/note.types'
import { NOTE_LIMITS } from '../utils/notes'

interface NoteTasksProps {
  tasks: NoteTask[]
  onChange: (tasks: NoteTask[]) => void
}

/** Danh sách việc của một ghi chú: đánh dấu xong, sửa chữ, bỏ, thêm việc mới bằng Enter. */
export function NoteTasks({ tasks, onChange }: NoteTasksProps) {
  const { t } = useTranslation('utility')
  const ids = useId()
  const [draft, setDraft] = useState('')
  const full = tasks.length >= NOTE_LIMITS.tasks

  const add = () => {
    const text = draft.trim()
    if (!text || full) return
    onChange([...tasks, { id: newId(), text: text.slice(0, NOTE_LIMITS.task), done: false }])
    setDraft('')
  }

  const patch = (id: string, change: Partial<NoteTask>) => onChange(tasks.map((task) => (task.id === id ? { ...task, ...change } : task)))

  return (
    <div className="erp-flow-field">
      <span className="erp-flow-field__label" id={`${ids}-label`}>
        {t('notes.tasks')}
      </span>

      {tasks.length > 0 ? (
        <ul className="erp-note-tasks" aria-labelledby={`${ids}-label`}>
          {tasks.map((task, index) => (
            <li key={task.id} className={`erp-note-task${task.done ? ' is-done' : ''}`}>
              <Form.Check
                id={`${ids}-${task.id}`}
                type="checkbox"
                className="erp-note-task__check"
                aria-label={t('notes.taskDone', { task: task.text || t('notes.taskFallback', { number: index + 1 }) })}
                checked={task.done}
                onChange={(event) => patch(task.id, { done: event.target.checked })}
              />
              <Form.Control
                type="text"
                className="erp-note-task__text"
                aria-label={t('notes.task', { number: index + 1 })}
                maxLength={NOTE_LIMITS.task}
                value={task.text}
                onChange={(event) => patch(task.id, { text: event.target.value })}
              />
              <button type="button" className="btn erp-flow-file__button" aria-label={t('notes.removeTask', { number: index + 1 })} title={t('notes.removeTaskTitle')} onClick={() => onChange(tasks.filter((other) => other.id !== task.id))}>
                <Icon name="x-lg" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="erp-note-add"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <Form.Control
          type="text"
          aria-label={t('notes.newTask')}
          placeholder={full ? t('notes.tasksFull', { count: NOTE_LIMITS.tasks }) : t('notes.addTaskPlaceholder')}
          maxLength={NOTE_LIMITS.task}
          disabled={full}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="outline-secondary" disabled={full || draft.trim() === ''}>
          <Icon name="plus-lg" className="me-2" />
          {t('notes.addTask')}
        </Button>
      </form>
    </div>
  )
}
