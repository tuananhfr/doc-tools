import { useId, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { QR_BACKGROUND_COLORS, QR_COLORS, type QrBackground } from '../config/qr-colors'
import type { QrColorId } from '../types/qr.types'

interface QrColorPickerProps {
  /** `id` của màu đang chọn. */
  value: string
  onChange: (id: QrColorId) => void
  background: QrBackground
  onBackgroundChange: (background: QrBackground) => void
}

/** Hàng ô màu tròn; ô đang chọn có dấu tích + viền, không chỉ khác màu. */
export function QrColorPicker({ value, onChange, background, onBackgroundChange }: QrColorPickerProps) {
  const { t } = useTranslation('qr')
  const name = useId()

  return (
    <fieldset className="erp-flow-options">
      <legend className="erp-flow-field__label">{t('colors.legend')}</legend>
      <div className="erp-qr-colors">
        {QR_COLORS.map((color) => (
          <label key={color.id} className="erp-qr-color" title={t(`colors.names.${color.id}`)} style={{ '--erp-qr-color': color.value } as CSSProperties}>
            <input type="radio" className="visually-hidden" name={name} value={color.id} checked={color.id === value} onChange={() => onChange(color.id)} />
            <span className="erp-qr-color__dot">
              <Icon name="check-lg" />
            </span>
            <span className="visually-hidden">{t(`colors.names.${color.id}`)}</span>
          </label>
        ))}
      </div>
      <div className="erp-qr-background">
        <span className="erp-flow-field__label">{t('colors.background')}</span>
        <div className="erp-qr-background__options" role="group" aria-label={t('colors.background')}>
          {(['white', 'transparent', 'custom'] as const).map((mode) => (
            <label key={mode} className="erp-qr-background__option">
              <input type="radio" name={`${name}-background`} checked={background.mode === mode} onChange={() => onBackgroundChange({ ...background, mode })} />
              <span>{t(`colors.backgroundModes.${mode}`)}</span>
            </label>
          ))}
        </div>
        {background.mode === 'custom' ? (
          <>
            <div className="erp-qr-colors erp-qr-background__colors" role="group" aria-label={t('colors.presetBackgrounds')}>
              {QR_BACKGROUND_COLORS.map((color) => (
                <label key={color.id} className="erp-qr-color erp-qr-color--background" title={t(`colors.names.${color.id}`)} style={{ '--erp-qr-color': color.value } as CSSProperties}>
                  <input type="radio" className="visually-hidden" name={`${name}-background-color`} value={color.value} checked={background.color.toLowerCase() === color.value.toLowerCase()} onChange={() => onBackgroundChange({ mode: 'custom', color: color.value })} />
                  <span className="erp-qr-color__dot"><Icon name="check-lg" /></span>
                  <span className="visually-hidden">{t(`colors.names.${color.id}`)}</span>
                </label>
              ))}
            </div>
            <label className="erp-qr-background__custom">
              <span>{t('colors.customColor')}</span>
              <input type="color" value={background.color} onChange={(event) => onBackgroundChange({ mode: 'custom', color: event.target.value })} />
              <span>{background.color.toUpperCase()}</span>
            </label>
          </>
        ) : null}
      </div>
    </fieldset>
  )
}
