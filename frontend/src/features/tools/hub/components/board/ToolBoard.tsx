import type { ReactNode } from 'react'

interface ToolBoardProps {
  /** Cột chính: nơi nhập liệu. */
  children: ReactNode
  /** Cột phải: kết quả / tuỳ chọn. Bỏ trống = một cột. */
  side?: ReactNode
  /** Tên cột phải cho trình đọc màn hình. */
  sideLabel?: string
}

/**
 * Khung của tiện ích KHÔNG nhận tệp (tính toán, đổi đơn vị, mã QR…): nhập bên
 * trái, kết quả bên phải, kết quả đổi theo từng phím gõ. Dùng lại lưới hai cột
 * của luồng ba bước để mọi công cụ của "Chuyện Nhỏ" cùng một trục.
 */
export function ToolBoard({ children, side, sideLabel = 'Kết quả' }: ToolBoardProps) {
  return (
    <div className={`erp-flow${side ? '' : ' erp-flow--single'}`}>
      <div className="erp-flow__main">{children}</div>
      {side ? (
        <aside className="erp-flow__side" aria-label={sideLabel}>
          {side}
        </aside>
      ) : null}
    </div>
  )
}
