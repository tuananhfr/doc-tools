import { useId } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolSegments } from '@/features/tools/hub'
import { numberFormat } from '@/i18n/intl'
import { READ_RATE } from '../config/read-listen'
import type { ReadFontScale } from '../types/read-listen.types'

interface ReadSettingsProps {
  rate: number
  onRate: (rate: number) => void
  fontScale: ReadFontScale
  onFontScale: (scale: ReadFontScale) => void
  remember: boolean
  onRemember: (on: boolean) => void
}

/** Tốc độ, cỡ chữ khung đọc, nhớ vị trí — đổi được cả lúc đang đọc (người lớn tuổi thường chỉnh sau khi nghe vài câu). */
export function ReadSettings({ rate, onRate, fontScale, onFontScale, remember, onRemember }: ReadSettingsProps) {
  const { t } = useTranslation('accessibility')
  const rememberId = useId()
  const rateLabel = numberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)
  return <>
    <label className="erp-flow-field__label mt-3">{t('readAloud.rate', { rate: rateLabel })}
      <Form.Range min={READ_RATE.min} max={READ_RATE.max} step={READ_RATE.step} value={rate} onChange={(event) => onRate(Number(event.target.value))} />
    </label>
    <p className="erp-flow-field__label mt-3">{t('readAloud.fontSize')}</p>
    <div className="erp-read-tabs">
      <ToolSegments label={t('readAloud.fontSize')} value={fontScale} onChange={onFontScale} options={[
        { value: 'normal', label: t('readAloud.fontNormal') },
        { value: 'large', label: t('readAloud.fontLarge') },
        { value: 'xlarge', label: t('readAloud.fontXLarge') },
      ]} />
    </div>
    <Form.Check type="switch" id={rememberId} className="erp-read-remember mt-3" checked={remember} onChange={(event) => onRemember(event.target.checked)} label={t('readAloud.remember')} />
    <p className="erp-tool-result__note mb-0">{t('readAloud.rememberHint')}</p>
  </>
}
