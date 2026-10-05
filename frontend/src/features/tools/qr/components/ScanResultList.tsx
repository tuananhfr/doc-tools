import { Icon } from '@/components/ui'
import { TraceScanCard } from '@/features/inventory/trace'
import { CopyButton, useToolsBranch } from '@/features/tools/hub'
import type { ScanHit } from '../types/qr.types'
import { gs1PrefixNote, gs1Valid } from '../utils/barcode-check'
import { formatLabel, readScanContent } from '../utils/scan-content'

interface ScanResultListProps {
  hits: ScanHit[]
  onRemove: (id: string) => void
}

const SECURITY_LABEL: Record<string, string> = { WPA: 'WPA / WPA2', WEP: 'WEP', nopass: 'Không mật khẩu', '': 'Không rõ' }

/** Loại mã GS1 có số kiểm tra mod 10 — zxing đã kiểm lúc đọc, ở đây NÓI RA cho người dùng biết. */
const GS1_FORMATS = new Set(['EAN_13', 'EAN_8', 'UPC_A', 'ITF'])

/** Nội dung có thể là mã của một đối tượng ERPCons — Wi-Fi, số điện thoại, email thì không. */
const TRACEABLE = new Set(['text', 'url'])

function ScanResult({ hit, onRemove }: { hit: ScanHit; onRemove: () => void }) {
  const content = readScanContent(hit.text)
  // Chỉ nhánh trong app mới có phiên để tra sổ truy xuất; nhánh khách không gọi API nào.
  const inApp = useToolsBranch().kind === 'app'
  // ITF thường (không phải ITF-14) không bắt buộc số kiểm tra — chỉ xét khi đủ 14 số.
  const gs1 =
    GS1_FORMATS.has(hit.format) && /^\d+$/.test(hit.text) && (hit.format !== 'ITF' || hit.text.length === 14)
      ? { valid: gs1Valid(hit.text), prefix: gs1PrefixNote(hit.format === 'UPC_A' ? `0${hit.text}` : hit.text) }
      : null

  return (
    <li className="erp-scan-hit">
      <div className="erp-scan-hit__head">
        <span className="erp-scan-hit__format">
          <Icon name={hit.format === 'QR_CODE' ? 'qr-code' : 'upc'} />
          {formatLabel(hit.format)}
        </span>
        <button type="button" className="btn erp-flow-file__button" aria-label="Bỏ kết quả này" title="Bỏ" onClick={onRemove}>
          <Icon name="x-lg" />
        </button>
      </div>

      {content.kind === 'wifi' ? (
        <dl className="erp-scan-hit__fields">
          <dt>Tên mạng</dt>
          <dd>{content.ssid}</dd>
          <dt>Bảo mật</dt>
          <dd>{SECURITY_LABEL[content.security] ?? content.security}</dd>
          {content.password ? (
            <>
              <dt>Mật khẩu</dt>
              <dd>{content.password}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p className="erp-scan-hit__text">{hit.text}</p>
      )}

      {gs1 ? (
        <p className={`erp-scan-hit__gs1 erp-scan-hit__gs1--${gs1.valid ? 'ok' : 'bad'}`}>
          <Icon name={gs1.valid ? 'check-circle' : 'exclamation-triangle'} />
          <span>
            {gs1.valid ? 'Số kiểm tra đúng.' : 'Số kiểm tra SAI — mã in hỏng hoặc bị sửa.'}
            {gs1.prefix ? ` ${gs1.prefix}` : ''}
          </span>
        </p>
      ) : null}

      {inApp && TRACEABLE.has(content.kind) ? <TraceScanCard value={hit.text} /> : null}

      <div className="erp-scan-hit__actions">
        {content.kind === 'url' ? (
          // noreferrer: trang lạ trong mã không được biết người dùng tới từ đâu, cũng không với được `window.opener`.
          <a className="btn btn-secondary btn-sm" href={content.href} target="_blank" rel="noopener noreferrer">
            <Icon name="box-arrow-up-right" className="me-2" />
            Mở {content.host}
          </a>
        ) : null}
        {content.kind === 'wifi' && content.password ? <CopyButton text={content.password} label="Chép mật khẩu" size="sm" /> : null}
        {content.kind === 'phone' ? <CopyButton text={content.number} label="Chép số" size="sm" /> : null}
        {content.kind === 'email' ? <CopyButton text={content.address} label="Chép địa chỉ" size="sm" /> : null}
        <CopyButton text={hit.text} label={content.kind === 'text' || content.kind === 'url' ? 'Sao chép' : 'Chép nguyên văn'} size="sm" />
      </div>
    </li>
  )
}

/** Các mã đã đọc được, mới nhất ở trên. */
export function ScanResultList({ hits, onRemove }: ScanResultListProps) {
  return (
    <ul className="erp-scan-hits">
      {hits.map((hit) => (
        <ScanResult key={hit.id} hit={hit} onRemove={() => onRemove(hit.id)} />
      ))}
    </ul>
  )
}
