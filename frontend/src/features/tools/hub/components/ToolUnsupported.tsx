import { Link } from 'react-router-dom'
import { Icon, StateView } from '@/components/ui'

interface ToolUnsupportedProps {
  toolName: string
  /** Trang chọn công cụ của nhánh đang đứng — lối ra duy nhất. */
  hubPath: string
}

/**
 * Hiện THAY cho màn công cụ khi trình duyệt không chạy nổi pdf.js.
 *
 * Không vẽ màn rồi để nó hỏng: chunk của các công cụ PDF ném lỗi ngay lúc nạp
 * trên trình duyệt cũ, và người dùng chỉ thấy "Đang tải..." mãi.
 */
export function ToolUnsupported({ toolName, hubPath }: ToolUnsupportedProps) {
  return (
    <StateView
      icon="exclamation-triangle"
      tone="warning"
      title="Trình duyệt này quá cũ để xử lý PDF"
      description={
        <>
          {toolName} cần Chrome, Edge, Firefox hoặc Safari bản mới nhất. Hãy cập nhật trình duyệt rồi mở lại trang
          này. Các công cụ ảnh, mã QR và tiện ích khác vẫn dùng được trên máy này.
        </>
      }
      actions={
        <Link className="btn btn-secondary" to={hubPath}>
          <Icon name="arrow-left" />
          Chọn công cụ khác
        </Link>
      }
    />
  )
}
