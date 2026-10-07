import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { AdminPage, DayBars, Empty, LoadError, Metric, Panel, Pill, SkeletonRows } from '../components/AdminKit'
import { useStaff } from '../components/RequirePermission'
import { adminPath } from '../config/admin-nav'
import { CONTRIBUTION_STATUS } from '../config/admin-labels'
import { useOverview } from '../hooks/useAdmin'
import type { ContributionStatus, Permission } from '../types/admin.types'
import { formatNumber } from '../utils/admin-format'

const QUEUE: ContributionStatus[] = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'APPROVED']

export default function AdminOverviewPage() {
  const staff = useStaff()
  const overview = useOverview()
  const can = (permission: Permission) => staff.permissions.includes(permission)

  if (overview.isPending) return <AdminPage title="Tổng quan"><SkeletonRows rows={8} /></AdminPage>
  if (overview.isError) return <AdminPage title="Tổng quan"><LoadError error={overview.error} onRetry={() => void overview.refetch()} /></AdminPage>
  const data = overview.data
  const waiting = QUEUE.reduce((sum, status) => sum + (data.contributions[status] ?? 0), 0)
  const mailFailed = data.mail7.failed ?? 0

  return (
    <AdminPage title="Tổng quan" description="Số liệu tính đến lúc mở trang. Ngày tính theo giờ Việt Nam.">
      <div className="cn-admin-metrics">
        <Metric label="Người dùng" value={data.users.total} hint={`+${formatNumber(data.users.new7)} trong 7 ngày · +${formatNumber(data.users.new30)} trong 30 ngày`} />
        <Metric label="Đăng nhập 7 ngày" value={data.users.active7} hint={data.users.disabled ? `${formatNumber(data.users.disabled)} tài khoản đang khoá` : 'Không có tài khoản bị khoá'} />
        <Metric label="Pro đang hiệu lực" value={data.pro.active} hint={data.pro.expiring7 ? `${formatNumber(data.pro.expiring7)} hết hạn trong 7 ngày` : 'Không ai sắp hết hạn'} tone={data.pro.expiring7 ? 'warning' : 'neutral'} />
        <Metric label="Đề xuất cần xử lý" value={waiting} hint={can('contributions.review') ? <Link to={adminPath('de-xuat')}>Mở hàng chờ</Link> : undefined} tone={waiting ? 'info' : 'neutral'} />
        <Metric label="Thư lỗi 7 ngày" value={mailFailed} hint={`${formatNumber(data.mail7.sent ?? 0)} thư đã gửi`} tone={mailFailed ? 'danger' : 'neutral'} />
      </div>

      <div className="cn-admin-grid is-two">
        <Panel title="Lượt mở công cụ · 14 ngày">
          <DayBars data={data.visits14} label="Lượt mở công cụ 14 ngày" />
        </Panel>
        <Panel title="Tài khoản mới · 14 ngày">
          <DayBars data={data.signups14} label="Tài khoản mới 14 ngày" />
        </Panel>
      </div>

      <div className="cn-admin-grid is-two">
        <Panel title="Công cụ dùng nhiều · 7 ngày" actions={can('tools.view') ? <Link className="cn-admin-link" to={adminPath('cong-cu')}>Xem tất cả<Icon name="arrow-right" /></Link> : null}>
          {data.topTools7.length ? (
            <ol className="cn-admin-rank">
              {data.topTools7.map((tool) => <li key={tool.tool}><span>{tool.tool}</span><strong>{formatNumber(tool.inRange)}</strong></li>)}
            </ol>
          ) : <Empty icon="bar-chart" title="Chưa có lượt mở nào trong 7 ngày" text="Số theo ngày bắt đầu đếm từ khi khu quản trị được bật." />}
        </Panel>
        <Panel title="Đề xuất theo trạng thái">
          <ul className="cn-admin-status-list">
            {(Object.keys(CONTRIBUTION_STATUS) as ContributionStatus[]).map((status) => {
              const meta = CONTRIBUTION_STATUS[status]
              const count = data.contributions[status] ?? 0
              return (
                <li key={status}>
                  <Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill>
                  {can('contributions.review') && count ? <Link to={adminPath('de-xuat', `?status=${status}`)}>{formatNumber(count)}</Link> : <span>{formatNumber(count)}</span>}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </AdminPage>
  )
}
