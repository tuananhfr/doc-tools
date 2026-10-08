import { useState } from 'react'
import { useToast } from '@/components/ui'
import { AdminPage, ErrorText, LoadError, Panel, Pill, SetState, SkeletonRows } from '../components/AdminKit'
import { useSettingMutation, useSettings } from '../hooks/useAdmin'
import type { Setting, SystemStatus } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'

function SettingRow({ setting }: { setting: Setting }) {
  const toast = useToast()
  const save = useSettingMutation()
  const [draft, setDraft] = useState(setting.type === 'integer' ? String(setting.value) : '')
  const apply = (value: unknown | undefined) => save.mutate({ settingKey: setting.key, value }, { onSuccess: () => toast.success(value === undefined ? 'Đã về mặc định.' : 'Đã lưu. Máy chủ khác nhận thay đổi trong vòng 30 giây.') })

  return (
    <li className="cn-admin-setting">
      <div className="cn-admin-setting__text">
        <strong>{setting.label}</strong>
        <span>{setting.help}</span>
        <span className="cn-admin-sub">
          Mặc định: {setting.type === 'boolean' ? (setting.default ? 'bật' : 'tắt') : setting.type === 'integer' ? `${setting.default}${setting.unit ? ` ${setting.unit}` : ''}` : setting.default.join(', ')}
          {setting.overridden ? ` · đổi bởi ${setting.updatedBy} lúc ${formatDateTime(setting.updatedAt)}` : ''}
        </span>
      </div>
      <div className="cn-admin-setting__control">
        {setting.type === 'boolean' ? (
          <label className="cn-admin-switch">
            <input type="checkbox" role="switch" checked={setting.value} disabled={save.isPending} onChange={(event) => apply(event.target.checked)} />
            <span>{setting.value ? 'Bật' : 'Tắt'}</span>
          </label>
        ) : setting.type === 'integer' ? (
          <form className="cn-admin-inline" onSubmit={(event) => { event.preventDefault(); apply(Number(draft)) }}>
            <input type="number" aria-label={setting.label} min={setting.min} max={setting.max} step={1} required value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" className="cn-admin-button is-ghost" disabled={save.isPending || Number(draft) === setting.value}>Lưu</button>
          </form>
        ) : null}
        {setting.overridden ? <button type="button" className="cn-admin-link" disabled={save.isPending} onClick={() => { apply(undefined); if (setting.type === 'integer') setDraft(String(setting.default)) }}>Về mặc định</button> : null}
      </div>
      <ErrorText error={save.error} />
    </li>
  )
}

function SystemPanel({ system }: { system: SystemStatus }) {
  return (
    <Panel title="Cấu hình máy chủ">
      <p className="cn-admin-lead">Chỉ đọc. Bí mật chỉ báo đã đặt hay chưa. GoClaw và MCP sửa ở trang Tài khoản AI, cách gửi thư ở trang Email; phần còn lại đổi bằng <code>.env</code> rồi khởi động lại backend.</p>
      <dl className="cn-admin-facts">
        <dt>Nguồn được phép (SITE_ORIGINS)</dt><dd>{system.auth.allowedOrigins.length ? system.auth.allowedOrigins.join(', ') : <Pill tone="warning" icon="exclamation-triangle">Trống: nhận mọi nguồn (chỉ dùng khi dev)</Pill>}</dd>
        <dt>Cookie Secure</dt><dd><SetState ok={system.auth.cookieSecure}>{system.auth.cookieSecure ? 'Bật' : 'Tắt (chỉ dev)'}</SetState></dd>
        <dt>Phiên thường / mã OTP</dt><dd>{system.auth.sessionDays} ngày · mã sống {Math.round(system.auth.otpTtlSeconds / 60)} phút · phiên quản trị 12 giờ</dd>
        <dt>Khoá công khai gói quy định</dt><dd><SetState ok={system.rules.signingPublicKeySet} /></dd>
        <dt>GoClaw</dt><dd><code>{system.goclaw.url}</code> · gateway token <SetState ok={system.goclaw.gatewayTokenSet} /> · WS công khai {system.goclaw.publicWsUrl ? <code>{system.goclaw.publicWsUrl}</code> : <SetState ok={false} />}</dd>
        <dt>MCP</dt><dd>{system.mcp.publicUrl ? <code>{system.mcp.publicUrl}</code> : <SetState ok={false} />}{system.mcp.allowedIps.length ? ` · IP: ${system.mcp.allowedIps.join(', ')}` : ''}</dd>
      </dl>
    </Panel>
  )
}

export default function AdminSettingsPage() {
  const settings = useSettings()
  return (
    <AdminPage title="Cài đặt" description="Công tắc vận hành đổi được ngay, không cần khởi động lại. Mọi thay đổi ghi vào nhật ký quản trị.">
      {settings.isPending ? <SkeletonRows rows={6} /> : settings.isError ? <LoadError error={settings.error} onRetry={() => void settings.refetch()} /> : (
        <>
          <Panel title="Vận hành">
            <ul className="cn-admin-settings">{settings.data.settings.map((setting) => <SettingRow key={`${setting.key}-${String(setting.value)}`} setting={setting} />)}</ul>
          </Panel>
          <SystemPanel system={settings.data.system} />
        </>
      )}
    </AdminPage>
  )
}
