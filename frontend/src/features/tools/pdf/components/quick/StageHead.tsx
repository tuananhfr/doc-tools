import type { ReactNode } from 'react'

interface StageHeadProps {
  name: string
  /** "12 trang", "Xem trước trang 2"… */
  meta: string
  /** Nút của vùng làm việc (hoàn lại, bỏ tệp). */
  children?: ReactNode
}

/** Dòng đầu của vùng làm việc trên trang: tệp đang làm + các nút chung. */
export function StageHead({ name, meta, children }: StageHeadProps) {
  return (
    <header className="erp-page-stage__head">
      <p className="erp-page-stage__caption">
        <span className="erp-page-stage__name" title={name}>
          {name}
        </span>
        <span className="erp-page-stage__meta">{meta}</span>
      </p>
      {children ? <div className="erp-page-stage__actions">{children}</div> : null}
    </header>
  )
}
