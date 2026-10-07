import { AUDIT_ACTION } from '../config/admin-labels'
import { formatDateTime } from '../utils/admin-format'

export interface TimelineRow { key: string; at: string; action: string; who: string; note: string | null }

export function AuditTimeline({ rows }: { rows: TimelineRow[] }) {
  return (
    <ol className="cn-admin-timeline">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="cn-admin-timeline__when">{formatDateTime(row.at)}</span>
          <span><strong>{AUDIT_ACTION[row.action] ?? row.action}</strong> · {row.who === 'self' ? 'chính chủ' : row.who}{row.note ? <span className="cn-admin-sub">{row.note}</span> : null}</span>
        </li>
      ))}
    </ol>
  )
}
