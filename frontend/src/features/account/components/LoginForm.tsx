import { useRef, useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useLocale } from '@/i18n/I18nProvider'
import { useRequestCode, useVerifyCode } from '../hooks/useAccount'
import { useCountdown } from '../hooks/useCountdown'
import { accountErrorCode } from '../utils/account-error'

const RESEND_SECONDS = 60
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginForm() {
  const { t } = useTranslation('account')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [notice, setNotice] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)
  const request = useRequestCode()
  const verify = useVerifyCode()
  const wait = useCountdown(resendAt)
  const error = request.error ?? verify.error

  const send = (target: string, onSent: () => void) => {
    verify.reset()
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

  const submitCode = (value: string) => {
    if (!sentTo || !/^\d{6}$/.test(value) || verify.isPending) return
    request.reset()
    verify.mutate({ email: sentTo, code: value })
  }

  const changeCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    // Autofill from the mail app or a paste delivers all six digits at once.
    if (digits.length === 6 && digits !== code) submitCode(digits)
  }

  const errorText = error ? t(`errors.${accountErrorCode(error)}`) : ''

  if (!sentTo) {
    return (
      <form className="cn-account-form" onSubmit={submitEmail} noValidate>
        <label className="cn-field-label" htmlFor="cn-login-email">{t('login.emailLabel')}</label>
        <input
          id="cn-login-email"
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
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorText ? 'cn-login-error' : undefined}
        />
        {errorText ? <p id="cn-login-error" className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{errorText}</p> : null}
        <button className="cn-button cn-account-submit" type="submit" disabled={request.isPending || !EMAIL_PATTERN.test(email.trim())}>
          {request.isPending ? t('login.sending') : t('login.sendCode')}
        </button>
        <p className="cn-account-fineprint">
          <Trans ns="account" i18nKey="login.terms" components={{ terms: <Link to="/dieu-khoan" />, privacy: <Link to="/quyen-rieng-tu" /> }} />
        </p>
      </form>
    )
  }

  return (
    <form className="cn-account-form" onSubmit={(event) => { event.preventDefault(); submitCode(code) }} noValidate>
      <p className="cn-account-sent">
        <Icon name="envelope-check" />
        <span><Trans ns="account" i18nKey="login.codeSentTo" values={{ email: sentTo }} components={{ strong: <strong /> }} /></span>
      </p>
      <label className="cn-field-label" htmlFor="cn-login-code">{t('login.codeLabel')}</label>
      <input
        ref={codeInput}
        id="cn-login-code"
        className="form-control cn-input cn-code-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(event) => changeCode(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorText ? 'cn-login-error cn-login-hint' : 'cn-login-hint'}
      />
      <p id="cn-login-hint" className="cn-field-help">{t('login.codeHint')}</p>
      {errorText ? <p id="cn-login-error" className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{errorText}</p> : null}
      {notice && !errorText ? <p className="cn-form-notice" role="status">{notice}</p> : null}
      <button className="cn-button cn-account-submit" type="submit" disabled={verify.isPending || code.length !== 6}>
        {verify.isPending ? t('login.verifying') : t('login.verify')}
      </button>
      <div className="cn-account-links">
        <button type="button" className="cn-link-button" onClick={() => { setSentTo(null); request.reset(); verify.reset() }}>
          <Icon name="arrow-left" />{t('login.changeEmail')}
        </button>
        <button type="button" className="cn-link-button" disabled={wait > 0 || request.isPending} onClick={() => send(sentTo, () => { setCode(''); setNotice(t('login.resent')); codeInput.current?.focus() })}>
          {wait > 0 ? t('login.resendIn', { seconds: wait }) : t('login.resend')}
        </button>
      </div>
    </form>
  )
}
