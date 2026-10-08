import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { useChangePassword, useEndOtherSessions } from '../hooks/useAccount'
import type { AccountErrorCode, AccountUser } from '../types/account.types'
import { accountErrorCode } from '../utils/account-error'
import { passwordLengthProblem } from '../utils/password-policy'
import { PasswordInput } from './PasswordInput'
import { PasswordSetupForm } from './PasswordSetupForm'

function ChangePasswordForm() {
  const { t } = useTranslation('account')
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [lengthError, setLengthError] = useState<AccountErrorCode | null>(null)
  const change = useChangePassword()
  const errorCode = lengthError ?? (change.isError ? accountErrorCode(change.error) : null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!current || !next || change.isPending) return
    const problem = passwordLengthProblem(next)
    setLengthError(problem)
    if (problem) return
    change.mutate({ currentPassword: current, newPassword: next }, {
      onSuccess: () => {
        setCurrent('')
        setNext('')
        toast.success(t('account.security.changed'))
      },
    })
  }

  return (
    <form className="cn-account-form" onSubmit={submit} noValidate>
      <label className="cn-field-label" htmlFor="cn-security-current">{t('account.security.currentLabel')}</label>
      <PasswordInput
        id="cn-security-current"
        autoComplete="current-password"
        value={current}
        invalid={errorCode === 'PASSWORD_WRONG'}
        onChange={(value) => { setCurrent(value); change.reset() }}
      />
      <label className="cn-field-label cn-field-label--spaced" htmlFor="cn-security-new">{t('account.security.newLabel')}</label>
      <PasswordInput
        id="cn-security-new"
        autoComplete="new-password"
        value={next}
        invalid={Boolean(errorCode) && errorCode !== 'PASSWORD_WRONG'}
        describedBy="cn-security-hint"
        onChange={(value) => { setNext(value); setLengthError(null); change.reset() }}
      />
      <p id="cn-security-hint" className="cn-field-help">{t('setup.passwordHint')}</p>
      {errorCode ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${errorCode}`)}</p> : null}
      <div className="cn-account-actions">
        <button className="cn-button" type="submit" disabled={!current || !next || change.isPending}>
          <Icon name="key" />{change.isPending ? t('account.security.changing') : t('account.security.change')}
        </button>
      </div>
    </form>
  )
}

function EndOtherSessions() {
  const { t } = useTranslation('account')
  const toast = useToast()
  const end = useEndOtherSessions()
  return (
    <div className="cn-security-sessions">
      <p className="cn-account-card__text">{t('account.security.sessionsText')}</p>
      {end.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(end.error)}`)}</p> : null}
      <button
        type="button"
        className="cn-button cn-button--ghost"
        disabled={end.isPending}
        onClick={() => end.mutate(undefined, { onSuccess: ({ ended }) => toast.success(ended ? t('account.security.sessionsEnded') : t('account.security.sessionsNone')) })}
      >
        <Icon name="phone-flip" />{end.isPending ? t('account.security.sessionsBusy') : t('account.security.sessionsButton')}
      </button>
    </div>
  )
}

/** Password and sessions. Accounts made before passwords existed set one here with an emailed code. */
export function SecuritySection({ user }: { user: AccountUser }) {
  const { t } = useTranslation('account')
  const toast = useToast()
  return (
    <section className="cn-account-card" aria-labelledby="cn-account-security">
      <div className="cn-account-card__head"><h2 id="cn-account-security">{t('account.security.title')}</h2></div>
      {user.hasPassword ? (
        <>
          <p className="cn-account-card__text">{t('account.security.text')}</p>
          <ChangePasswordForm />
        </>
      ) : (
        <>
          <p className="cn-account-card__text">
            <Trans ns="account" i18nKey="account.security.noPassword" values={{ email: user.email }} components={{ strong: <strong /> }} />
          </p>
          <PasswordSetupForm mode="set" email={user.email} fixedEmail onSaved={() => toast.success(t('account.security.set'))} />
        </>
      )}
      <EndOtherSessions />
    </section>
  )
}
