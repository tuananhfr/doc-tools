import { Button, Form, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { FormFill, FormGroup } from '../hooks/useFormFill'
import { FormFieldInput } from './FormFieldInput'

interface FormFillPanelProps {
  form: FormFill
  onApply: () => void
}

function GroupNotes({ group }: { group: FormGroup }) {
  const { t } = useTranslation('pdf')
  const { info, hidden } = group
  if (!info) return null
  const notes = [
    hidden > 0 && t('form.hidden', { count: hidden }),
    info.skipped > 0 && t('form.skipped', { count: info.skipped }),
  ].filter(Boolean)
  return (
    <>
      {info.xfa ? (
        <p className="erp-doc-form__warn" role="note">
          <Icon name="exclamation-triangle" className="me-2" />
          {info.fields.length > 0
            ? t('form.xfaMixed')
            : t('form.xfaOnly')}
        </p>
      ) : null}
      {info.signed > 0 ? (
        <p className="erp-doc-form__warn" role="note">
          <Icon name="exclamation-triangle" className="me-2" />
          {t('form.signed', { count: info.signed })}
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
  const { t } = useTranslation('pdf')
  const { groups, pending, lockable, flatten, applying } = form
  const canApply = !applying && (pending > 0 || (flatten && lockable))

  return (
    <div className="erp-doc-form">
      {groups.map((group) => (
        <section key={group.source.id} className="erp-doc-export__section" aria-label={t('form.groupLabel', { name: group.source.name })}>
          <h2 className="erp-doc-export__title">
            <Icon name="ui-checks" className="me-2" />
            <span className="erp-doc-form__file">{group.source.name}</span>
          </h2>
          {group.info === undefined ? (
            <p className="erp-doc-export__note mb-0" role="status">
              <Spinner as="span" size="sm" className="me-2" aria-hidden />
              {t('form.reading')}
            </p>
          ) : group.info === null ? (
            <p className="erp-doc-form__warn" role="alert">
              <Icon name="x-octagon" className="me-2" />
              {t('form.readFailed')}
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
          label={t('form.flatten')}
          onChange={(event) => form.setFlatten(event.target.checked)}
        />
        <p className="erp-doc-export__note mb-0">{flatten ? t('form.flattenOn') : t('form.flattenOff')}</p>
        <p className="erp-doc-export__note mb-0">{t('form.applyNote')}</p>
      </section>

      {/* Chỉ hàng nút dính đáy: cả công tắc + ghi chú thì chiếm 1/3 màn điện thoại. */}
      <div className="erp-doc-form__apply">
        <Button variant="primary" className="erp-doc-export__cta" disabled={!canApply} onClick={onApply}>
          {applying ? (
            <>
              <Spinner as="span" size="sm" className="me-2" aria-hidden />
              {t('form.applying')}
            </>
          ) : (
            <>
              <Icon name="check2-square" className="me-2" />
              {pending > 0 ? t('form.applyCount', { count: pending }) : flatten && lockable ? t('form.lock') : t('form.noChanges')}
            </>
          )}
        </Button>
        {pending > 0 && !applying ? (
          <Button variant="link" className="erp-doc-form__discard" onClick={form.discard}>
            {t('form.discard')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
