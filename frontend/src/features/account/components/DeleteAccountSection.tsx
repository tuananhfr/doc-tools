import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { useDeleteAccount } from '../hooks/useAccount'
import { accountErrorCode } from '../utils/account-error'

// Same folding as the backend's normalizeEmail, so the button never enables for an answer the server refuses.
const sameEmail = (typed: string, email: string) => typed.trim().toLowerCase() === email.toLowerCase()

export function DeleteAccountSection({ email, staff, onDeleted }: { email: string; staff: boolean; onDeleted: () => void }) {
  const { t } = useTranslation('account')
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const remove = useDeleteAccount(() => {
    onDeleted()
    toast.success(t('account.delete.done'))
    void navigate('/', { replace: true })
  })
  const matches = sameEmail(typed, email)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (matches && !remove.isPending) remove.mutate(typed)
  }
  const cancel = () => { setOpen(false); setTyped(''); remove.reset() }

  return (
    <section className="cn-account-card is-danger" aria-labelledby="cn-account-delete">
      <div className="cn-account-card__head"><h2 id="cn-account-delete">{t('account.delete.title')}</h2></div>
      <p className="cn-account-card__text">{t('account.delete.text')}</p>
      <ul className="cn-delete-points">
        {(['data', 'ai', 'contributions'] as const).map((point) => <li key={point}>{t(`account.delete.points.${point}`)}</li>)}
      </ul>
      {staff ? (
        <p className="cn-delete-note"><Icon name="shield-lock" />{t('account.delete.staff')}</p>
      ) : !open ? (
        <button type="button" className="cn-button cn-button--danger-ghost" onClick={() => setOpen(true)}>
          <Icon name="trash3" />{t('account.delete.start')}
        </button>
      ) : (
        <form className="cn-account-form" onSubmit={submit} noValidate>
          <label className="cn-field-label" htmlFor="cn-delete-confirm">{t('account.delete.confirmLabel', { email })}</label>
          <input
            id="cn-delete-confirm"
            className="form-control cn-input"
            type="email"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={typed}
            onChange={(event) => { setTyped(event.target.value); remove.reset() }}
          />
          {remove.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(remove.error)}`)}</p> : null}
          <div className="cn-account-actions">
            <button className="cn-button cn-button--red" type="submit" disabled={!matches || remove.isPending}>
              <Icon name="trash3" />{remove.isPending ? t('account.delete.busy') : t('account.delete.confirm')}
            </button>
            <button className="cn-button cn-button--ghost" type="button" disabled={remove.isPending} onClick={cancel}>{t('account.delete.cancel')}</button>
          </div>
        </form>
      )}
    </section>
  )
}
