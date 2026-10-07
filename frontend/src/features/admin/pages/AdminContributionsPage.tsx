import { useSearchParams } from 'react-router-dom'
import { AdminPage, Empty, LoadError, Pager, Panel, Pill, SkeletonRows } from '../components/AdminKit'
import { ContributionReview } from '../components/ContributionReview'
import { CONTRIBUTION_STATUS, RISK_LABEL } from '../config/admin-labels'
import { useContributions } from '../hooks/useAdmin'
import { CONTRIBUTION_STATUSES } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'

export default function AdminContributionsPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const status = params.get('status') ?? undefined
  // The queue (anything still waiting on a person) is the default view; an explicit status overrides it.
  const queue = !status && params.get('all') !== '1' ? 'open' : undefined
  const domain = params.get('domain') ?? undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = useContributions({ status, domain, queue, page })

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) if (value) next.set(name, value); else next.delete(name)
    if (!('page' in changes) && !('id' in changes)) next.delete('page')
    setParams(next, { replace: !('id' in changes) })
  }

  if (id) return <ContributionReview id={id} onBack={() => update({ id: null })} />
  const domains = [...new Set((list.data?.domains ?? []).map((row) => row.domain))].sort()

  return (
    <AdminPage title="Duyệt đề xuất" description="Ý tưởng tiện ích và góp ý dữ liệu quy định. Mỗi đề xuất cần ba người khác nhau: xác minh, phê duyệt, công bố.">
      <Panel flush>
        <div className="cn-admin-filters">
          <div className="cn-admin-tabs" role="tablist" aria-label="Phạm vi">
            <button type="button" role="tab" aria-selected={Boolean(queue)} className={queue ? 'is-active' : ''} onClick={() => update({ status: null, all: null })}>Cần xử lý</button>
            <button type="button" role="tab" aria-selected={!queue && !status} className={!queue && !status ? 'is-active' : ''} onClick={() => update({ status: null, all: '1' })}>Tất cả</button>
          </div>
          <select aria-label="Trạng thái" value={status ?? ''} onChange={(event) => update({ status: event.target.value || null, all: event.target.value ? null : '1' })}>
            <option value="">Mọi trạng thái</option>
            {CONTRIBUTION_STATUSES.map((value) => <option key={value} value={value}>{CONTRIBUTION_STATUS[value].label}</option>)}
          </select>
          <select aria-label="Miền dữ liệu" value={domain ?? ''} onChange={(event) => update({ domain: event.target.value || null })}>
            <option value="">Mọi miền</option>
            {domains.map((value) => <option key={value} value={value}>{value === 'ideas' ? 'Ý tưởng tiện ích' : value}</option>)}
          </select>
        </div>
        {list.isPending ? <SkeletonRows /> : list.isError ? <LoadError error={list.error} onRetry={() => void list.refetch()} /> : list.data.items.length === 0 ? (
          <Empty icon="clipboard-check" title={queue ? 'Hàng chờ trống' : 'Không có đề xuất khớp bộ lọc'} text={queue ? 'Không còn đề xuất nào đợi người xử lý.' : undefined} />
        ) : (
          <div className="cn-admin-table-wrap">
            <table className="cn-admin-table is-clickable">
              <thead><tr><th>Nội dung</th><th>Miền</th><th>Rủi ro</th><th className="is-num">Nguồn</th><th>Người gửi</th><th>Trạng thái</th><th>Gửi lúc</th></tr></thead>
              <tbody>
                {list.data.items.map((item) => {
                  const meta = CONTRIBUTION_STATUS[item.status]
                  return (
                    <tr key={item.id} onClick={() => update({ id: item.id })}>
                      <td className="is-wide">
                        <button type="button" className="cn-admin-rowlink" onClick={(event) => { event.stopPropagation(); update({ id: item.id }) }}>{item.summary || '(trống)'}</button>
                        <span className="cn-admin-sub">{item.toolId}{item.changeCount > 1 ? ` · ${item.changeCount} thay đổi` : ''}</span>
                      </td>
                      <td>{item.domain === 'ideas' ? 'Ý tưởng' : item.domain}</td>
                      <td>{RISK_LABEL[item.risk]}</td>
                      <td className="is-num">{item.sourceCount}</td>
                      <td>{item.submitterEmail ?? <span className="cn-admin-sub">Khách</span>}</td>
                      <td><Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill></td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.data ? <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(value) => update({ page: String(value) })} /> : null}
      </Panel>
    </AdminPage>
  )
}
