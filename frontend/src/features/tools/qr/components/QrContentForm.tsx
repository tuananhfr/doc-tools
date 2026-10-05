import { useId } from 'react'
import { Form } from 'react-bootstrap'
import type { QrForm, QrKind, WifiSecurity } from '../types/qr.types'

interface QrContentFormProps {
  form: QrForm
  /** Lỗi của nội dung đang nhập; null = không có gì để báo. */
  error: string | null
  onChange: (patch: Partial<QrForm>) => void
}

const KINDS: { value: QrKind; label: string }[] = [
  { value: 'url', label: 'URL (đường dẫn)' },
  { value: 'text', label: 'Văn bản' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'email', label: 'Email' },
  { value: 'vcard', label: 'Danh thiếp (vCard)' },
]

const SECURITIES: { value: WifiSecurity; label: string }[] = [
  { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
  { value: 'WEP', label: 'WEP' },
  { value: 'nopass', label: 'Không mật khẩu' },
]

/** Ô nhập của màn tạo mã: loại mã quyết định các ô phía dưới. */
export function QrContentForm({ form, error, onChange }: QrContentFormProps) {
  const ids = useId()
  const errorId = `${ids}-error`
  const described = error ? errorId : undefined

  return (
    <div className="erp-tool-form">
      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-kind`}>
          Loại mã
        </label>
        <Form.Select id={`${ids}-kind`} value={form.kind} onChange={(event) => onChange({ kind: event.target.value as QrKind })}>
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </Form.Select>
      </div>

      {form.kind === 'url' ? (
        <div className="erp-flow-field">
          <label className="erp-flow-field__label" htmlFor={`${ids}-url`}>
            Nhập nội dung
          </label>
          <Form.Control
            id={`${ids}-url`}
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://erpcons.vn"
            value={form.url}
            isInvalid={error !== null}
            aria-describedby={described}
            onChange={(event) => onChange({ url: event.target.value })}
          />
        </div>
      ) : null}

      {form.kind === 'text' ? (
        <div className="erp-flow-field">
          <label className="erp-flow-field__label" htmlFor={`${ids}-text`}>
            Nhập nội dung
          </label>
          <Form.Control
            id={`${ids}-text`}
            as="textarea"
            rows={5}
            placeholder="Ví dụ: Kho B — kệ 12, tầng 3"
            value={form.text}
            isInvalid={error !== null}
            aria-describedby={described}
            onChange={(event) => onChange({ text: event.target.value })}
          />
        </div>
      ) : null}

      {form.kind === 'wifi' ? (
        <>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-ssid`}>
              Tên mạng Wi-Fi
            </label>
            <Form.Control
              id={`${ids}-ssid`}
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Ví dụ: VanPhong-BCH"
              value={form.ssid}
              onChange={(event) => onChange({ ssid: event.target.value })}
            />
          </div>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-security`}>
              Bảo mật
            </label>
            <Form.Select id={`${ids}-security`} value={form.security} onChange={(event) => onChange({ security: event.target.value as WifiSecurity })}>
              {SECURITIES.map((security) => (
                <option key={security.value} value={security.value}>
                  {security.label}
                </option>
              ))}
            </Form.Select>
          </div>
          {form.security !== 'nopass' ? (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-password`}>
                Mật khẩu
              </label>
              {/* Ô chữ thường, không phải type="password": người tạo mã cần soát từng ký tự, và trình duyệt không mời lưu mật khẩu. */}
              <Form.Control
                id={`${ids}-password`}
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={form.password}
                isInvalid={error !== null}
                aria-describedby={described}
                onChange={(event) => onChange({ password: event.target.value })}
              />
            </div>
          ) : null}
          <Form.Check
            id={`${ids}-hidden`}
            type="checkbox"
            label="Mạng ẩn (không phát tên)"
            checked={form.hidden}
            onChange={(event) => onChange({ hidden: event.target.checked })}
          />
        </>
      ) : null}

      {form.kind === 'phone' ? (
        <div className="erp-flow-field">
          <label className="erp-flow-field__label" htmlFor={`${ids}-phone`}>
            Số điện thoại
          </label>
          <Form.Control
            id={`${ids}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0912 345 678"
            value={form.phone}
            isInvalid={error !== null}
            aria-describedby={described}
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </div>
      ) : null}

      {form.kind === 'email' ? (
        <>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-email`}>
              Địa chỉ email
            </label>
            <Form.Control
              id={`${ids}-email`}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ten@congty.vn"
              value={form.email}
              isInvalid={error !== null}
              aria-describedby={described}
              onChange={(event) => onChange({ email: event.target.value })}
            />
          </div>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-subject`}>
              Tiêu đề thư (không bắt buộc)
            </label>
            <Form.Control id={`${ids}-subject`} type="text" autoComplete="off" value={form.subject} onChange={(event) => onChange({ subject: event.target.value })} />
          </div>
        </>
      ) : null}

      {form.kind === 'vcard' ? (
        <>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-contact-name`}>
              Họ tên
            </label>
            <Form.Control
              id={`${ids}-contact-name`}
              type="text"
              autoComplete="off"
              placeholder="Nguyễn Văn An"
              value={form.contactName}
              aria-describedby={described}
              onChange={(event) => onChange({ contactName: event.target.value })}
            />
          </div>
          <div className="erp-tool-form__grid">
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-contact-phone`}>
                Số điện thoại
              </label>
              <Form.Control
                id={`${ids}-contact-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0912 345 678"
                value={form.contactPhone}
                aria-describedby={described}
                onChange={(event) => onChange({ contactPhone: event.target.value })}
              />
            </div>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-contact-email`}>
                Email liên hệ
              </label>
              <Form.Control
                id={`${ids}-contact-email`}
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ten@congty.vn"
                value={form.contactEmail}
                aria-describedby={described}
                onChange={(event) => onChange({ contactEmail: event.target.value })}
              />
            </div>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-contact-org`}>
                Công ty (không bắt buộc)
              </label>
              <Form.Control id={`${ids}-contact-org`} type="text" autoComplete="off" value={form.contactOrg} onChange={(event) => onChange({ contactOrg: event.target.value })} />
            </div>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-contact-title`}>
                Chức danh (không bắt buộc)
              </label>
              <Form.Control id={`${ids}-contact-title`} type="text" autoComplete="off" value={form.contactTitle} onChange={(event) => onChange({ contactTitle: event.target.value })} />
            </div>
          </div>
          <p className="erp-flow-field__hint">Cần họ tên và ít nhất một trong hai: số điện thoại, email. Quét bằng camera điện thoại sẽ được mời thêm vào danh bạ.</p>
        </>
      ) : null}

      {error ? (
        <p id={errorId} className="erp-tool-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
