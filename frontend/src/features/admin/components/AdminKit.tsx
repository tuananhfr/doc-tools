import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import type { Tone } from '../config/admin-labels'
import { AdminError } from '../services/admin.service'
import { formatNumber, shortDay } from '../utils/admin-format'
import type { DayValue } from '../types/admin.types'

export function AdminPage({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  usePageTitle(`${title} · Quản trị Chuyện Nhỏ`)
  return (
    <div className="cn-admin-page">
      <header className="cn-admin-page__head">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="cn-admin-page__actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}

export function Panel({ title, actions, children, flush = false }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={`cn-admin-panel${flush ? ' is-flush' : ''}`}>
      {title || actions ? (
        <header className="cn-admin-panel__head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function Pill({ tone, icon, children }: { tone: Tone; icon?: string; children: ReactNode }) {
  return <span className={`cn-admin-pill is-${tone}`}>{icon ? <Icon name={icon} /> : null}{children}</span>
}

export function Metric({ label, value, hint, tone = 'neutral' }: { label: string; value: number | string; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className={`cn-admin-metric is-${tone}`}>
      <span className="cn-admin-metric__label">{label}</span>
      <strong className="cn-admin-metric__value">{typeof value === 'number' ? formatNumber(value) : value}</strong>
      {hint ? <span className="cn-admin-metric__hint">{hint}</span> : null}
    </div>
  )
}

/** Zero days keep their slot so a quiet day reads as a gap, not as a shorter chart. */
export function DayBars({ data, label }: { data: DayValue[]; label: string }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <figure className="cn-admin-bars" aria-label={`${label}: tổng ${formatNumber(total)}`}>
      <div className="cn-admin-bars__plot">
        {data.map((item) => (
          <div key={item.day} className="cn-admin-bars__col" title={`${shortDay(item.day)}: ${formatNumber(item.value)}`}>
            <span className="cn-admin-bars__bar" style={{ height: `${(item.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="cn-admin-bars__axis">
        <span>{shortDay(data[0]?.day ?? '')}</span>
        <span>{shortDay(data[data.length - 1]?.day ?? '')}</span>
      </figcaption>
    </figure>
  )
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return <p className="cn-admin-count">{formatNumber(total)} mục</p>
  return (
    <nav className="cn-admin-pager" aria-label="Phân trang">
      <span className="cn-admin-count">{formatNumber(total)} mục · trang {page}/{pages}</span>
      <button type="button" className="cn-admin-button is-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="chevron-left" />Trước</button>
      <button type="button" className="cn-admin-button is-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Sau<Icon name="chevron-right" /></button>
    </nav>
  )
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="cn-admin-alert is-danger" role="alert">
      <Icon name="exclamation-triangle" />
      <span>{error instanceof AdminError ? error.message : 'Không tải được dữ liệu.'}</span>
      {onRetry ? <button type="button" className="cn-admin-button is-ghost" onClick={onRetry}>Thử lại</button> : null}
    </div>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return <p className="cn-admin-error" role="alert"><Icon name="exclamation-circle" />{error instanceof AdminError ? error.message : 'Có lỗi xảy ra.'}</p>
}

export function Empty({ icon = 'inbox', title, text }: { icon?: string; title: string; text?: ReactNode }) {
  return (
    <div className="cn-admin-empty">
      <Icon name={icon} />
      <strong>{title}</strong>
      {text ? <span>{text}</span> : null}
    </div>
  )
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return <div className="cn-admin-skeleton" aria-busy="true" aria-label="Đang tải">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>
}

export function SetState({ ok, children }: { ok: boolean; children?: ReactNode }) {
  return <Pill tone={ok ? 'positive' : 'warning'} icon={ok ? 'check2-circle' : 'dash-circle'}>{children ?? (ok ? 'Đã đặt' : 'Chưa đặt')}</Pill>
}
