import { Form } from 'react-bootstrap'
import { BARCODE_KINDS, barcodeKind } from '../config/barcode-kinds'
import type { BarcodeLook } from '../services/barcode-render'
import type { BarcodeKind } from '../types/barcode.types'

interface BarcodeOptionsProps {
  kind: BarcodeKind
  look: BarcodeLook
  onKind: (kind: BarcodeKind) => void
  onLook: (patch: Partial<BarcodeLook>) => void
}

const SIZES = [0.8, 1, 1.5, 2]
const HEIGHTS = [10, 15, 20, 25]

/** Loại mã + cỡ in. Cỡ tính theo vạch hẹp nhất 0,33 mm = 100% (cỡ danh định của EAN-13). */
export function BarcodeOptions({ kind, look, onKind, onLook }: BarcodeOptionsProps) {
  return (
    <>
      <Form.Group controlId="barcode-kind" className="erp-flow-field">
        <Form.Label className="erp-flow-field__label">Loại mã</Form.Label>
        <Form.Select value={kind} onChange={(event) => onKind(event.target.value as BarcodeKind)}>
          {BARCODE_KINDS.map((spec) => (
            <option key={spec.kind} value={spec.kind}>
              {spec.label}
            </option>
          ))}
        </Form.Select>
        <Form.Text className="erp-flow-field__hint">{barcodeKind(kind).hint}.</Form.Text>
      </Form.Group>

      <div className="erp-barcode-grid">
        <Form.Group controlId="barcode-size" className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Cỡ in</Form.Label>
          <Form.Select value={look.magnification} onChange={(event) => onLook({ magnification: Number(event.target.value) })}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {Math.round(size * 100)}%{size === 1 ? ' (chuẩn)' : ''}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="barcode-height" className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Chiều cao vạch</Form.Label>
          <Form.Select value={look.heightMm} onChange={(event) => onLook({ heightMm: Number(event.target.value) })}>
            {HEIGHTS.map((height) => (
              <option key={height} value={height}>
                {height} mm
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      <Form.Check
        type="switch"
        id="barcode-text"
        label="In dãy số / chữ dưới mã"
        checked={look.includeText}
        onChange={(event) => onLook({ includeText: event.target.checked })}
      />
      <p className="erp-barcode-muted">Cỡ dưới 80% nhiều máy quét cầm tay đọc không ra; in thử một tem trước khi in cả lô.</p>
    </>
  )
}
