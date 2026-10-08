import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useLogin } from '../hooks/useAccount'
import { accountErrorCode } from '../utils/account-error'
import { EMAIL_PATTERN } from '../utils/email'
import { PasswordInput } from './PasswordInput'

interface PasswordLoginFormProps {
  email: string
  onEmailChange: (email: string) => void
  onForgot: () => void
  onSignup: () => void
}

export function PasswordLoginForm({ email, onEmailChange, onForgot, onSignup }: PasswordLoginFormProps) {
  const { t } = useTranslation('account')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const ready = EMAIL_PATTERN.test(email.trim()) && password.length > 0
  const errorText = login.isError ? t(`errors.${accountErrorCode(login.error)}`) : ''

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!ready || login.isPending) return
    // Success writes the session into the `/me` cache; the page redirects from there.
    login.mutate({ email: email.trim(), password })
  }

  return (
    <form className="cn-account-form" onSubmit={submit} noValidate>
      <label className="cn-field-label" htmlFor="cn-login-email">{t('login.emailLabel')}</label>
      <input
        id="cn-login-email"
        className="form-control cn-input"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={254}
        placeholder={t('login.emailPlaceholder')}
        value={email}
        onChange={(event) => { onEmailChange(event.target.value); login.reset() }}
        aria-invalid={login.isError ? true : undefined}
        aria-describedby={errorText ? 'cn-login-error' : undefined}
      />
      <div className="cn-field-row">
        <label className="cn-field-label" htmlFor="cn-login-password">{t('login.passwordLabel')}</label>
        <button type="button" className="cn-link-button" onClick={onForgot}>{t('login.forgot')}</button>
      </div>
      <PasswordInput
        id="cn-login-password"
        autoComplete="current-password"
        value={password}
        onChange={(value) => { setPassword(value); login.reset() }}
        invalid={login.isError}
        describedBy={errorText ? 'cn-login-error' : undefined}
      />
      {errorText ? <p id="cn-login-error" className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{errorText}</p> : null}
      <button className="cn-button cn-account-submit" type="submit" disabled={!ready || login.isPending}>
        {login.isPending ? t('login.submitting') : t('login.submit')}
      </button>
      <p className="cn-account-switch">
        {t('login.noAccount')} <button type="button" className="cn-link-button" onClick={onSignup}>{t('login.createAccount')}</button>
      </p>
      <p className="cn-account-fineprint">
        <Trans ns="account" i18nKey="login.terms" components={{ terms: <Link to="/dieu-khoan" />, privacy: <Link to="/quyen-rieng-tu" /> }} />
      </p>
    </form>
  )
}
