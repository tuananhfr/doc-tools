import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { useDeleteAccount } from '../hooks/useAccount'
import { accountErrorCode } from '../utils/account-error'
import { PasswordInput } from './PasswordInput'

interface DeleteAccountSectionProps { staff: boolean; hasPassword: boolean; onDeleted: () => void }

export function DeleteAccountSection({ staff, hasPassword, onDeleted }: DeleteAccountSectionProps) {
  const { t } = useTranslation('account')
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const remove = useDeleteAccount(() => {
    onDeleted()
    toast.success(t('account.delete.done'))
    void navigate('/', { replace: true })
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (password && !remove.isPending) remove.mutate(password)
  }
  const cancel = () => { setOpen(false); setPassword(''); remove.reset() }

  return (
    <section className="cn-account-card is-danger" aria-labelledby="cn-account-delete">
      <div className="cn-account-card__head"><h2 id="cn-account-delete">{t('account.delete.title')}</h2></div>
      <p className="cn-account-card__text">{t('account.delete.text')}</p>
      <ul className="cn-delete-points">
        {(['data', 'ai', 'contributions'] as const).map((point) => <li key={point}>{t(`account.delete.points.${point}`)}</li>)}
      </ul>
      {staff ? (
        <p className="cn-delete-note"><Icon name="shield-lock" />{t('account.delete.staff')}</p>
      ) : !hasPassword ? (
        <p className="cn-delete-note"><Icon name="key" />{t('account.delete.needsPassword')}</p>
      ) : !open ? (
        <button type="button" className="cn-button cn-button--danger-ghost" onClick={() => setOpen(true)}>
          <Icon name="trash3" />{t('account.delete.start')}
        </button>
      ) : (
        <form className="cn-account-form" onSubmit={submit} noValidate>
          <label className="cn-field-label" htmlFor="cn-delete-confirm">{t('account.delete.confirmLabel')}</label>
          <PasswordInput
            id="cn-delete-confirm"
            autoComplete="current-password"
            autoFocus
            value={password}
            invalid={remove.isError}
            onChange={(value) => { setPassword(value); remove.reset() }}
          />
          {remove.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(remove.error)}`)}</p> : null}
          <div className="cn-account-actions">
            <button className="cn-button cn-button--red" type="submit" disabled={!password || remove.isPending}>
              <Icon name="trash3" />{remove.isPending ? t('account.delete.busy') : t('account.delete.confirm')}
            </button>
            <button className="cn-button cn-button--ghost" type="button" disabled={remove.isPending} onClick={cancel}>{t('account.delete.cancel')}</button>
          </div>
        </form>
      )}
    </section>
  )
}
