import { useId, type CSSProperties } from 'react'
import { Icon } from '@/components/ui'
import { QR_COLORS } from '../config/qr-colors'

interface QrColorPickerProps {
  /** `id` của màu đang chọn. */
  value: string
  onChange: (id: string) => void
}

/** Hàng ô màu tròn; ô đang chọn có dấu tích + viền, không chỉ khác màu. */
export function QrColorPicker({ value, onChange }: QrColorPickerProps) {
  const name = useId()

  return (
    <fieldset className="erp-flow-options">
      <legend className="erp-flow-field__label">Màu sắc</legend>
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
    </fieldset>
  )
}
