import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { withBase } from '@/utils/url'
import { ProContactButton } from './ProContactButton'

interface LoginNudgeProps {
  onDismiss: () => void
}

/**
 * Mời dùng ERPCons Pro / đăng nhập SAU khi đã tải được tệp — không chặn gì (spec 10: tác vụ nhanh
 * không bắt đăng nhập). Mở tab mới: tệp chỉ sống trong RAM của tab này, chuyển
 * trang là mất sạch những gì đang làm.
 */
export function LoginNudge({ onDismiss }: LoginNudgeProps) {
  return (
    <div className="erp-doc-nudge" role="note">
      <p className="erp-doc-nudge__text">
        <Icon name="check-circle" className="erp-doc-nudge__icon me-2" />
        Đã tải xong. Cần lưu bản này vào hồ sơ dự án, chia sẻ và duyệt cùng cả đội? Có trong ERPCons Pro.
      </p>
      <div className="erp-doc-nudge__actions">
        <ProContactButton className="btn-sm" />
        <a className="btn btn-outline-secondary btn-sm" href={withBase(ROUTES.login)} target="_blank" rel="noopener">
          Đăng nhập ERPCons
          <Icon name="box-arrow-up-right" className="ms-2" />
        </a>
        <Button variant="link" size="sm" onClick={onDismiss}>
          Để sau
        </Button>
      </div>
    </div>
  )
}
