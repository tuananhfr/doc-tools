import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { Integrations, SecretChange, SecretState } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'
import { Pill } from './AdminKit'

function SecretPill({ state }: { state: SecretState }) {
  if (state.source === 'ui' && !state.readable) return <Pill tone="danger" icon="x-octagon">Không mở được: khoá mã hoá đã đổi</Pill>
  if (state.source === 'ui') return <Pill tone="positive" icon="check2-circle">Đã đặt ở trang này</Pill>
  if (state.source === 'env') return <Pill tone="positive" icon="check2-circle">Đặt trong .env</Pill>
  return <Pill tone="warning" icon="dash-circle">Chưa đặt</Pill>
}

/**
 * Write-only: the current value never reaches the browser. Empty keeps it, typing replaces it,
 * "remove" clears what was set here (a value from .env cannot be removed from the browser).
 */
export function SecretField({ id, label, state, value, onChange, locked, hint }: {
  id: string; label: string; state: SecretState; value: SecretChange; onChange: (value: SecretChange) => void; locked: boolean; hint?: ReactNode
}) {
  return (
    <div className="cn-admin-secret">
      <div className="cn-admin-secret__head">
        <label htmlFor={id}>{label}</label>
        <SecretPill state={state} />
      </div>
      {value === null ? (
        <p className="cn-admin-secret__removing">
          <Icon name="trash3" />Sẽ xoá khi lưu.
          <button type="button" className="cn-admin-link" onClick={() => onChange(undefined)}>Giữ lại</button>
        </p>
      ) : (
        <input
          id={id} type="password" autoComplete="new-password" spellCheck={false} maxLength={1024} disabled={locked}
          placeholder={locked ? 'Cần CONFIG_ENCRYPTION_KEY' : state.source ? 'Để trống = giữ nguyên' : 'Nhập để đặt'}
          value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}
        />
      )}
      {hint ? <span className="cn-admin-sub">{hint}</span> : null}
      {state.source === 'ui' && value !== null ? <button type="button" className="cn-admin-link" onClick={() => onChange(null)}><Icon name="x-circle" />Xoá giá trị đặt ở đây</button> : null}
    </div>
  )
}

/** Every save asks the owner's password again (backend: AdminIntegrationsController). */
export function ConfirmPasswordField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="cn-admin-confirm">
      Mật khẩu của bạn
      <input id={id} type="password" autoComplete="current-password" required maxLength={128} value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="cn-admin-sub">Cần mỗi lần lưu cấu hình kết nối, để một phiên đăng nhập bị lộ không đủ để đổi.</span>
    </label>
  )
}

export function IntegrationNotices({ data }: { data: Integrations }) {
  return (
    <>
      {data.envOnly ? (
        <div className="cn-admin-alert is-danger" role="status">
          <Icon name="exclamation-triangle" />
          <span>Máy chủ đang bật <code>CONFIG_FROM_ENV_ONLY</code>: cấu hình lưu ở đây chưa có hiệu lực cho tới khi tắt cờ đó.</span>
        </div>
      ) : null}
      {!data.encryptionReady ? (
        <div className="cn-admin-alert is-info" role="status">
          <Icon name="key" />
          <span>
            Máy chủ chưa có <code>CONFIG_ENCRYPTION_KEY</code> nên ô mật khẩu và token đang khoá; cấu hình thường vẫn lưu được.
            Người quản trị máy chủ đặt một lần trong <code>.env</code> của backend (chuỗi ngẫu nhiên từ 32 ký tự) rồi khởi động lại.
          </span>
        </div>
      ) : null}
    </>
  )
}

export function SourceNote({ source, updatedBy, updatedAt }: { source: 'ui' | 'env'; updatedBy: string | null; updatedAt: string | null }) {
  return source === 'ui'
    ? <p className="cn-admin-sub">Đặt ở trang này bởi {updatedBy} lúc {formatDateTime(updatedAt)}. Có hiệu lực ngay, không cần khởi động lại.</p>
    : <p className="cn-admin-sub">Đang lấy từ <code>.env</code> của backend. Lưu ở trang này sẽ thay cho giá trị đó.</p>
}
