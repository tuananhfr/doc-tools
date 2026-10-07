import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useDebounce } from '@/hooks/useDebounce'
import { AdminPage, Empty, LoadError, Pager, Panel, Pill, SkeletonRows } from '../components/AdminKit'
import { UserDetailView } from '../components/UserDetailView'
import { ROLE_LABEL } from '../config/admin-labels'
import { useUsers } from '../hooks/useAdmin'
import { formatDate, formatDateTime, formatNumber, formatProEnd } from '../utils/admin-format'

export default function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debounced = useDebounce(search, 300)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filters = { q: params.get('q') ?? undefined, status: params.get('status') ?? undefined, plan: params.get('plan') ?? undefined, staff: params.get('staff') ?? undefined, page }

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) if (value) next.set(name, value); else next.delete(name)
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: !('id' in changes) })
  }
  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced.trim()) update({ q: debounced.trim() || null })
  // Only the typed text drives this; `params` changes on every other filter too.
  }, [debounced])

  const users = useUsers(filters)
  if (id) return <UserDetailView id={id} onBack={() => update({ id: null })} />

  return (
    <AdminPage title="Người dùng" description="Tìm theo email hoặc tên hiển thị. Bấm vào một dòng để xem chi tiết và thao tác.">
      <Panel flush>
        <form className="cn-admin-filters" role="search" onSubmit={(event: FormEvent) => { event.preventDefault(); update({ q: search.trim() || null }) }}>
          <label className="cn-admin-search">
            <Icon name="search" />
            <span className="visually-hidden">Tìm người dùng</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email hoặc tên" maxLength={254} />
          </label>
          <select aria-label="Trạng thái" value={filters.status ?? ''} onChange={(event) => update({ status: event.target.value || null })}>
            <option value="">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="disabled">Đang khoá</option>
          </select>
          <select aria-label="Gói" value={filters.plan ?? ''} onChange={(event) => update({ plan: event.target.value || null })}>
            <option value="">Mọi gói</option><option value="pro">Pro</option><option value="free">Miễn phí</option>
          </select>
          <label className="cn-admin-check"><input type="checkbox" checked={filters.staff === 'yes'} onChange={(event) => update({ staff: event.target.checked ? 'yes' : null })} />Chỉ tài khoản quản trị</label>
        </form>
        {users.isPending ? <SkeletonRows /> : users.isError ? <LoadError error={users.error} onRetry={() => void users.refetch()} /> : users.data.items.length === 0 ? (
          <Empty icon="person-x" title="Không có người dùng khớp bộ lọc" text={filters.q ? `Không tìm thấy “${filters.q}”.` : undefined} />
        ) : (
          <div className="cn-admin-table-wrap">
            <table className="cn-admin-table is-clickable">
              <thead><tr><th>Tài khoản</th><th>Trạng thái</th><th>Gói</th><th className="is-num">Đề xuất</th><th>Tạo</th><th>Đăng nhập gần nhất</th></tr></thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id} onClick={() => update({ id: user.id })}>
                    <td>
                      <button type="button" className="cn-admin-rowlink" onClick={(event) => { event.stopPropagation(); update({ id: user.id }) }}>{user.email}</button>
                      <span className="cn-admin-sub">{user.displayName ?? 'Chưa đặt tên'}{user.role ? ` · ${ROLE_LABEL[user.role]}` : ''}</span>
                    </td>
                    <td>{user.status === 'active' ? <Pill tone="positive" icon="check2-circle">Hoạt động</Pill> : <Pill tone="danger" icon="lock">Đang khoá</Pill>}</td>
                    <td>{user.proEndsAt ? <Pill tone="info" icon="stars">Pro đến {formatProEnd(user.proEndsAt)}</Pill> : <span className="cn-admin-sub">Miễn phí</span>}</td>
                    <td className="is-num">{formatNumber(user.contributions)}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDateTime(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {users.data ? <Pager page={users.data.page} pageSize={users.data.pageSize} total={users.data.total} onPage={(value) => update({ page: String(value) })} /> : null}
      </Panel>
    </AdminPage>
  )
}
