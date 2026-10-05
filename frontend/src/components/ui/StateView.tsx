import type { ReactNode } from 'react'
import { Icon } from './Icon'

export type StateTone = 'neutral' | 'danger' | 'warning'

interface StateViewProps {
  /** Ma loi lon hien phia tren (403 / 404 / 500). */
  code?: string
  icon?: string
  tone?: StateTone
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/**
 * Trang thai rong / loi / khong co quyen (thay `Result` va `Empty` cua antd).
 *
 * Luon co ICON + TIEU DE + MO TA, va mot loi ra ro rang - nguoi dung khong
 * bao gio bi ket o man hinh trong (muc 10).
 */
export function StateView({
  code,
  icon = 'inbox',
  tone = 'neutral',
  title,
  description,
  actions,
}: StateViewProps) {
  return (
    <div className="erp-state">
      {code ? <div className="erp-state__code">{code}</div> : null}

      <span className={`erp-state__icon${tone === 'neutral' ? '' : ` erp-state__icon--${tone}`}`}>
        <Icon name={icon} />
      </span>

      <h2 className="erp-state__title">{title}</h2>
      {description ? <p className="erp-state__description">{description}</p> : null}
      {actions ? <div className="d-flex gap-2 flex-wrap justify-content-center">{actions}</div> : null}
    </div>
  )
}
