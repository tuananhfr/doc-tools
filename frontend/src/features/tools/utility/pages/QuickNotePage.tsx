import { useState } from 'react'
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
    else toast.error(`Đã đủ ${NOTE_LIMITS.notes} ghi chú. Xoá bớt ghi chú cũ để thêm mới.`)
  }

  return (
    <div className={`erp-notes${open ? ' has-open' : ''}`}>
      <section className="erp-tool-panel erp-notes__list" aria-label="Danh sách ghi chú">
        <div className="erp-tool-panel__head">
          <h2 className="erp-tool-panel__title">Ghi chú{notes.length > 0 ? ` (${notes.length})` : ''}</h2>
          <Button variant="primary" size="sm" onClick={add}>
            <Icon name="plus-lg" className="me-2" />
            Ghi chú mới
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="erp-flow-field__hint">Chưa có ghi chú nào trên máy này.</p>
        ) : (
          <NoteList notes={notes} openId={open?.id ?? null} onOpen={setOpenId} />
        )}

        <p className="erp-notes__notice">
          <Icon name="info-circle" />
          <span>Ghi chú nằm trong trình duyệt này, không theo tài khoản: ai dùng chung máy cũng đọc được, và xoá dữ liệu duyệt web là mất.</span>
        </p>

        {notes.length > 1 ? (
          <ConfirmAction
            title={`Xoá cả ${notes.length} ghi chú?`}
            description="Ghi chú chỉ nằm trên máy này, xoá rồi không lấy lại được."
            confirmLabel="Xoá hết"
            danger
            onConfirm={() => {
              clear()
              setOpenId(null)
            }}
          >
            {({ onClick }) => (
              <Button variant="link" size="sm" className="erp-flow-files__clear align-self-start" onClick={onClick}>
                Xoá tất cả ghi chú
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
        <section className="erp-tool-panel erp-notes__editor erp-notes__editor--empty" aria-label="Soạn ghi chú">
          <Icon name="journal-text" className="erp-notes__empty-icon" />
          <p className="erp-notes__empty-text">{notes.length === 0 ? 'Ghi điều cần nhớ, lập danh sách việc cần làm.' : 'Chọn một ghi chú ở danh sách để xem và sửa.'}</p>
          <Button variant="outline-secondary" onClick={add}>
            <Icon name="plus-lg" className="me-2" />
            Ghi chú mới
          </Button>
        </section>
      )}
    </div>
  )
}
