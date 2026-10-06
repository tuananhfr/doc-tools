import { useId, type CSSProperties } from 'react'
import { Icon } from '@/components/ui'
import { QR_BACKGROUND_COLORS, QR_COLORS, type QrBackground } from '../config/qr-colors'

interface QrColorPickerProps {
  /** `id` của màu đang chọn. */
  value: string
  onChange: (id: string) => void
  background: QrBackground
  onBackgroundChange: (background: QrBackground) => void
}

/** Hàng ô màu tròn; ô đang chọn có dấu tích + viền, không chỉ khác màu. */
export function QrColorPicker({ value, onChange, background, onBackgroundChange }: QrColorPickerProps) {
  const name = useId()

  return (
    <fieldset className="erp-flow-options">
      <legend className="erp-flow-field__label">Màu mã QR</legend>
      <div className="erp-qr-colors">
        {QR_COLORS.map((color) => (
          <label key={color.id} className="erp-qr-color" title={color.label} style={{ '--erp-qr-color': color.value } as CSSProperties}>
            <input type="radio" className="visually-hidden" name={name} value={color.id} checked={color.id === value} onChange={() => onChange(color.id)} />
            <span className="erp-qr-color__dot">
              <Icon name="check-lg" />
            </span>
            <span className="visually-hidden">{color.label}</span>
          </label>
        ))}
      </div>
      <div className="erp-qr-background">
        <span className="erp-flow-field__label">Nền mã QR</span>
        <div className="erp-qr-background__options" role="group" aria-label="Nền mã QR">
          {([['white', 'Nền trắng'], ['transparent', 'Không nền'], ['custom', 'Chọn màu']] as const).map(([mode, label]) => (
            <label key={mode} className="erp-qr-background__option">
              <input type="radio" name={`${name}-background`} checked={background.mode === mode} onChange={() => onBackgroundChange({ ...background, mode })} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {background.mode === 'custom' ? (
          <>
            <div className="erp-qr-colors erp-qr-background__colors" role="group" aria-label="Màu nền có sẵn">
              {QR_BACKGROUND_COLORS.map((color) => (
                <label key={color.id} className="erp-qr-color erp-qr-color--background" title={color.label} style={{ '--erp-qr-color': color.value } as CSSProperties}>
                  <input type="radio" className="visually-hidden" name={`${name}-background-color`} value={color.value} checked={background.color.toLowerCase() === color.value.toLowerCase()} onChange={() => onBackgroundChange({ mode: 'custom', color: color.value })} />
                  <span className="erp-qr-color__dot"><Icon name="check-lg" /></span>
                  <span className="visually-hidden">{color.label}</span>
                </label>
              ))}
            </div>
            <label className="erp-qr-background__custom">
              <span>Màu tùy ý</span>
              <input type="color" value={background.color} onChange={(event) => onBackgroundChange({ mode: 'custom', color: event.target.value })} />
              <span>{background.color.toUpperCase()}</span>
            </label>
          </>
        ) : null}
      </div>
    </fieldset>
  )
}
