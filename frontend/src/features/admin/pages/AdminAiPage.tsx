import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { AdminPage, Empty, ErrorText, LoadError, Pager, Panel, Pill, SetState, SkeletonRows } from '../components/AdminKit'
import { useStaff } from '../components/RequirePermission'
import { AI_STATUS } from '../config/admin-labels'
import { useAiAccounts, useAiStatus, useAiSwitch } from '../hooks/useAdmin'
import type { AiAccountRow, AiProviderStatus } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'

const STATUSES = Object.keys(AI_STATUS) as AiProviderStatus[]

function SwitchButton({ row }: { row: AiAccountRow }) {
  const toast = useToast()
  const change = useAiSwitch()
  const enable = row.status === 'disabled'
  const run = () => {
    const question = enable
      ? `Mở lại trợ lý AI cho ${row.email}? Người dùng phải bấm kiểm tra khoá lần nữa mới dùng được.`
      : `Tạm khoá trợ lý AI của ${row.email}? Agent tắt ngay, người dùng không tự mở lại được.`
    if (!window.confirm(question)) return
    change.mutate({ userId: row.userId, enable }, { onSuccess: () => toast.success(enable ? 'Đã mở lại. Chờ người dùng kiểm tra khoá.' : 'Đã tạm khoá trợ lý AI.') })
  }
  return (
    <>
      <button type="button" className={`cn-admin-button ${enable ? 'is-ghost' : 'is-danger-ghost'}`} disabled={change.isPending} onClick={run}>
        <Icon name={enable ? 'unlock' : 'slash-circle'} />{enable ? 'Mở lại' : 'Tạm khoá'}
      </button>
      <ErrorText error={change.error} />
    </>
  )
}

