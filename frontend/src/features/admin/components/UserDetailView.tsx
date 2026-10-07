import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { adminPath } from '../config/admin-nav'
import { CONTRIBUTION_STATUS, ROLE_LABEL } from '../config/admin-labels'
import { useUser } from '../hooks/useAdmin'
import { formatDateTime, formatProEnd } from '../utils/admin-format'
import { AdminPage, Empty, LoadError, Panel, Pill, SkeletonRows } from './AdminKit'
import { AuditTimeline } from './AuditTimeline'
import { useStaff } from './RequirePermission'
import { AccountActions, ProActions } from './UserActions'

export function UserDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const staff = useStaff()
  const detail = useUser(id)
  const back = <button type="button" className="cn-admin-button is-ghost" onClick={onBack}><Icon name="arrow-left" />Danh sách</button>

  if (detail.isPending) return <AdminPage title="Người dùng" actions={back}><SkeletonRows rows={8} /></AdminPage>
  if (detail.isError) return <AdminPage title="Người dùng" actions={back}><LoadError error={detail.error} onRetry={() => void detail.refetch()} /></AdminPage>
  const { user, plans, sessions, contributions, userAudit, adminAudit } = detail.data
  const isSelf = user.id === staff.id
  // Staff accounts are changed from the roles screen by an owner; the API enforces the same rule.
  const protectedStaff = Boolean(user.role) && !staff.permissions.includes('roles.manage')
  const canManage = staff.permissions.includes('users.manage') && !isSelf && !protectedStaff

  return (
    <AdminPage title={user.email} description={<>{user.displayName ?? 'Chưa đặt tên hiển thị'} · tạo {formatDateTime(user.createdAt)} · đăng nhập gần nhất {formatDateTime(user.lastLoginAt)}</>} actions={back}>
      <div className="cn-admin-pills">
        {user.status === 'active' ? <Pill tone="positive" icon="check2-circle">Hoạt động</Pill> : <Pill tone="danger" icon="lock">Đang khoá</Pill>}
        {user.proEndsAt ? <Pill tone="info" icon="stars">Pro đến hết {formatProEnd(user.proEndsAt)}</Pill> : <Pill tone="neutral">Miễn phí</Pill>}
        {user.role ? <Pill tone="warning" icon="shield-lock">{ROLE_LABEL[user.role]}</Pill> : null}
        <Pill tone="neutral" icon={user.publicAttribution ? 'person-check' : 'person-dash'}>{user.publicAttribution ? 'Cho ghi tên công khai' : 'Không ghi tên công khai'}</Pill>
      </div>
      {isSelf ? <p className="cn-admin-alert is-info"><Icon name="info-circle" />Đây là tài khoản của bạn; thao tác lên chính mình làm ở trang tài khoản, không ở đây.</p> : null}
      {protectedStaff ? <p className="cn-admin-alert is-info"><Icon name="info-circle" />Tài khoản quản trị chỉ chủ hệ thống thao tác được.</p> : null}

      <div className="cn-admin-grid is-two">
        {staff.permissions.includes('plans.manage') ? <ProActions user={user} /> : null}
        {canManage ? <AccountActions key={user.id} user={user} onDeleted={onBack} /> : null}
      </div>

      <div className="cn-admin-grid is-two">
        <Panel title={`Phiên đang mở (${sessions.length})`}>
          {sessions.length ? (
            <div className="cn-admin-table-wrap"><table className="cn-admin-table is-compact">
              <thead><tr><th>Mở lúc</th><th>Dùng gần nhất</th><th>Hết hạn</th></tr></thead>
              <tbody>{sessions.map((session) => <tr key={`${session.createdAt}-${session.expiresAt}`}><td>{formatDateTime(session.createdAt)}</td><td>{formatDateTime(session.lastSeenAt)}</td><td>{formatDateTime(session.expiresAt)}</td></tr>)}</tbody>
            </table></div>
          ) : <Empty icon="door-closed" title="Không có phiên nào" />}
        </Panel>
        <Panel title="Lịch sử gói Pro">
          {plans.length ? (
            <div className="cn-admin-table-wrap"><table className="cn-admin-table is-compact">
              <thead><tr><th>Từ</th><th>Đến hết</th><th>Người cấp</th><th>Ghi chú</th></tr></thead>
              <tbody>{plans.map((plan) => (
                <tr key={`${plan.startsAt}-${plan.endsAt}`} className={plan.revokedAt ? 'is-muted' : undefined}>
                  <td>{formatDateTime(plan.startsAt)}</td>
                  <td>{formatProEnd(plan.endsAt)}{plan.revokedAt ? <span className="cn-admin-sub">thu hồi {formatDateTime(plan.revokedAt)}</span> : null}</td>
                  <td>{plan.grantedBy}</td><td>{plan.note ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty icon="stars" title="Chưa từng có Pro" />}
        </Panel>
      </div>

      <Panel title={`Đề xuất gần đây (${contributions.length})`}>
        {contributions.length ? (
          <div className="cn-admin-table-wrap"><table className="cn-admin-table is-compact">
            <thead><tr><th>Công cụ</th><th>Miền</th><th>Trạng thái</th><th>Ghi tên</th><th>Gửi lúc</th></tr></thead>
            <tbody>{contributions.map((item) => {
              const meta = CONTRIBUTION_STATUS[item.status]
              return (
                <tr key={item.id}>
                  <td>{staff.permissions.includes('contributions.review') ? <Link to={adminPath('de-xuat', `?id=${item.id}`)}>{item.toolId}</Link> : item.toolId}</td>
                  <td>{item.domain}</td><td><Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill></td>
                  <td>{item.attribution ? 'Có' : 'Không'}</td><td>{formatDateTime(item.createdAt)}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        ) : <Empty icon="clipboard" title="Chưa gửi đề xuất nào bằng tài khoản này" />}
      </Panel>

      <div className="cn-admin-grid is-two">
        <Panel title="Nhật ký tài khoản">
          {userAudit.length ? <AuditTimeline rows={userAudit.map((row) => ({ key: `${row.createdAt}-${row.action}-${row.actor}`, at: row.createdAt, action: row.action, who: row.actor, note: row.note }))} /> : <Empty icon="journal" title="Chưa có ghi nhận" />}
        </Panel>
        <Panel title="Thao tác quản trị trên tài khoản này">
          {adminAudit.length ? <AuditTimeline rows={adminAudit.map((row) => ({ key: String(row.id), at: row.createdAt, action: row.action, who: row.actorEmail, note: row.detail }))} /> : <Empty icon="journal" title="Chưa có thao tác nào" />}
        </Panel>
      </div>
    </AdminPage>
  )
}
