import { useId, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { HeaderFooter, StampSlot } from '../types/decorations.types'
import { DEFAULT_HEADER_FOOTER, STAMP_TOKENS } from '../utils/decorations'
import { NumberField, ScopeField } from './decoration-fields'

type Change = (value: HeaderFooter | null, mergeKey?: string) => void

interface HeaderFooterSectionProps {
  value: HeaderFooter | null
  scopeError: string | undefined
  onChange: Change
}

const ROWS: { title: string; slots: { slot: StampSlot; label: string }[] }[] = [
  {
    title: 'Đầu trang',
    slots: [
      { slot: 'topLeft', label: 'Trái' },
      { slot: 'topCenter', label: 'Giữa' },
      { slot: 'topRight', label: 'Phải' },
    ],
  },
  {
    title: 'Chân trang',
    slots: [
      { slot: 'bottomLeft', label: 'Trái' },
      { slot: 'bottomCenter', label: 'Giữa' },
      { slot: 'bottomRight', label: 'Phải' },
    ],
  },
]

const EMPTY_SLOTS: HeaderFooter['slots'] = {
  topLeft: '',
  topCenter: '',
  topRight: '',
  bottomLeft: '',
  bottomCenter: '',
  bottomRight: '',
}

const PRESETS: { label: string; slots: Partial<HeaderFooter['slots']> }[] = [
  { label: 'Trang 1/5 — giữa chân trang', slots: { bottomCenter: 'Trang {n}/{N}' } },
  { label: '1 — góc phải chân trang', slots: { bottomRight: '{n}' } },
  { label: 'Tên tệp + ngày ở đầu, Trang 1/5 ở chân', slots: { topLeft: '{file}', topRight: '{date}', bottomCenter: 'Trang {n}/{N}' } },
]

/** Đánh số trang + đầu/chân trang: 6 ô chữ, mỗi ô chèn được trường tự điền. */
export function HeaderFooterSection({ value, scopeError, onChange }: HeaderFooterSectionProps) {
  const ids = useId()
  // Tắt rồi bật lại thì lấy lại đúng nội dung đã gõ, không về mẫu mặc định.
  const [kept, setKept] = useState<HeaderFooter>(DEFAULT_HEADER_FOOTER)
  const lastInput = useRef<{ slot: StampSlot; input: HTMLInputElement | HTMLTextAreaElement } | null>(null)

  const toggle = (enabled: boolean) => {
    if (enabled) {
      onChange(kept)
    } else if (value) {
      setKept(value)
      onChange(null)
    }
  }

  if (!value) {
    return (
      <section className="erp-doc-export__section">
        <SectionHead ids={ids} enabled={false} onToggle={toggle} />
        <p className="erp-doc-deco__hint">Thêm số trang, tên tệp hoặc ngày vào đầu / chân mỗi trang khi xuất.</p>
      </section>
    )
  }

  const setSlot = (slot: StampSlot, text: string) => onChange({ ...value, slots: { ...value.slots, [slot]: text } }, `hf.${slot}`)

  const insertToken = (token: string) => {
    const target = lastInput.current
    const slot = target?.slot ?? 'bottomCenter'
    const current = value.slots[slot]
    const start = target?.input.selectionStart ?? current.length
    const end = target?.input.selectionEnd ?? current.length
    onChange({ ...value, slots: { ...value.slots, [slot]: current.slice(0, start) + token + current.slice(end) } })
    if (target) {
      requestAnimationFrame(() => {
        target.input.focus()
        target.input.setSelectionRange(start + token.length, start + token.length)
      })
    }
  }

  return (
    <section className="erp-doc-export__section">
      <SectionHead ids={ids} enabled onToggle={toggle} />

      <Form.Group controlId={`${ids}-preset`}>
        <Form.Label className="erp-doc-export__label">Mẫu nhanh</Form.Label>
        <Form.Select
          value=""
          onChange={(event) => {
            const preset = PRESETS[Number(event.target.value)]
            if (preset) onChange({ ...value, slots: { ...EMPTY_SLOTS, ...preset.slots } })
          }}
        >
          <option value="" disabled>
            Chọn mẫu…
          </option>
          {PRESETS.map((preset, index) => (
            <option key={preset.label} value={index}>
              {preset.label}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {ROWS.map((row) => (
        <fieldset key={row.title} className="erp-doc-deco__slots">
          <legend className="erp-doc-export__label">{row.title}</legend>
          {row.slots.map(({ slot, label }) => (
            <Form.Group key={slot} controlId={`${ids}-${slot}`} className="erp-doc-deco__slot">
              <Form.Label className="erp-doc-deco__slot-label">{label}</Form.Label>
              <Form.Control
                value={value.slots[slot]}
                maxLength={80}
                aria-label={`${row.title} — ${label.toLowerCase()}`}
                onFocus={(event) => {
                  lastInput.current = { slot, input: event.currentTarget }
                }}
                onChange={(event) => setSlot(slot, event.target.value)}
              />
            </Form.Group>
          ))}
        </fieldset>
      ))}

      <div className="erp-doc-deco__tokens" role="group" aria-label="Chèn trường tự điền vào ô vừa chọn">
        {STAMP_TOKENS.map(({ token, label }) => (
          <button
            key={token}
            type="button"
            className="erp-doc-token"
            title={`Chèn ${token} — ${label.toLowerCase()}`}
            // Giữ focus ở ô chữ để chèn đúng chỗ con trỏ.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertToken(token)}
          >
            <code>{token}</code> {label}
          </button>
        ))}
      </div>

      <div className="erp-doc-deco__grid">
        <NumberField label="Cỡ chữ (pt)" value={value.fontSize} min={6} max={36} onChange={(fontSize) => onChange({ ...value, fontSize }, 'hf.fontSize')} />
        <NumberField label="Cách mép (pt)" value={value.margin} min={0} max={144} onChange={(margin) => onChange({ ...value, margin }, 'hf.margin')} />
        <NumberField
          label="Số bắt đầu"
          value={value.startNumber}
          min={0}
          max={99999}
          onChange={(startNumber) => onChange({ ...value, startNumber }, 'hf.startNumber')}
        />
      </div>

      <ScopeField value={value.scope} error={scopeError} mergeKey="hf.scope" onChange={(scope, key) => onChange({ ...value, scope }, key)} />

      <p className="erp-doc-deco__hint">
        <Icon name="info-circle" className="me-1" />
        Mỗi tệp xuất tự đếm lại từ {value.startNumber} — tách thành 3 tệp thì tệp nào cũng bắt đầu lại. Lưới đang xem trước như khi tải cả
        tài liệu thành một tệp.
      </p>
    </section>
  )
}

function SectionHead({ ids, enabled, onToggle }: { ids: string; enabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <div className="erp-doc-deco__head">
      <h2 className="erp-doc-export__title mb-0">
        {/* Nhãn bấm được: công tắc chỉ cao 24px, dưới ngưỡng chạm 44px. */}
        <label htmlFor={`${ids}-on`} className="erp-doc-deco__toggle">
          <Icon name="hash" className="me-2" />
          Số trang, đầu & chân trang
        </label>
      </h2>
      <Form.Check
        type="switch"
        id={`${ids}-on`}
        checked={enabled}
        aria-label="Bật số trang, đầu và chân trang"
        onChange={(event) => onToggle(event.target.checked)}
      />
    </div>
  )
}
