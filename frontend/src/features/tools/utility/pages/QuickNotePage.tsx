import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-bootstrap'
import { ConfirmAction, Icon, useToast } from '@/components/ui'
import { NoteEditor } from '../components/NoteEditor'
import { NoteList } from '../components/NoteList'
import { useNotes } from '../hooks/useNotes'
import { isBlankNote, NOTE_LIMITS } from '../utils/notes'

/**
 * GHI CHÚ NHANH — ghi chú và danh sách việc lưu trong trình duyệt của máy này.
 * Không có tài khoản, không đồng bộ: màn hình nói thẳng điều đó, vì "ghi chú của
 * tôi biến mất" là thứ người dùng không tha thứ.
 */
export default function QuickNotePage() {
  const { t } = useTranslation('utility')
  const toast = useToast()
  const { notes, saveFailed, create, update, remove, clear } = useNotes()
  // Màn rộng mở sẵn ghi chú mới nhất; màn hẹp (danh sách và khung soạn thay nhau) bắt đầu ở danh sách.
  const [openId, setOpenId] = useState<string | null>(() => (window.matchMedia('(min-width: 1025px)').matches ? (notes[0]?.id ?? null) : null))

  // Ghi chú đang mở có thể vừa bị xoá ở tab khác.
  const open = notes.find((note) => note.id === openId) ?? null

  const add = () => {
    // Còn một ghi chú trống thì mở lại nó — bấm "Ghi chú mới" mười lần không đẻ ra mười ghi chú rỗng.
    const blank = notes.find(isBlankNote)
    if (blank) return setOpenId(blank.id)
    const id = create()
    if (id) setOpenId(id)
    else toast.error(t('notes.limitReached', { count: NOTE_LIMITS.notes }))
  }

  return (
    <div className={`erp-notes${open ? ' has-open' : ''}`}>
      <section className="erp-tool-panel erp-notes__list" aria-label={t('notes.listLabel')}>
        <div className="erp-tool-panel__head">
          <h2 className="erp-tool-panel__title">{notes.length > 0 ? t('notes.titleCount', { count: notes.length }) : t('notes.title')}</h2>
          <Button variant="primary" size="sm" onClick={add}>
            <Icon name="plus-lg" className="me-2" />
            {t('notes.newNote')}
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="erp-flow-field__hint">{t('notes.empty')}</p>
        ) : (
          <NoteList notes={notes} openId={open?.id ?? null} onOpen={setOpenId} />
        )}

        <p className="erp-notes__notice">
          <Icon name="info-circle" />
          <span>{t('notes.notice')}</span>
        </p>

        {notes.length > 1 ? (
          <ConfirmAction
            title={t('notes.clearAllTitle', { count: notes.length })}
            description={t('notes.localOnly')}
            confirmLabel={t('notes.clearAllConfirm')}
            danger
            onConfirm={() => {
              clear()
              setOpenId(null)
            }}
          >
            {({ onClick }) => (
              <Button variant="link" size="sm" className="erp-flow-files__clear align-self-start" onClick={onClick}>
                {t('notes.clearAll')}
              </Button>
            )}
          </ConfirmAction>
        ) : null}
      </section>

      {open ? (
        <NoteEditor
          key={open.id}
          note={open}
          saveFailed={saveFailed}
          onChange={(patch) => update(open.id, patch)}
          onDelete={() => {
            remove(open.id)
            setOpenId(null)
          }}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <section className="erp-tool-panel erp-notes__editor erp-notes__editor--empty" aria-label={t('notes.editorLabel')}>
          <Icon name="journal-text" className="erp-notes__empty-icon" />
          <p className="erp-notes__empty-text">{notes.length === 0 ? t('notes.emptyStart') : t('notes.emptyPick')}</p>
          <Button variant="outline-secondary" onClick={add}>
            <Icon name="plus-lg" className="me-2" />
            {t('notes.newNote')}
          </Button>
        </section>
      )}
    </div>
  )
}
