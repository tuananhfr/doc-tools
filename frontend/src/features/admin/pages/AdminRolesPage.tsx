import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { AdminPage, Empty, ErrorText, LoadError, Panel, Pill, SkeletonRows } from '../components/AdminKit'
import { useStaff } from '../components/RequirePermission'
import { ROLE_HELP, ROLE_LABEL } from '../config/admin-labels'
import { useRoleMutation, useRoles } from '../hooks/useAdmin'
import type { StaffRole } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'

const ROLES: StaffRole[] = ['reviewer', 'admin', 'owner']

export default function AdminRolesPage() {
  const staff = useStaff()
  const toast = useToast()
  const roles = useRoles()
  const change = useRoleMutation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('reviewer')

  const grant = (event: FormEvent) => {
    event.preventDefault()
    change.mutate({ grant: { email: email.trim(), role } }, { onSuccess: () => { toast.success(`Đã cấp ${ROLE_LABEL[role].toLowerCase()} cho ${email.trim()}. Người đó cần đăng nhập lại.`); setEmail('') } })
  }

  return (
    <AdminPage title="Phân quyền" description="Ai được vào khu quản trị và làm được gì. Tài khoản thường không có dòng nào ở đây.">
      <div className="cn-admin-grid is-wide-left">
        <Panel title="Đang có vai trò" flush>
          {roles.isPending ? <SkeletonRows /> : roles.isError ? <LoadError error={roles.error} onRetry={() => void roles.refetch()} /> : roles.data.holders.length === 0 ? <Empty title="Chưa có ai" /> : (
            <div className="cn-admin-table-wrap">
              <table className="cn-admin-table">
                <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Cấp bởi</th><th aria-label="Thao tác" /></tr></thead>
                <tbody>{roles.data.holders.map((holder) => (
                  <tr key={holder.userId}>
                    <td>{holder.email}<span className="cn-admin-sub">{holder.displayName ?? ''}</span></td>
                    <td><Pill tone={holder.role === 'owner' ? 'warning' : 'info'} icon="shield-lock">{ROLE_LABEL[holder.role]}</Pill></td>
                    <td>{holder.grantedBy}<span className="cn-admin-sub">{formatDateTime(holder.grantedAt)}</span></td>
                    <td className="is-actions">
                      {holder.userId === staff.id ? <span className="cn-admin-sub">Bạn</span> : (
                        <button type="button" className="cn-admin-button is-danger-ghost" disabled={change.isPending} onClick={() => { if (window.confirm(`Thu vai trò ${ROLE_LABEL[holder.role].toLowerCase()} của ${holder.email}?`)) change.mutate({ revoke: holder.userId }, { onSuccess: () => toast.success('Đã thu vai trò.') }) }}>Thu vai trò</button>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="cn-admin-stack">
          <Panel title="Cấp vai trò">
            <form className="cn-admin-form" onSubmit={grant}>
              <label>Email (đã đăng nhập Chuyện Nhỏ ít nhất một lần)<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <fieldset className="cn-admin-radios">
                <legend>Vai trò</legend>
                {ROLES.map((value) => (
                  <label key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} /><span><strong>{ROLE_LABEL[value]}</strong>{ROLE_HELP[value]}</span></label>
                ))}
              </fieldset>
              <div className="cn-admin-form__actions"><button type="submit" className="cn-admin-button" disabled={change.isPending}><Icon name="person-plus" />Cấp vai trò</button></div>
              <ErrorText error={change.error} />
            </form>
          </Panel>
          <p className="cn-admin-sub">Cấp hoặc đổi vai trò sẽ đăng xuất người đó để phiên mới có hạn 12 giờ. Hệ thống luôn giữ ít nhất một chủ hệ thống.</p>
        </div>
      </div>
    </AdminPage>
  )
}
