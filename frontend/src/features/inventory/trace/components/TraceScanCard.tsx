import { Button } from 'react-bootstrap'
import { ApiError, API_ERROR_KIND } from '@/api'
import { StatusTag } from '@/components/common'
import { Icon } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import { TRACE_STATUS_META, TRACE_STATUS_NOTE } from '../config/trace-status'
import { useTraceResolve } from '../hooks/useTrace'
import type { TraceEvent, TraceObject } from '../types/trace.types'

interface TraceScanCardProps {
  /** Chuỗi máy quét vừa đọc, nguyên văn. */
  value: string
}

function Notice({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="erp-trace-card__notice">
      <Icon name={icon} />
      <span>{children}</span>
    </p>
  )
}

function ObjectFacts({ object }: { object: TraceObject }) {
  return (
    <dl className="erp-trace-card__facts">
      <dt>{object.kind || 'Đối tượng'}</dt>
      <dd>{object.name}</dd>
      {object.code ? (
        <>
          <dt>Mã nội bộ</dt>
          <dd className="erp-trace-card__mono">{object.code}</dd>
        </>
      ) : null}
      {object.serial ? (
        <>
          <dt>Số sê-ri</dt>
          <dd className="erp-trace-card__mono">{object.serial}</dd>
        </>
      ) : null}
    </dl>
  )
}

function RecentEvents({ events }: { events: TraceEvent[] }) {
  if (events.length === 0) return <p className="erp-trace-card__muted">Chưa có sự kiện truy xuất nào.</p>
  return (
    <ol className="erp-trace-card__events" aria-label="Sự kiện gần nhất">
      {events.map((event) => (
        <li key={event.id}>
          <span className="erp-trace-card__event-label">{event.eventLabel}</span>
          <span className="erp-trace-card__muted">
            {formatDateTime(event.eventTime)}
            {event.location ? ` · ${event.location}` : ''}
            {event.qty !== null ? ` · ${event.qty} ${event.unit}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Kết quả tra một mã vừa quét trong ERPCons (L1 nhận diện, L2 truy xuất).
 * "Chưa có dữ liệu" là kết quả bình thường, không phải quét hỏng.
 */
export function TraceScanCard({ value }: TraceScanCardProps) {
  const query = useTraceResolve(value)

  let body: React.ReactNode
  if (query.isPending) {
    body = <p className="erp-trace-card__muted">Đang tra trong ERPCons…</p>
  } else if (query.isError) {
    const forbidden = query.error instanceof ApiError && query.error.kind === API_ERROR_KIND.forbidden
    body = forbidden ? (
      <Notice icon="lock">Tài khoản của bạn chưa được tra cứu truy xuất.</Notice>
    ) : (
      <>
        <Notice icon="exclamation-triangle">Không tra được: {query.error.message}</Notice>
        <Button size="sm" variant="outline-secondary" className="erp-trace-card__retry" onClick={() => void query.refetch()}>
          <Icon name="arrow-clockwise" className="me-1" />
          Thử lại
        </Button>
      </>
    )
  } else {
    const result = query.data
    switch (result.outcome) {
      case 'identified': {
        const note = TRACE_STATUS_NOTE[result.identifier.status]
        body = (
          <>
            <div className="erp-trace-card__status">
              <StatusTag value={result.identifier.status} meta={TRACE_STATUS_META} />
              <span className="erp-trace-card__mono">{result.identifier.value}</span>
            </div>
            {note ? <Notice icon="info-circle">{note}</Notice> : null}
            <ObjectFacts object={result.object} />
            <RecentEvents events={result.events} />
          </>
        )
        break
      }
      case 'legacy':
        body = (
          <>
            <Notice icon="clock-history">Mã cũ của đối tượng — chưa gắn mã truy xuất.</Notice>
            <ObjectFacts object={result.object} />
            <RecentEvents events={result.events} />
          </>
        )
        break
      case 'forbidden':
        body = <Notice icon="lock">Mã có trong sổ nhưng bạn không được xem đối tượng của nó.</Notice>
        break
      case 'broken':
        body = <Notice icon="exclamation-triangle">Mã trỏ tới một đối tượng không còn tồn tại.</Notice>
        break
      default:
        body = <Notice icon="question-circle">Đã đọc mã nhưng chưa có dữ liệu truy xuất trong ERPCons.</Notice>
    }
  }

  return (
    <section className="erp-trace-card" aria-live="polite" aria-label="Tra cứu trong ERPCons">
      <h3 className="erp-trace-card__title">
        <Icon name="diagram-3" />
        Truy xuất ERPCons
      </h3>
      {body}
    </section>
  )
}
