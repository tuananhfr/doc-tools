import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { WATERMARK_COLOR, type Watermark, type WatermarkColor } from '../types/decorations.types'
import { DEFAULT_WATERMARK, DOCUMENT_COLORS, rgbCss } from '../utils/decorations'
import { RangeField, ScopeField } from './decoration-fields'

type Change = (value: Watermark | null, mergeKey?: string) => void

interface WatermarkSectionProps {
  value: Watermark | null
  scopeError: string | undefined
  onChange: Change
}

const COLOR_LABEL: Record<WatermarkColor, string> = { gray: 'Xám', red: 'Đỏ', blue: 'Xanh' }

/** Watermark chữ vẽ đè lên nội dung, có độ trong để vẫn đọc được trang. */
export function WatermarkSection({ value, scopeError, onChange }: WatermarkSectionProps) {
  const ids = useId()
  const [kept, setKept] = useState<Watermark>(DEFAULT_WATERMARK)

  const toggle = (enabled: boolean) => {
    if (enabled) {
      onChange(kept)
    } else if (value) {
      setKept(value)
      onChange(null)
    }
  }

  const head = (
    <div className="erp-doc-deco__head">
      <h2 className="erp-doc-export__title mb-0">
        <label htmlFor={`${ids}-on`} className="erp-doc-deco__toggle">
          <Icon name="droplet-half" className="me-2" />
          Watermark chữ
        </label>
      </h2>
      <Form.Check
        type="switch"
        id={`${ids}-on`}
        checked={!!value}
        aria-label="Bật watermark chữ"
        onChange={(event) => toggle(event.target.checked)}
      />
    </div>
  )

  if (!value) {
    return (
      <section className="erp-doc-export__section">
        {head}
        <p className="erp-doc-deco__hint">Đóng dấu chữ mờ như "BẢN SAO", "NHÁP", "MẬT" chéo giữa trang.</p>
      </section>
    )
  }

  return (
    <section className="erp-doc-export__section">
      {head}

      <Form.Group controlId={`${ids}-text`}>
        <Form.Label className="erp-doc-export__label">Nội dung</Form.Label>
        <Form.Control
          value={value.text}
          maxLength={60}
          isInvalid={value.text.trim() === ''}
          onChange={(event) => onChange({ ...value, text: event.target.value }, 'wm.text')}
        />
        <Form.Control.Feedback type="invalid">Nhập chữ cho watermark, để trống sẽ không in.</Form.Control.Feedback>
      </Form.Group>

      <fieldset>
        <legend className="erp-doc-export__label">Màu</legend>
        <div className="erp-doc-deco__colors">
          {Object.values(WATERMARK_COLOR).map((color) => (
            <Form.Check
              key={color}
              inline
              type="radio"
              id={`${ids}-color-${color}`}
              name={`${ids}-color`}
              checked={value.color === color}
              onChange={() => onChange({ ...value, color })}
              label={
                <>
                  <span className="erp-doc-deco__swatch" style={{ background: rgbCss(DOCUMENT_COLORS[color]) }} aria-hidden />
                  {COLOR_LABEL[color]}
                </>
              }
            />
          ))}
        </div>
      </fieldset>

      <RangeField
        label="Cỡ chữ"
        value={value.fontSize}
        min={16}
        max={160}
        step={4}
        format={(size) => `${size} pt`}
        onChange={(fontSize) => onChange({ ...value, fontSize }, 'wm.fontSize')}
      />
      <RangeField
        label="Độ đậm"
        value={Math.round(value.opacity * 100)}
        min={5}
        max={100}
        step={5}
        format={(percent) => `${percent}%`}
        onChange={(percent) => onChange({ ...value, opacity: percent / 100 }, 'wm.opacity')}
      />
      <RangeField
        label="Góc nghiêng"
        value={value.angle}
        min={-90}
        max={90}
        step={15}
        format={(angle) => `${angle}°`}
        onChange={(angle) => onChange({ ...value, angle }, 'wm.angle')}
      />

      <ScopeField value={value.scope} error={scopeError} mergeKey="wm.scope" onChange={(scope, key) => onChange({ ...value, scope }, key)} />
    </section>
  )
}
