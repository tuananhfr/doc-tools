import { useRef, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useLocale } from '@/i18n/I18nProvider'
import { useRequestCode, useSetupPassword } from '../hooks/useAccount'
import { useCountdown } from '../hooks/useCountdown'
import type { AccountErrorCode } from '../types/account.types'
import { accountErrorCode } from '../utils/account-error'
import { EMAIL_PATTERN } from '../utils/email'
import { passwordLengthProblem } from '../utils/password-policy'
import { PasswordInput } from './PasswordInput'

const RESEND_SECONDS = 60

/** `set` is a signed-in account that predates passwords; the backend treats all three the same way. */
export type PasswordSetupMode = 'signup' | 'reset' | 'set'

interface PasswordSetupFormProps {
  mode: PasswordSetupMode
  email: string
  onEmailChange?: (email: string) => void
  /** The account page passes the signed-in email, which cannot be changed here. */
  fixedEmail?: boolean
  onSaved?: () => void
}

/** Email → 6-digit code → code + password. Success signs in and signs out every other device. */
export function PasswordSetupForm({ mode, email, onEmailChange, fixedEmail = false, onSaved }: PasswordSetupFormProps) {
  const { t } = useTranslation('account')
  const locale = useLocale()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [lengthError, setLengthError] = useState<AccountErrorCode | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [notice, setNotice] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)
  const request = useRequestCode()
  const setup = useSetupPassword()
  const wait = useCountdown(resendAt)
  const error = request.error ?? setup.error
  const errorText = lengthError ? t(`errors.${lengthError}`) : error ? t(`errors.${accountErrorCode(error)}`) : ''

  const send = (target: string, onSent: () => void) => {
    setup.reset()
    request.mutate({ email: target, locale }, {
      onSuccess: () => {
        setResendAt(Date.now() + RESEND_SECONDS * 1000)
        onSent()
      },
    })
  }

  const submitEmail = (event: FormEvent) => {
    event.preventDefault()
    const target = email.trim()
    if (!EMAIL_PATTERN.test(target) || request.isPending) return
    send(target, () => {
      setSentTo(target)
      setCode('')
      setNotice('')
      requestAnimationFrame(() => codeInput.current?.focus())
    })
  }

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    if (!sentTo || code.length !== 6 || setup.isPending) return
    const problem = passwordLengthProblem(password)
    setLengthError(problem)
    if (problem) return
    request.reset()
    setup.mutate({ email: sentTo, code, password }, { onSuccess: () => onSaved?.() })
  }

  const changePassword = (value: string) => { setPassword(value); setLengthError(null); setup.reset() }

  if (!sentTo) {
    return (
      <form className="cn-account-form" onSubmit={submitEmail} noValidate>
        {fixedEmail ? null : (
          <>
            <label className="cn-field-label" htmlFor="cn-setup-email">{t('login.emailLabel')}</label>
            <input
              id="cn-setup-email"
              className="form-control cn-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(event) => { onEmailChange?.(event.target.value); request.reset() }}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorText ? 'cn-setup-error' : undefined}
            />
          </>
        )}
        {errorText ? <p id="cn-setup-error" className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{errorText}</p> : null}
        <button className={fixedEmail ? 'cn-button cn-button--ghost cn-setup-start' : 'cn-button cn-account-submit'} type="submit" disabled={request.isPending || !EMAIL_PATTERN.test(email.trim())}>
          {fixedEmail ? <Icon name="envelope" /> : null}{request.isPending ? t('setup.sending') : t('setup.sendCode')}
        </button>
      </form>
    )
  }

  return (
    <form className="cn-account-form" onSubmit={submitPassword} noValidate>
      <p className="cn-account-sent">
        <Icon name="envelope-check" />
        <span><Trans ns="account" i18nKey="setup.codeSentTo" values={{ email: sentTo }} components={{ strong: <strong /> }} /></span>
      </p>
      <label className="cn-field-label" htmlFor="cn-setup-code">{t('setup.codeLabel')}</label>
      <input
        ref={codeInput}
        id="cn-setup-code"
        className="form-control cn-input cn-code-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setup.reset() }}
        aria-invalid={error && accountErrorCode(error) === 'OTP_INVALID' ? true : undefined}
        aria-describedby="cn-setup-code-hint"
      />
      <p id="cn-setup-code-hint" className="cn-field-help">{t('setup.codeHint')}</p>
      <label className="cn-field-label cn-field-label--spaced" htmlFor="cn-setup-password">{t(`setup.${mode}.passwordLabel`)}</label>
      <PasswordInput
        id="cn-setup-password"
        autoComplete="new-password"
        value={password}
        onChange={changePassword}
        invalid={Boolean(lengthError) || (error ? accountErrorCode(error).startsWith('PASSWORD_') : false)}
        describedBy={errorText ? 'cn-setup-password-hint cn-setup-error' : 'cn-setup-password-hint'}
      />
      <p id="cn-setup-password-hint" className="cn-field-help">{t('setup.passwordHint')}</p>
      {errorText ? <p id="cn-setup-error" className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{errorText}</p> : null}
      {notice && !errorText ? <p className="cn-form-notice" role="status">{notice}</p> : null}
      <button className="cn-button cn-account-submit" type="submit" disabled={setup.isPending || code.length !== 6 || !password}>
        {setup.isPending ? t('setup.saving') : t(`setup.${mode}.submit`)}
      </button>
      <div className="cn-account-links">
        {fixedEmail ? <span /> : (
          <button type="button" className="cn-link-button" onClick={() => { setSentTo(null); request.reset(); setup.reset() }}>
            <Icon name="arrow-left" />{t('setup.changeEmail')}
          </button>
        )}
        <button type="button" className="cn-link-button" disabled={wait > 0 || request.isPending} onClick={() => send(sentTo, () => { setCode(''); setNotice(t('setup.resent')); codeInput.current?.focus() })}>
          {wait > 0 ? t('setup.resendIn', { seconds: wait }) : t('setup.resend')}
        </button>
      </div>
    </form>
  )
}
