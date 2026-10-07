import { Link, useSearchParams } from 'react-router-dom'
import { AdminPage, Empty, LoadError, Pager, Panel, SkeletonRows } from '../components/AdminKit'
import { adminPath } from '../config/admin-nav'
import { AUDIT_ACTION, AUDIT_TARGET } from '../config/admin-labels'
import { useAudit } from '../hooks/useAdmin'
import { formatDateTime } from '../utils/admin-format'

/** Only targets that still have a page; deleted users fall through to plain text. */
function targetLink(type: string, id: string | null) {
  if (!id) return null
  if (type === 'user') return adminPath('nguoi-dung', `?id=${id}`)
  if (type === 'contribution') return adminPath('de-xuat', `?id=${id}`)
  return null
}

export default function AdminAuditPage() {
  const [params, setParams] = useSearchParams()
  const target = params.get('target') ?? undefined
  const actor = params.get('actor') ?? undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const audit = useAudit(actor, target, page)
  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { target, actor, ...changes }
    for (const [name, value] of Object.entries(merged)) if (value) next.set(name, value)
    setParams(next, { replace: true })
  }

  return (
    <AdminPage title="Nhật ký quản trị" description="Mọi thao tác ghi dữ liệu của người quản trị, mới nhất trước. Thao tác bằng CLI nằm ở nhật ký từng tài khoản, không ở đây.">
      <Panel flush>
        <div className="cn-admin-filters">
          <select aria-label="Đối tượng" value={target ?? ''} onChange={(event) => set({ target: event.target.value || undefined, page: undefined })}>
            <option value="">Mọi đối tượng</option>
            {Object.entries(AUDIT_TARGET).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {actor ? <button type="button" className="cn-admin-button is-ghost" onClick={() => set({ actor: undefined, page: undefined })}>Bỏ lọc người làm</button> : null}
        </div>
        {audit.isPending ? <SkeletonRows /> : audit.isError ? <LoadError error={audit.error} onRetry={() => void audit.refetch()} /> : audit.data.items.length === 0 ? <Empty icon="journal" title="Chưa có thao tác nào" /> : (
          <div className="cn-admin-table-wrap">
            <table className="cn-admin-table">
              <thead><tr><th>Lúc</th><th>Người làm</th><th>Việc</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead>
              <tbody>{audit.data.items.map((row) => {
                const link = targetLink(row.targetType, row.targetId)
                return (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td><button type="button" className="cn-admin-rowlink" onClick={() => set({ actor: row.actorId, page: undefined })}>{row.actorEmail}</button></td>
                    <td>{AUDIT_ACTION[row.action] ?? row.action}</td>
                    <td>{AUDIT_TARGET[row.targetType] ?? row.targetType}{link ? <Link className="cn-admin-sub" to={link}>Mở</Link> : row.targetId ? <code className="cn-admin-sub">{row.targetId}</code> : null}</td>
                    <td className="is-wide"><span className="cn-admin-break">{row.detail ?? '—'}</span></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
        {audit.data ? <Pager page={audit.data.page} pageSize={audit.data.pageSize} total={audit.data.total} onPage={(value) => set({ page: String(value) })} /> : null}
      </Panel>
    </AdminPage>
  )
}
