import { useId, useRef, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { HeaderFooter, StampSlot } from '../types/decorations.types'
import { defaultHeaderFooter, STAMP_TOKENS } from '../utils/decorations'
import { NumberField, ScopeField } from './decoration-fields'

type Change = (value: HeaderFooter | null, mergeKey?: string) => void

interface HeaderFooterSectionProps {
  value: HeaderFooter | null
  scopeError: string | undefined
  onChange: Change
}

const ROWS = [
  {
    title: 'rowTop',
    slots: [
      { slot: 'topLeft', label: 'left' },
      { slot: 'topCenter', label: 'center' },
      { slot: 'topRight', label: 'right' },
    ],
  },
  {
    title: 'rowBottom',
    slots: [
      { slot: 'bottomLeft', label: 'left' },
      { slot: 'bottomCenter', label: 'center' },
      { slot: 'bottomRight', label: 'right' },
    ],
  },
] as const satisfies readonly { title: string; slots: readonly { slot: StampSlot; label: string }[] }[]

const EMPTY_SLOTS: HeaderFooter['slots'] = {
  topLeft: '',
  topCenter: '',
  topRight: '',
  bottomLeft: '',
  bottomCenter: '',
  bottomRight: '',
}

/** Chữ "Trang" theo ngôn ngữ trang — chữ đó in thẳng vào PDF. */
const presets = (footer: string): { label: 'center' | 'right' | 'full'; slots: Partial<HeaderFooter['slots']> }[] => [
  { label: 'center', slots: { bottomCenter: footer } },
  { label: 'right', slots: { bottomRight: '{n}' } },
  { label: 'full', slots: { topLeft: '{file}', topRight: '{date}', bottomCenter: footer } },
]

/** Đánh số trang + đầu/chân trang: 6 ô chữ, mỗi ô chèn được trường tự điền. */
export function HeaderFooterSection({ value, scopeError, onChange }: HeaderFooterSectionProps) {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const presetList = presets(t('file.pageFooter'))
  // Tắt rồi bật lại thì lấy lại đúng nội dung đã gõ, không về mẫu mặc định.
  const [kept, setKept] = useState<HeaderFooter>(defaultHeaderFooter)
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
        <p className="erp-doc-deco__hint">{t('hf.offHint')}</p>
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
        <Form.Label className="erp-doc-export__label">{t('hf.presets')}</Form.Label>
        <Form.Select
          value=""
          onChange={(event) => {
            const preset = presetList[Number(event.target.value)]
            if (preset) onChange({ ...value, slots: { ...EMPTY_SLOTS, ...preset.slots } })
          }}
        >
          <option value="" disabled>
            {t('hf.choosePreset')}
          </option>
          {presetList.map((preset, index) => (
            <option key={preset.label} value={index}>
              {t(`hf.preset.${preset.label}`)}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {ROWS.map((row) => (
        <fieldset key={row.title} className="erp-doc-deco__slots">
          <legend className="erp-doc-export__label">{t(`hf.${row.title}`)}</legend>
          {row.slots.map(({ slot, label }) => (
            <Form.Group key={slot} controlId={`${ids}-${slot}`} className="erp-doc-deco__slot">
              <Form.Label className="erp-doc-deco__slot-label">{t(`hf.${label}`)}</Form.Label>
              <Form.Control
                value={value.slots[slot]}
                maxLength={80}
                aria-label={t(`slot.${slot}`)}
                onFocus={(event) => {
                  lastInput.current = { slot, input: event.currentTarget }
                }}
                onChange={(event) => setSlot(slot, event.target.value)}
              />
            </Form.Group>
          ))}
        </fieldset>
      ))}

      <div className="erp-doc-deco__tokens" role="group" aria-label={t('hf.tokens')}>
        {STAMP_TOKENS.map(({ token, id }) => (
          <button
            key={token}
            type="button"
            className="erp-doc-token"
            title={t('hf.insertToken', { token, label: t(`hf.token.${id}`).toLowerCase() })}
            // Giữ focus ở ô chữ để chèn đúng chỗ con trỏ.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertToken(token)}
          >
            <code>{token}</code> {t(`hf.token.${id}`)}
          </button>
        ))}
      </div>

      <div className="erp-doc-deco__grid">
        <NumberField label={t('pageNumbers.fontSizePt')} value={value.fontSize} min={6} max={36} onChange={(fontSize) => onChange({ ...value, fontSize }, 'hf.fontSize')} />
        <NumberField label={t('hf.margin')} value={value.margin} min={0} max={144} onChange={(margin) => onChange({ ...value, margin }, 'hf.margin')} />
        <NumberField
          label={t('pageNumbers.startNumber')}
          value={value.startNumber}
          min={0}
          max={99999}
          onChange={(startNumber) => onChange({ ...value, startNumber }, 'hf.startNumber')}
        />
      </div>

      <ScopeField value={value.scope} error={scopeError} mergeKey="hf.scope" onChange={(scope, key) => onChange({ ...value, scope }, key)} />

      <p className="erp-doc-deco__hint">
        <Icon name="info-circle" className="me-1" />
        {t('hf.restartNote', { start: value.startNumber })}
      </p>
    </section>
  )
}

function SectionHead({ ids, enabled, onToggle }: { ids: string; enabled: boolean; onToggle: (enabled: boolean) => void }) {
  const { t } = useTranslation('pdf')
  return (
    <div className="erp-doc-deco__head">
      <h2 className="erp-doc-export__title mb-0">
        {/* Nhãn bấm được: công tắc chỉ cao 24px, dưới ngưỡng chạm 44px. */}
        <label htmlFor={`${ids}-on`} className="erp-doc-deco__toggle">
          <Icon name="hash" className="me-2" />
          {t('hf.title')}
        </label>
      </h2>
      <Form.Check
        type="switch"
        id={`${ids}-on`}
        checked={enabled}
        aria-label={t('hf.toggle')}
        onChange={(event) => onToggle(event.target.checked)}
      />
    </div>
  )
}
