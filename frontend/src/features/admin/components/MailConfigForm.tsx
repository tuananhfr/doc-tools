import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { MAIL_TRANSPORT } from '../config/admin-labels'
import { useResetIntegration, useSaveIntegration } from '../hooks/useAdmin'
import type { Integrations, MailTransport, MailValues, SecretChange } from '../types/admin.types'
import { ErrorText } from './AdminKit'
import { ConfirmPasswordField, IntegrationNotices, SecretField } from './IntegrationFields'

const TRANSPORTS = Object.keys(MAIL_TRANSPORT) as MailTransport[]

export function MailConfigForm({ data, onDone }: { data: Integrations; onDone: () => void }) {
  const toast = useToast()
  const save = useSaveIntegration()
  const reset = useResetIntegration()
  const [values, setValues] = useState<MailValues>(data.mail.values)
  const [smtpPassword, setSmtpPassword] = useState<SecretChange>(undefined)
  const [password, setPassword] = useState('')
  const set = <K extends keyof MailValues>(name: K, value: MailValues[K]) => setValues((current) => ({ ...current, [name]: value }))
  const fromDomain = values.from.split('@')[1] || 'tên miền người gửi'
  const busy = save.isPending || reset.isPending

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const secrets: Record<string, string | null> = smtpPassword === undefined ? {} : { smtpPassword }
    // The selector belongs to the DKIM key; a key generated while this form was open must not be undone.
    save.mutate({ group: 'mail', password, values: { ...values, dkimSelector: data.mail.values.dkimSelector }, secrets }, { onSuccess: () => { toast.success('Đã lưu cấu hình gửi thư. Có hiệu lực ngay.'); onDone() } })
  }
  const backToEnv = () => {
    if (!window.confirm('Bỏ cấu hình đặt ở trang này, kể cả mật khẩu SMTP và khoá DKIM, để dùng lại .env của backend?')) return
    reset.mutate({ group: 'mail', password }, { onSuccess: () => { toast.success('Đã về cấu hình .env.'); onDone() } })
  }

  return (
    <form className="cn-admin-form" onSubmit={submit} noValidate>
      <IntegrationNotices data={data} />
      <label>
        Cách gửi
        <select value={values.transport} onChange={(event) => set('transport', event.target.value as MailTransport)}>
          {TRANSPORTS.map((value) => <option key={value} value={value}>{MAIL_TRANSPORT[value]}</option>)}
        </select>
        <span className="cn-admin-sub">SMTP: gửi qua hộp thư có sẵn (Google Workspace…), dễ nhất. Gửi thẳng: cần SPF, DKIM, PTR và cổng 25 mở. Chỉ ghi log: không gửi gì, chỉ dùng khi dev.</span>
      </label>
      <div className="cn-admin-form__row">
        <label className="is-grow">Email người gửi<input type="email" required maxLength={254} value={values.from} onChange={(event) => set('from', event.target.value)} /></label>
        <label className="is-grow">Tên người gửi<input required maxLength={100} value={values.fromName} onChange={(event) => set('fromName', event.target.value)} /></label>
      </div>

      {values.transport === 'smtp' ? (
        <fieldset className="cn-admin-fieldset">
          <legend>Máy chủ SMTP</legend>
          <div className="cn-admin-form__row">
            <label className="is-grow">Máy chủ<input required maxLength={253} spellCheck={false} placeholder="smtp.gmail.com" value={values.smtpHost} onChange={(event) => set('smtpHost', event.target.value)} /></label>
            <label>Cổng<input type="number" min={1} max={65535} step={1} required value={values.smtpPort} onChange={(event) => set('smtpPort', Number(event.target.value))} /></label>
          </div>
          <label className="is-check">
            <input type="checkbox" checked={values.smtpSecure} onChange={(event) => set('smtpSecure', event.target.checked)} />
            TLS ngay khi kết nối (cổng 465). Để tắt với cổng 587, máy chủ tự nâng lên STARTTLS.
          </label>
          <label>Tài khoản<input maxLength={254} spellCheck={false} autoComplete="off" value={values.smtpUser} onChange={(event) => set('smtpUser', event.target.value)} /></label>
          <SecretField
            id="cn-mail-smtp-password" label="Mật khẩu SMTP" state={data.mail.secrets.smtpPassword} value={smtpPassword} onChange={setSmtpPassword}
            locked={!data.encryptionReady} hint="Với Google: dùng App Password 16 ký tự, không phải mật khẩu đăng nhập. Đổi máy chủ thì phải nhập lại."
          />
        </fieldset>
      ) : null}

      <details className="cn-admin-more">
        <summary>Nâng cao: HELO, tên miền DKIM</summary>
        <div className="cn-admin-form__row">
          <label className="is-grow">Tên HELO<input maxLength={253} spellCheck={false} placeholder={fromDomain} value={values.heloName} onChange={(event) => set('heloName', event.target.value)} /><span className="cn-admin-sub">Để trống = {fromDomain}. Nên khớp bản ghi PTR của IP máy chủ.</span></label>
          <label className="is-grow">Tên miền DKIM<input maxLength={253} spellCheck={false} placeholder={fromDomain} value={values.dkimDomain} onChange={(event) => set('dkimDomain', event.target.value)} /><span className="cn-admin-sub">Để trống = {fromDomain}.</span></label>
        </div>
      </details>

      <ConfirmPasswordField id="cn-mail-confirm" value={password} onChange={setPassword} />
      <ErrorText error={save.error ?? reset.error} />
      <div className="cn-admin-form__actions">
        <button type="submit" className="cn-admin-button" disabled={busy || !password}><Icon name="check2" />Lưu cấu hình</button>
        <button type="button" className="cn-admin-button is-ghost" disabled={busy} onClick={onDone}>Huỷ</button>
        {data.mail.source === 'ui' ? <button type="button" className="cn-admin-button is-danger-ghost cn-admin-push-end" disabled={busy || !password} onClick={backToEnv}><Icon name="arrow-counterclockwise" />Về cấu hình .env</button> : null}
      </div>
    </form>
  )
}
