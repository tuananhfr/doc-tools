import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

interface SkeletonProps {
  /** So dong gia lap. */
  rows?: number
  /** Hien mot dong tieu de ngan phia tren. */
  title?: boolean
}

/** Khung xuong khi dang tai chi tiet (thay `Skeleton` cua Ant Design). */
export function Skeleton({ rows = 6, title = true }: SkeletonProps) {
  const { t } = useTranslation('common')
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('ui.loadingData')}</span>
      {title ? <span className="erp-skeleton erp-skeleton--title" /> : null}
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className="erp-skeleton"
          style={{ width: index === rows - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

/** Vong xoay toan vung - dung cho Suspense trong khung ung dung. */
export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="erp-loading" role="status">
      <Spinner animation="border" size="sm" />
      <span>{label ?? t('ui.loading')}</span>
    </div>
  )
}
