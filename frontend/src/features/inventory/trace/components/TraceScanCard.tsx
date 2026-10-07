import { useMemo } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ApiError, API_ERROR_KIND } from '@/api'
import { StatusTag, type StatusMeta } from '@/components/common'
import { Icon } from '@/components/ui'
import { formatDateTime } from '@/utils/format'
import { TRACE_NOTE_STATUSES, TRACE_STATUS_TONE, type TraceNoteStatus } from '../config/trace-status'
import { useTraceResolve } from '../hooks/useTrace'
import type { TraceEvent, TraceObject, TraceStatus } from '../types/trace.types'

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
  const { t } = useTranslation('qr')
  return (
    <dl className="erp-trace-card__facts">
      <dt>{object.kind || t('trace.object')}</dt>
      <dd>{object.name}</dd>
      {object.code ? (
        <>
          <dt>{t('trace.code')}</dt>
          <dd className="erp-trace-card__mono">{object.code}</dd>
        </>
      ) : null}
      {object.serial ? (
        <>
          <dt>{t('trace.serial')}</dt>
          <dd className="erp-trace-card__mono">{object.serial}</dd>
        </>
      ) : null}
    </dl>
  )
}

function RecentEvents({ events }: { events: TraceEvent[] }) {
  const { t } = useTranslation('qr')
  if (events.length === 0) return <p className="erp-trace-card__muted">{t('trace.noEvents')}</p>
  return (
    <ol className="erp-trace-card__events" aria-label={t('trace.recentEvents')}>
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
  const { t } = useTranslation('qr')
  const query = useTraceResolve(value)
  const statusMeta = useMemo(
    () => Object.fromEntries((Object.keys(TRACE_STATUS_TONE) as TraceStatus[]).map((status) => [status, { label: t(`trace.status.${status}`), tone: TRACE_STATUS_TONE[status] }])) as Record<string, StatusMeta>,
    [t],
  )

  let body: React.ReactNode
  if (query.isPending) {
    body = <p className="erp-trace-card__muted">{t('trace.loading')}</p>
  } else if (query.isError) {
    const forbidden = query.error instanceof ApiError && query.error.kind === API_ERROR_KIND.forbidden
    body = forbidden ? (
      <Notice icon="lock">{t('trace.accountForbidden')}</Notice>
    ) : (
      <>
        <Notice icon="exclamation-triangle">{t('trace.failed', { message: query.error.message })}</Notice>
        <Button size="sm" variant="outline-secondary" className="erp-trace-card__retry" onClick={() => void query.refetch()}>
          <Icon name="arrow-clockwise" className="me-1" />
          {t('shared.retry')}
        </Button>
      </>
    )
  } else {
    const result = query.data
    switch (result.outcome) {
      case 'identified': {
        const status = result.identifier.status
        const note = (TRACE_NOTE_STATUSES as readonly string[]).includes(status) ? t(`trace.notes.${status as TraceNoteStatus}`) : null
        body = (
          <>
            <div className="erp-trace-card__status">
              <StatusTag value={result.identifier.status} meta={statusMeta} />
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
            <Notice icon="clock-history">{t('trace.legacy')}</Notice>
            <ObjectFacts object={result.object} />
            <RecentEvents events={result.events} />
          </>
        )
        break
      case 'forbidden':
        body = <Notice icon="lock">{t('trace.forbidden')}</Notice>
        break
      case 'broken':
        body = <Notice icon="exclamation-triangle">{t('trace.broken')}</Notice>
        break
      default:
        body = <Notice icon="question-circle">{t('trace.unknown')}</Notice>
    }
  }

  return (
    <section className="erp-trace-card" aria-live="polite" aria-label={t('trace.label')}>
      <h3 className="erp-trace-card__title">
        <Icon name="diagram-3" />
        {t('trace.title')}
      </h3>
      {body}
    </section>
  )
}
