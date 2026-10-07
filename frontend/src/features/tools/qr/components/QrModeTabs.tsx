import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { toolPathOf, useToolsBranch } from '@/features/tools/hub'

type QrMode = 'qr-create' | 'barcode-create' | 'qr-read'

const MODES: { id: QrMode; label: 'qrCreate' | 'barcodeCreate' | 'qrRead'; icon: string }[] = [
  { id: 'qr-create', label: 'qrCreate', icon: 'qr-code' },
  { id: 'barcode-create', label: 'barcodeCreate', icon: 'upc' },
  { id: 'qr-read', label: 'qrRead', icon: 'qr-code-scan' },
]

/**
 * Ba thẻ "Tạo mã QR" / "Tạo mã vạch" / "Quét mã". Là LINK giữa các công cụ chứ không phải
 * trạng thái trong một màn: mỗi bên có đường dẫn riêng để gửi cho người khác, và
 * nút Quay lại của trình duyệt đi đúng thẻ.
 */
export function QrModeTabs({ current }: { current: QrMode }) {
  const { t } = useTranslation('qr')
  const { base } = useToolsBranch()

  return (
    <nav className="erp-tool-tabs erp-qr-modes" aria-label={t('modes.label')}>
      {MODES.map((mode) => (
        <Link
          key={mode.id}
          to={toolPathOf(base, mode.id)}
          className={`btn erp-tool-tab${mode.id === current ? ' is-active' : ''}`}
          aria-current={mode.id === current ? 'page' : undefined}
        >
          <Icon name={mode.icon} />
          {t(`modes.${mode.label}`)}
        </Link>
      ))}
    </nav>
  )
}
