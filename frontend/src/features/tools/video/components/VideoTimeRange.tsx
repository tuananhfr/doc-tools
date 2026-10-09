import { useTranslation } from 'react-i18next'
import { NumberField, readNumber, type NumberRule } from '@/features/tools/hub'

// Ô chữ chứ không phải type="number": ô số của trình duyệt in "2.5" theo máy, không theo trang.
export const SECONDS_RULE: NumberRule = { kind: 'decimal', min: 0 }

/** Số giây đã gõ, `NaN` khi trống hoặc sai — engine báo lỗi khoảng thời gian. */
export const readSeconds = (text: string) => readNumber(text, SECONDS_RULE) ?? Number.NaN

export function VideoTimeRange({ start, end, onStart, onEnd }: { start: string; end: string; onStart: (value: string) => void; onEnd: (value: string) => void }) {
  const { t } = useTranslation('video')
  return <div className="erp-tool-form__grid">
    <NumberField label={t('timeRange.start')} value={start} onChange={onStart} rule={SECONDS_RULE} />
    <NumberField label={t('timeRange.end')} value={end} onChange={onEnd} rule={SECONDS_RULE} />
  </div>
}
