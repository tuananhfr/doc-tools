import { useRef, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { useLocale } from '@/i18n/I18nProvider'
import { useConfirmEmailChange, useRequestEmailChange } from '../hooks/useAccount'
import { useCountdown } from '../hooks/useCountdown'
import type { AccountUser } from '../types/account.types'
import { accountErrorCode } from '../utils/account-error'
import { EMAIL_PATTERN } from '../utils/email'
import { PasswordInput } from './PasswordInput'

const RESEND_SECONDS = 60

type Step = 'idle' | 'form' | 'code'

/** New address + password → code sent to the new address → confirm. The email changes only at the last step. */
export function EmailChangeSection({ user }: { user: AccountUser }) {
  const { t } = useTranslation('account')
  const locale = useLocale()
  const toast = useToast()
  const [step, setStep] = useState<Step>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [notice, setNotice] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)
  const request = useRequestEmailChange()
  const confirm = useConfirmEmailChange()
  const wait = useCountdown(resendAt)
  const error = request.error ?? confirm.error
  const errorCode = error ? accountErrorCode(error) : null

  const reset = () => { setStep('idle'); setEmail(''); setPassword(''); setCode(''); setNotice(''); request.reset(); confirm.reset() }

  const send = (onSent: () => void) => {
    confirm.reset()
    request.mutate({ email: email.trim(), password, locale }, {
      onSuccess: () => { setResendAt(Date.now() + RESEND_SECONDS * 1000); onSent() },
    })
  }

  const submitForm = (event: FormEvent) => {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim()) || !password || request.isPending) return
    send(() => {
      setStep('code')
      setCode('')
      setNotice('')
      requestAnimationFrame(() => codeInput.current?.focus())
    })
  }

  const submitCode = (event: FormEvent) => {
    event.preventDefault()
    if (code.length !== 6 || confirm.isPending) return
    request.reset()
    confirm.mutate(code, { onSuccess: () => { toast.success(t('account.email.changed')); reset() } })
  }

  return (
    <section className="cn-account-card" aria-labelledby="cn-account-email">
      <div className="cn-account-card__head"><h2 id="cn-account-email">{t('account.email.title')}</h2></div>
      <p className="cn-account-card__text">
        <Trans ns="account" i18nKey="account.email.current" values={{ email: user.email }} components={{ strong: <strong className="cn-account-email" /> }} />
      </p>

      {step === 'idle' ? (
        user.hasPassword ? (
          <button type="button" className="cn-button cn-button--ghost" onClick={() => setStep('form')}>
            <Icon name="envelope-at" />{t('account.email.start')}
          </button>
        ) : <p className="cn-account-note"><Icon name="key" />{t('account.email.needsPassword')}</p>
      ) : null}

      {step === 'form' ? (
        <form className="cn-account-form" onSubmit={submitForm} noValidate>
          <label className="cn-field-label" htmlFor="cn-email-new">{t('account.email.newLabel')}</label>
          <input
            id="cn-email-new"
            className="form-control cn-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
            maxLength={254}
            value={email}
            onChange={(event) => { setEmail(event.target.value); request.reset() }}
            aria-invalid={errorCode === 'EMAIL_INVALID' || errorCode === 'EMAIL_SAME' ? true : undefined}
            aria-describedby="cn-email-hint"
          />
          <p id="cn-email-hint" className="cn-field-help">{t('account.email.formHint')}</p>
          <label className="cn-field-label cn-field-label--spaced" htmlFor="cn-email-password">{t('account.email.passwordLabel')}</label>
          <PasswordInput
            id="cn-email-password"
            autoComplete="current-password"
            value={password}
            invalid={errorCode === 'PASSWORD_WRONG'}
            onChange={(value) => { setPassword(value); request.reset() }}
          />
          {errorCode ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${errorCode}`)}</p> : null}
          <div className="cn-account-actions">
            <button className="cn-button" type="submit" disabled={request.isPending || !password || !EMAIL_PATTERN.test(email.trim())}>
              <Icon name="send" />{request.isPending ? t('setup.sending') : t('account.email.send')}
            </button>
            <button className="cn-button cn-button--ghost" type="button" disabled={request.isPending} onClick={reset}>{t('account.email.cancel')}</button>
          </div>
        </form>
      ) : null}

      {step === 'code' ? (
        <form className="cn-account-form" onSubmit={submitCode} noValidate>
          <p className="cn-account-sent">
            <Icon name="envelope-check" />
            <span><Trans ns="account" i18nKey="setup.codeSentTo" values={{ email: email.trim().toLowerCase() }} components={{ strong: <strong /> }} /></span>
          </p>
          <label className="cn-field-label" htmlFor="cn-email-code">{t('setup.codeLabel')}</label>
          <input
            ref={codeInput}
            id="cn-email-code"
            className="form-control cn-input cn-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); confirm.reset() }}
            aria-invalid={errorCode === 'OTP_INVALID' ? true : undefined}
            aria-describedby="cn-email-code-hint"
          />
          <p id="cn-email-code-hint" className="cn-field-help">{t('setup.codeHint')}</p>
          {errorCode ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${errorCode}`)}</p> : null}
          {notice && !errorCode ? <p className="cn-form-notice" role="status">{notice}</p> : null}
          <div className="cn-account-actions">
            <button className="cn-button" type="submit" disabled={confirm.isPending || code.length !== 6}>
              <Icon name="check2" />{confirm.isPending ? t('account.email.confirming') : t('account.email.confirm')}
            </button>
            <button className="cn-button cn-button--ghost" type="button" disabled={confirm.isPending} onClick={reset}>{t('account.email.cancel')}</button>
          </div>
          <div className="cn-account-links">
            <button type="button" className="cn-link-button" onClick={() => { setStep('form'); request.reset(); confirm.reset() }}>
              <Icon name="arrow-left" />{t('account.email.back')}
            </button>
            <button type="button" className="cn-link-button" disabled={wait > 0 || request.isPending} onClick={() => send(() => { setCode(''); setNotice(t('setup.resent')); codeInput.current?.focus() })}>
              {wait > 0 ? t('setup.resendIn', { seconds: wait }) : t('setup.resend')}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
