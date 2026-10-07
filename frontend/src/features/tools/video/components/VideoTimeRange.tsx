import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

export function VideoTimeRange({ start, end, onStart, onEnd }: { start: number; end: number; onStart: (value: number) => void; onEnd: (value: number) => void }) {
  const { t } = useTranslation('video')
  return <div className="erp-tool-form__grid">
    <label className="erp-flow-field__label">{t('timeRange.start')}<Form.Control type="number" min={0} step="0.1" value={Number.isFinite(start) ? start : ''} onChange={(event) => onStart(event.target.value === '' ? Number.NaN : Number(event.target.value))} /></label>
    <label className="erp-flow-field__label">{t('timeRange.end')}<Form.Control type="number" min={0} step="0.1" value={Number.isFinite(end) ? end : ''} onChange={(event) => onEnd(event.target.value === '' ? Number.NaN : Number(event.target.value))} /></label>
  </div>
}
