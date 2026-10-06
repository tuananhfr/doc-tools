import { Form } from 'react-bootstrap'

export function VideoTimeRange({ start, end, onStart, onEnd }: { start: number; end: number; onStart: (value: number) => void; onEnd: (value: number) => void }) {
  return <div className="erp-tool-form__grid">
    <label className="erp-flow-field__label">Bắt đầu (giây)<Form.Control type="number" min={0} step="0.1" value={Number.isFinite(start) ? start : ''} onChange={(event) => onStart(event.target.value === '' ? Number.NaN : Number(event.target.value))} /></label>
    <label className="erp-flow-field__label">Kết thúc (giây)<Form.Control type="number" min={0} step="0.1" value={Number.isFinite(end) ? end : ''} onChange={(event) => onEnd(event.target.value === '' ? Number.NaN : Number(event.target.value))} /></label>
  </div>
}
