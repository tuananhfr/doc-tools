import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { useResetIntegration, useSaveIntegration } from '../hooks/useAdmin'
import type { GoclawValues, Integrations, SecretChange } from '../types/admin.types'
import { ErrorText } from './AdminKit'
import { ConfirmPasswordField, IntegrationNotices, SecretField } from './IntegrationFields'

type Draft = Omit<GoclawValues, 'mcpAllowedIps'> & { mcpAllowedIps: string }

export function GoclawConfigForm({ data, onDone }: { data: Integrations; onDone: () => void }) {
  const toast = useToast()
  const save = useSaveIntegration()
  const reset = useResetIntegration()
  const [values, setValues] = useState<Draft>({ ...data.goclaw.values, mcpAllowedIps: data.goclaw.values.mcpAllowedIps.join(', ') })
  const [gatewayToken, setGatewayToken] = useState<SecretChange>(undefined)
  const [password, setPassword] = useState('')
  const set = <K extends keyof Draft>(name: K, value: Draft[K]) => setValues((current) => ({ ...current, [name]: value }))
  const busy = save.isPending || reset.isPending
  const mcpChanged = values.mcpPublicUrl.trim().replace(/\/+$/, '') !== data.goclaw.values.mcpPublicUrl

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const secrets: Record<string, string | null> = gatewayToken === undefined ? {} : { gatewayToken }
    const payload: GoclawValues = { ...values, mcpAllowedIps: values.mcpAllowedIps.split(/[\s,]+/).filter(Boolean) }
    save.mutate({ group: 'goclaw', password, values: payload, secrets }, {
      onSuccess: () => {
        toast.success(mcpChanged ? 'Đã lưu. Địa chỉ MCP đã đổi: bấm “Đăng ký MCP” để GoClaw gọi đúng chỗ.' : 'Đã lưu cấu hình GoClaw. Có hiệu lực ngay.')
        onDone()
      },
    })
  }
  const backToEnv = () => {
    if (!window.confirm('Bỏ cấu hình GoClaw đặt ở trang này, kể cả token gateway, để dùng lại .env của backend?')) return
    reset.mutate({ group: 'goclaw', password }, { onSuccess: () => { toast.success('Đã về cấu hình .env.'); onDone() } })
  }

  return (
    <form className="cn-admin-form" onSubmit={submit} noValidate>
      <IntegrationNotices data={data} />
      <label>
        Địa chỉ GoClaw
        <input type="url" required maxLength={500} spellCheck={false} placeholder="http://localhost:18790" value={values.url} onChange={(event) => set('url', event.target.value)} />
        <span className="cn-admin-sub">Địa chỉ backend này gọi tới GoClaw, thường là địa chỉ nội bộ.</span>
      </label>
      <SecretField
        id="cn-goclaw-token" label="Token gateway" state={data.goclaw.secrets.gatewayToken} value={gatewayToken} onChange={setGatewayToken}
        locked={!data.encryptionReady} hint="Lấy trong cấu hình GoClaw. Đổi địa chỉ GoClaw thì phải nhập lại."
      />
      <label>
        WebSocket công khai
        <input type="url" maxLength={500} spellCheck={false} placeholder="wss://lpc.vn/goclaw/ws" value={values.publicWsUrl} onChange={(event) => set('publicWsUrl', event.target.value)} />
        <span className="cn-admin-sub">Địa chỉ trình duyệt của thành viên nối tới. Để trống = địa chỉ GoClaw tự trả về, thường là nội bộ nên trình duyệt không tới được.</span>
      </label>
      <label>
        Địa chỉ MCP
        <input type="url" maxLength={500} spellCheck={false} placeholder="https://lpc.vn/doc-tools/api/v1/mcp/sse" value={values.mcpPublicUrl} onChange={(event) => set('mcpPublicUrl', event.target.value)} />
        <span className="cn-admin-sub">Địa chỉ GoClaw gọi ngược về backend này để dùng công cụ, kết thúc bằng <code>/api/v1/mcp/sse</code>.</span>
      </label>
      <details className="cn-admin-more">
        <summary>Nâng cao: địa chỉ tệp, IP được gọi MCP</summary>
        <label>
          Địa chỉ tệp công khai
          <input type="url" maxLength={500} spellCheck={false} value={values.publicFilesUrl} onChange={(event) => set('publicFilesUrl', event.target.value)} />
          <span className="cn-admin-sub">Để trống = cùng máy với WebSocket công khai.</span>
        </label>
        <label>
          IP được gọi MCP
          <input maxLength={1000} spellCheck={false} placeholder="10.0.0.5, 10.0.0.6" value={values.mcpAllowedIps} onChange={(event) => set('mcpAllowedIps', event.target.value)} />
          <span className="cn-admin-sub">Cách nhau bằng dấu phẩy. Để trống = không giới hạn theo IP (vẫn cần token của từng thành viên).</span>
        </label>
      </details>

      <ConfirmPasswordField id="cn-goclaw-confirm" value={password} onChange={setPassword} />
      <ErrorText error={save.error ?? reset.error} />
      <div className="cn-admin-form__actions">
        <button type="submit" className="cn-admin-button" disabled={busy || !password}><Icon name="check2" />Lưu cấu hình</button>
        <button type="button" className="cn-admin-button is-ghost" disabled={busy} onClick={onDone}>Huỷ</button>
        {data.goclaw.source === 'ui' ? <button type="button" className="cn-admin-button is-danger-ghost cn-admin-push-end" disabled={busy || !password} onClick={backToEnv}><Icon name="arrow-counterclockwise" />Về cấu hình .env</button> : null}
      </div>
    </form>
  )
}
