import { Button, Form, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { FormFill, FormGroup } from '../hooks/useFormFill'
import { FormFieldInput } from './FormFieldInput'

interface FormFillPanelProps {
  form: FormFill
  onApply: () => void
}

function GroupNotes({ group }: { group: FormGroup }) {
  const { info, hidden } = group
  if (!info) return null
  const notes = [
    hidden > 0 && `${hidden} trường nằm ở trang đã bỏ khỏi tài liệu — không hiện.`,
    info.skipped > 0 && `${info.skipped} ô chữ ký / nút bấm không điền ở đây.`,
  ].filter(Boolean)
  return (
    <>
      {info.xfa ? (
        <p className="erp-doc-form__warn" role="note">
          <Icon name="exclamation-triangle" className="me-2" />
          {info.fields.length > 0
            ? 'Tệp có thêm form XFA — chưa hỗ trợ. Khi áp dụng, phần XFA bị bỏ để mọi trình xem hiện cùng giá trị đã điền.'
            : 'Form dạng XFA (Adobe LiveCycle) — chưa hỗ trợ điền.'}
        </p>
      ) : null}
      {info.signed > 0 ? (
        <p className="erp-doc-form__warn" role="note">
          <Icon name="exclamation-triangle" className="me-2" />
          Tệp có {info.signed} chữ ký số — điền form là sửa tệp, chữ ký sẽ không còn hiệu lực.
        </p>
      ) : null}
      {notes.map((note) => (
        <p key={note as string} className="erp-doc-export__note mb-0">
          {note}
        </p>
      ))}
    </>
  )
}

/** Tab Điền form: một khối cho mỗi tệp có form, thanh Áp dụng dính đáy. */
export function FormFillPanel({ form, onApply }: FormFillPanelProps) {
  const { groups, pending, lockable, flatten, applying } = form
  const canApply = !applying && (pending > 0 || (flatten && lockable))

  return (
    <div className="erp-doc-form">
      {groups.map((group) => (
        <section key={group.source.id} className="erp-doc-export__section" aria-label={`Form của ${group.source.name}`}>
          <h2 className="erp-doc-export__title">
            <Icon name="ui-checks" className="me-2" />
            <span className="erp-doc-form__file">{group.source.name}</span>
          </h2>
          {group.info === undefined ? (
            <p className="erp-doc-export__note mb-0" role="status">
              <Spinner as="span" size="sm" className="me-2" aria-hidden />
              Đang đọc form…
            </p>
          ) : group.info === null ? (
            <p className="erp-doc-form__warn" role="alert">
              <Icon name="x-octagon" className="me-2" />
              Không đọc được form của tệp này.
            </p>
          ) : (
            <>
              <GroupNotes group={group} />
              {group.placed.map(({ field, position }) => (
                <FormFieldInput
                  key={field.name}
                  field={field}
                  position={position}
                  value={field.name in group.draft ? group.draft[field.name] : field.value}
                  disabled={applying}
                  onChange={(value) => form.setValue(group.source.id, field.name, value)}
                />
              ))}
            </>
          )}
        </section>
      ))}

      <section className="erp-doc-export__section">
        <Form.Check
          type="switch"
          id="doc-form-flatten"
          checked={flatten}
          disabled={applying}
          label="Khoá form sau khi điền (in phẳng)"
          onChange={(event) => form.setFlatten(event.target.checked)}
        />
        <p className="erp-doc-export__note mb-0">
          {flatten ? 'Người nhận không sửa được nữa; trình xem PDF nào cũng hiện giống nhau.' : 'Người nhận vẫn sửa tiếp được trên Acrobat, Foxit, trình duyệt.'}
        </p>
        <p className="erp-doc-export__note mb-0">Áp dụng rồi mới tải về ở tab Xuất tệp — Ctrl+Z để hoàn tác.</p>
      </section>

      {/* Chỉ hàng nút dính đáy: cả công tắc + ghi chú thì chiếm 1/3 màn điện thoại. */}
      <div className="erp-doc-form__apply">
        <Button variant="primary" className="erp-doc-export__cta" disabled={!canApply} onClick={onApply}>
          {applying ? (
            <>
              <Spinner as="span" size="sm" className="me-2" aria-hidden />
              Đang điền…
            </>
          ) : (
            <>
              <Icon name="check2-square" className="me-2" />
              {pending > 0 ? `Áp dụng ${pending} thay đổi` : flatten && lockable ? 'Khoá form' : 'Chưa có thay đổi'}
            </>
          )}
        </Button>
        {pending > 0 && !applying ? (
          <Button variant="link" className="erp-doc-form__discard" onClick={form.discard}>
            Bỏ thay đổi
          </Button>
        ) : null}
      </div>
    </div>
  )
}
