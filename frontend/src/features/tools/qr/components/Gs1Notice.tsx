import { Trans } from 'react-i18next'
import { Icon } from '@/components/ui'

/**
 * Số EAN / ITF-14 là số ĐƯỢC CẤP, không phải số tự đặt: tem mang số bịa dán lên
 * hàng bán ra là trùng mã của doanh nghiệp khác. Công cụ chỉ vẽ số người dùng có.
 */
export function Gs1Notice() {
  return (
    <p className="erp-barcode-note" role="note">
      <Icon name="info-circle" />
      <span>
        <Trans ns="qr" i18nKey="gs1Notice" components={{ strong: <strong /> }} />
      </span>
    </p>
  )
}
