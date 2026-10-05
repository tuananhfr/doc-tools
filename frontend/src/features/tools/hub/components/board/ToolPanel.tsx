import { useId, type ReactNode } from 'react'

interface ToolPanelProps {
  title?: string
  /** Nút / chữ đứng cùng hàng với tiêu đề, dạt phải. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Một thẻ nội dung ở cột chính của `ToolBoard`. */
export function ToolPanel({ title, actions, children, className }: ToolPanelProps) {
  const titleId = useId()

  return (
    <section className={`erp-tool-panel${className ? ` ${className}` : ''}`} aria-labelledby={title ? titleId : undefined}>
      {title || actions ? (
        <div className="erp-tool-panel__head">
          {title ? (
            <h2 id={titleId} className="erp-tool-panel__title">
              {title}
            </h2>
          ) : null}
          {actions ? <div className="erp-tool-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