export default function AdminAiPage() {
  const staff = useStaff()
  const canManage = staff.permissions.includes('ai.manage')
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debounced = useDebounce(search, 300)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const status = STATUSES.find((value) => value === params.get('status'))
  const filters = { q: params.get('q') ?? undefined, status, page }
  const accounts = useAiAccounts(filters)
  const live = useAiStatus()

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) if (value) next.set(name, value); else next.delete(name)
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced.trim()) update({ q: debounced.trim() || null })
  // Only the typed text drives this; `params` changes on every other filter too.
  }, [debounced])

  const info = live.data
  return (
    <AdminPage
      title="Tài khoản AI"
      description="Khoá AI riêng của thành viên Pro, chạy trên GoClaw dùng chung. Khoá API nằm mã hoá trong GoClaw; ở đây chỉ thấy nhà cung cấp, model và trạng thái."
    >
      <Panel title="GoClaw" actions={<button type="button" className="cn-admin-button is-ghost" disabled={live.isFetching} onClick={() => void live.refetch()}><Icon name="arrow-repeat" />Kiểm lại</button>}>
        {live.isPending ? <SkeletonRows rows={4} /> : live.isError ? <LoadError error={live.error} onRetry={() => void live.refetch()} /> : info ? (
          <dl className="cn-admin-facts">
            <dt>Kết nối</dt>
            <dd>
              {!info.configured ? <Pill tone="warning" icon="exclamation-triangle">Chưa cấu hình (thiếu token gateway)</Pill>
                : info.reachable ? <Pill tone="positive" icon="check2-circle">Kết nối được</Pill>
                  : <Pill tone="danger" icon="x-octagon">Không kết nối được</Pill>}
              <code className="cn-admin-break">{info.url}</code>
              {info.error ? <span className="cn-admin-error-text">{info.error}</span> : null}
            </dd>
            <dt>WebSocket công khai</dt>
            <dd>{info.publicWsUrl ? <code className="cn-admin-break">{info.publicWsUrl}</code> : <SetState ok={false}>Chưa đặt — trình duyệt nhận địa chỉ nội bộ của GoClaw</SetState>}</dd>
            <dt>Máy chủ công cụ (MCP)</dt>
            <dd>
              {info.mcpRegistered ? <Pill tone={info.mcpEnabled === false ? 'warning' : 'positive'} icon="plug">{info.mcpEnabled === false ? 'Đã đăng ký nhưng đang tắt' : 'Đã đăng ký'}</Pill>
                : <Pill tone="warning" icon="exclamation-triangle">Chưa đăng ký</Pill>}
              <code>{info.mcpServerName}</code>
              {info.mcpUrl && info.mcpPublicUrl && info.mcpUrl !== info.mcpPublicUrl ? <span className="cn-admin-error-text">GoClaw đang trỏ {info.mcpUrl}, khác MCP_PUBLIC_URL — chạy lại register-mcp.</span> : null}
              {!info.mcpPublicUrl ? <span className="cn-admin-sub">Thiếu MCP_PUBLIC_URL.</span> : null}
            </dd>
            <dt>Nhà cung cấp tác vụ nền</dt>
            <dd>
              {info.backgroundProvider ? <code>{info.backgroundProvider}</code> : info.reachable ? <Pill tone="warning" icon="exclamation-triangle">Chưa đặt</Pill> : '—'}
              {info.reachable && !info.backgroundProvider ? <span className="cn-admin-sub">GoClaw sẽ chọn ngẫu nhiên một nhà cung cấp, có thể là khoá của khách. Đặt <code>background.provider</code> trong GoClaw; trang này chỉ báo, không sửa.</span> : null}
            </dd>
            <dt>Địa chỉ API nội bộ</dt>
            <dd>{info.allowPrivateApiBase ? <Pill tone="warning" icon="exclamation-triangle">Đang cho phép (chỉ dùng khi dev)</Pill> : <Pill tone="positive" icon="shield-check">Chặn</Pill>}</dd>
            <dt>Phiên bản chỉ dẫn agent</dt>
            <dd>v{info.promptVersion} · đẩy lại cho agent cũ bằng <code>npm run ai -- sync-agents</code></dd>
          </dl>
        ) : null}
      </Panel>

      <Panel flush>
        <form className="cn-admin-filters" role="search" onSubmit={(event: FormEvent) => { event.preventDefault(); update({ q: search.trim() || null }) }}>
          <label className="cn-admin-search">
            <Icon name="search" />
            <span className="visually-hidden">Tìm theo email</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email" maxLength={254} />
          </label>
          <select aria-label="Trạng thái" value={status ?? ''} onChange={(event) => update({ status: event.target.value || null })}>
            <option value="">Mọi trạng thái</option>
            {STATUSES.map((value) => <option key={value} value={value}>{AI_STATUS[value].label}</option>)}
          </select>
        </form>
        {accounts.isPending ? <SkeletonRows /> : accounts.isError ? <LoadError error={accounts.error} onRetry={() => void accounts.refetch()} /> : accounts.data.items.length === 0 ? (
          <Empty icon="stars" title={filters.q || status ? 'Không có tài khoản khớp bộ lọc' : 'Chưa ai cài khoá AI'} text="Thành viên Pro cài khoá ở trang Tài khoản → Trợ lý AI." />
        ) : (
          <div className="cn-admin-table-wrap">
            <table className="cn-admin-table">
              <thead><tr><th>Tài khoản</th><th>Nhà cung cấp · model</th><th>Trạng thái</th><th>Agent</th><th>Kiểm tra gần nhất</th>{/* aria-label, not a visually-hidden span: that one is absolutely positioned and escapes the table's scroll box on phones. */}
                {canManage ? <th aria-label="Thao tác" /> : null}</tr></thead>
              <tbody>{accounts.data.items.map((row) => {
                const meta = AI_STATUS[row.status]
                const stale = row.promptVersion !== null && row.promptVersion < accounts.data.promptVersion
                return (
                  <tr key={row.userId}>
                    <td>{row.email}</td>
                    <td><strong>{row.type}</strong><span className="cn-admin-sub">{row.model ?? 'chưa chọn model'}</span></td>
                    <td>
                      <Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill>
                      {row.lastError && row.status !== 'ready' ? <span className="cn-admin-sub"><span className="cn-admin-error-text cn-admin-break">{row.lastError}</span></span> : null}
                    </td>
                    <td>
                      {row.agentStatus ? <Pill tone={row.agentStatus === 'active' ? 'positive' : 'neutral'} icon={row.agentStatus === 'active' ? 'robot' : 'pause-circle'}>{row.agentStatus === 'active' ? 'Đang bật' : 'Đang tắt'}</Pill> : '—'}
                      {stale ? <span className="cn-admin-sub">Chỉ dẫn cũ (v{row.promptVersion})</span> : null}
                    </td>
                    <td>{formatDateTime(row.verifiedAt)}</td>
                    {canManage ? <td><SwitchButton row={row} /></td> : null}
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
        {accounts.data ? <Pager page={accounts.data.page} pageSize={accounts.data.pageSize} total={accounts.data.total} onPage={(value) => update({ page: String(value) })} /> : null}
      </Panel>
    </AdminPage>
  )
}
