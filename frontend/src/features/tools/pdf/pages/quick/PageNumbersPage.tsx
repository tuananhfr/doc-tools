import { useId, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { NumberField, ScopeField } from '../../components/decoration-fields'
import { DecorationStage } from '../../components/quick/DecorationStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { decorateTask } from '../../services/page-tasks'
import type { Decorations, HeaderFooter, PageScope, StampSlot } from '../../types/decorations.types'
import { DEFAULT_HEADER_FOOTER, resolveScope } from '../../utils/decorations'

const ACCEPT: readonly QuickKind[] = ['pdf']

const POSITIONS: { value: StampSlot; label: string }[] = [
  { value: 'bottomCenter', label: 'Chân trang — giữa' },
  { value: 'bottomRight', label: 'Chân trang — phải' },
  { value: 'bottomLeft', label: 'Chân trang — trái' },
  { value: 'topCenter', label: 'Đầu trang — giữa' },
  { value: 'topRight', label: 'Đầu trang — phải' },
  { value: 'topLeft', label: 'Đầu trang — trái' },
]

const TEMPLATES = [
  { value: 'Trang {n}/{N}', label: 'Trang 1/12' },
  { value: '{n}/{N}', label: '1/12' },
  { value: 'Trang {n}', label: 'Trang 1' },
  { value: '{n}', label: '1' },
  { value: '- {n} -', label: '- 1 -' },
]

const EMPTY_SLOTS: HeaderFooter['slots'] = { topLeft: '', topCenter: '', topRight: '', bottomLeft: '', bottomCenter: '', bottomRight: '' }

/** ĐÁNH SỐ TRANG — một tệp PDF; cùng engine đầu / chân trang của trình chỉnh sửa, thu lại còn một ô số. */
export default function PageNumbersPage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const [slot, setSlot] = useState<StampSlot>('bottomCenter')
  const [template, setTemplate] = useState(TEMPLATES[0].value)
  const [fontSize, setFontSize] = useState(DEFAULT_HEADER_FOOTER.fontSize)
  const [startNumber, setStartNumber] = useState(1)
  const [scope, setScope] = useState<PageScope>(DEFAULT_HEADER_FOOTER.scope)

  const [item] = quick.items
  const decorations = useMemo<Decorations>(
    () => ({ headerFooter: { ...DEFAULT_HEADER_FOOTER, slots: { ...EMPTY_SLOTS, [slot]: template }, fontSize, startNumber, scope }, watermark: null }),
    [slot, template, fontSize, startNumber, scope],
  )
  const resolved = item
    ? resolveScope(
        scope,
        item.pages.map((page) => page.id),
      )
    : null
  const scopeError = resolved && !resolved.ok ? resolved.message : undefined

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple={false}
      pickerTitle="Chọn tệp PDF cần đánh số trang"
      stage={(running) => (item ? <DecorationStage item={item} decorations={decorations} disabled={running} onClear={quick.clear} /> : null)}
      runLabel="Đánh số trang"
      runIcon="hash"
      blocked={scopeError ?? (resolved?.ok && resolved.ids.size === 0 ? 'Phạm vi đã chọn không có trang nào.' : null)}
      task={() => decorateTask(item, decorations, { suffix: 'đã đánh số', title: 'Đã đánh số trang' })}
      options={
        <>
          <Form.Group controlId={`${ids}-slot`} className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">Vị trí</Form.Label>
            <Form.Select value={slot} onChange={(event) => setSlot(event.target.value as StampSlot)}>
              {POSITIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId={`${ids}-template`} className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">Kiểu số</Form.Label>
            <Form.Select value={template} onChange={(event) => setTemplate(event.target.value)}>
              {TEMPLATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <div className="erp-flow-pair">
            <NumberField label="Số bắt đầu" value={startNumber} min={0} max={99999} onChange={setStartNumber} />
            <NumberField label="Cỡ chữ (pt)" value={fontSize} min={6} max={36} onChange={setFontSize} />
          </div>
          <ScopeField value={scope} error={scopeError} mergeKey="scope" onChange={setScope} />
        </>
      }
    />
  )
}
