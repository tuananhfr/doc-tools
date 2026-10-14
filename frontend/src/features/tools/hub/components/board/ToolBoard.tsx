import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface ToolBoardProps {
  /** Cột chính: nơi nhập liệu. */
  children: ReactNode
  /** Cột phải: kết quả / tuỳ chọn. Bỏ trống = một cột. */
  side?: ReactNode
  /** Tên cột phải cho trình đọc màn hình. */
  sideLabel?: string
  layout?: 'balanced' | 'wide-result' | 'compact'
  className?: string
  mobilePreview?: boolean
  after?: ReactNode
}

/**
 * Khung của tiện ích KHÔNG nhận tệp (tính toán, đổi đơn vị, mã QR…): nhập bên
 * trái, kết quả bên phải, kết quả đổi theo từng phím gõ. Dùng lại lưới hai cột
 * của luồng ba bước để mọi công cụ của "Chuyện Nhỏ" cùng một trục.
 */
export function ToolBoard({ children, side, sideLabel, after, layout = 'balanced', className = '', mobilePreview = false }: ToolBoardProps) {
  const { t } = useTranslation('common')
  const [panel, setPanel] = useState<'input' | 'preview'>('input')
  return (
    <div className={`erp-flow cn-tool-board cn-tool-board--${layout}${mobilePreview && side ? ' cn-tool-board--panels' : ''}${side ? '' : ' erp-flow--single'} ${className}`} data-panel={panel}>
      {mobilePreview && side ? <div className="cn-tool-board__tabs" role="group" aria-label={t('workspace.preview')}>
        {(['input', 'preview'] as const).map(value => <button type="button" key={value} aria-pressed={panel === value} onClick={() => setPanel(value)}>{t(`workspace.${value}`)}</button>)}
      </div> : null}
      <div className="erp-flow__main">{children}</div>
      {side ? (
        <aside className="erp-flow__side" aria-label={sideLabel ?? t('board.result')}>
          {side}
        </aside>
      ) : null}
      {after ? <div className="erp-flow__after">{after}</div> : null}
    </div>
  )
}
