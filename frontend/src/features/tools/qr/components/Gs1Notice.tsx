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
        Số EAN / ITF-14 phải do GS1 Việt Nam cấp cho doanh nghiệp của bạn — công cụ không tạo số, chỉ vẽ số bạn đã có. Mã dùng trong nội bộ (vật tư,
        tài sản, kho) thì chọn <strong>Code 128</strong>.
      </span>
    </p>
  )
}
