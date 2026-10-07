import { useSearchParams } from 'react-router-dom'
import { AdminPage, DayBars, Empty, LoadError, Metric, Panel, SkeletonRows } from '../components/AdminKit'
import { useToolsStats } from '../hooks/useAdmin'
import { formatDateTime, formatNumber } from '../utils/admin-format'

const RANGES = [7, 30, 90] as const

export default function AdminToolsPage() {
  const [params, setParams] = useSearchParams()
  const days = RANGES.find((value) => String(value) === params.get('days')) ?? 30
  const stats = useToolsStats(days)
  const total = stats.data?.series.reduce((sum, item) => sum + item.value, 0) ?? 0
  const used = stats.data?.tools.filter((tool) => tool.inRange > 0).length ?? 0

  return (
    <AdminPage
      title="Lượt dùng công cụ"
      description="Đếm một lượt mỗi lần trang công cụ được mở (tối đa 120 lượt/giờ/IP). Số theo ngày bắt đầu từ khi khu quản trị được bật; cột “Từ trước tới nay” gồm cả số cũ."
      actions={(
        <div className="cn-admin-tabs" role="tablist" aria-label="Khoảng thời gian">
          {RANGES.map((value) => <button key={value} type="button" role="tab" aria-selected={value === days} className={value === days ? 'is-active' : ''} onClick={() => setParams({ days: String(value) }, { replace: true })}>{value} ngày</button>)}
        </div>
      )}
    >
      {stats.isPending ? <SkeletonRows rows={8} /> : stats.isError ? <LoadError error={stats.error} onRetry={() => void stats.refetch()} /> : (
        <>
          <div className="cn-admin-metrics is-three">
            <Metric label={`Lượt mở · ${days} ngày`} value={total} />
            <Metric label="Công cụ có người dùng" value={used} hint={`trên ${formatNumber(stats.data.tools.length)} công cụ từng được mở`} />
            <Metric label="Trung bình mỗi ngày" value={Math.round(total / days)} />
          </div>
          <Panel title="Theo ngày"><DayBars data={stats.data.series} label={`Lượt mở ${days} ngày`} /></Panel>
          <Panel title="Theo công cụ" flush>
            {stats.data.tools.length ? (
              <div className="cn-admin-table-wrap">
                <table className="cn-admin-table">
                  <thead><tr><th>Công cụ</th><th className="is-num">{days} ngày</th><th className="is-num">Từ trước tới nay</th><th>Mở gần nhất</th></tr></thead>
                  <tbody>{stats.data.tools.map((tool) => (
                    <tr key={tool.tool} className={tool.inRange ? undefined : 'is-muted'}>
                      <td><code>{tool.tool}</code></td>
                      <td className="is-num">{formatNumber(tool.inRange)}</td>
                      <td className="is-num">{formatNumber(tool.allTime)}</td>
                      <td>{formatDateTime(tool.lastVisitAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <Empty icon="bar-chart" title="Chưa có lượt mở nào" />}
          </Panel>
        </>
      )}
    </AdminPage>
  )
}
