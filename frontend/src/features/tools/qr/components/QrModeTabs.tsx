import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { toolPathOf, useToolsBranch } from '@/features/tools/hub'

type QrMode = 'qr-create' | 'barcode-create' | 'qr-read'

const MODES: { id: QrMode; label: string; icon: string }[] = [
  { id: 'qr-create', label: 'Tạo mã QR', icon: 'qr-code' },
  { id: 'barcode-create', label: 'Tạo mã vạch', icon: 'upc' },
  { id: 'qr-read', label: 'Quét mã', icon: 'qr-code-scan' },
]

/**
 * Ba thẻ "Tạo mã QR" / "Tạo mã vạch" / "Quét mã". Là LINK giữa các công cụ chứ không phải
 * trạng thái trong một màn: mỗi bên có đường dẫn riêng để gửi cho người khác, và
 * nút Quay lại của trình duyệt đi đúng thẻ.
 */
export function QrModeTabs({ current }: { current: QrMode }) {
  const { base } = useToolsBranch()

  return (
    <nav className="erp-tool-tabs erp-qr-modes" aria-label="Công cụ mã QR">
      {MODES.map((mode) => (
        <Link
          key={mode.id}
          to={toolPathOf(base, mode.id)}
          className={`btn erp-tool-tab${mode.id === current ? ' is-active' : ''}`}
          aria-current={mode.id === current ? 'page' : undefined}
        >
          <Icon name={mode.icon} />
          {mode.label}
        </Link>
      ))}
    </nav>
  )
}
