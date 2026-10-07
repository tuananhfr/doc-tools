import { useId, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { NumberField, ScopeField } from '../../components/decoration-fields'
import { DecorationStage } from '../../components/quick/DecorationStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { decorateTask } from '../../services/page-tasks'
import type { Decorations, HeaderFooter, PageScope, StampSlot } from '../../types/decorations.types'
import { defaultHeaderFooter, HEADER_FOOTER_BASE, resolveScope } from '../../utils/decorations'

const ACCEPT: readonly QuickKind[] = ['pdf']

const POSITIONS: readonly StampSlot[] = ['bottomCenter', 'bottomRight', 'bottomLeft', 'topCenter', 'topRight', 'topLeft']

/** Mẫu có chữ "Trang" lấy theo ngôn ngữ trang — chữ đó in thẳng vào PDF. */
const templates = (t: TFunction<'pdf'>) => [
  { value: t('file.pageFooter'), label: t('file.pageSample') },
  { value: '{n}/{N}', label: '1/12' },
  { value: t('file.pageOnly'), label: t('file.pageOnlySample') },
  { value: '{n}', label: '1' },
  { value: '- {n} -', label: '- 1 -' },
]

const EMPTY_SLOTS: HeaderFooter['slots'] = { topLeft: '', topCenter: '', topRight: '', bottomLeft: '', bottomCenter: '', bottomRight: '' }

/** ĐÁNH SỐ TRANG — một tệp PDF; cùng engine đầu / chân trang của trình chỉnh sửa, thu lại còn một ô số. */
export default function PageNumbersPage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const [slot, setSlot] = useState<StampSlot>('bottomCenter')
  const [template, setTemplate] = useState(() => t('file.pageFooter'))
  const [fontSize, setFontSize] = useState(HEADER_FOOTER_BASE.fontSize)
  const [startNumber, setStartNumber] = useState(1)
  const [scope, setScope] = useState<PageScope>(HEADER_FOOTER_BASE.scope)

  const [item] = quick.items
  const decorations = useMemo<Decorations>(
    () => ({ headerFooter: { ...defaultHeaderFooter(), slots: { ...EMPTY_SLOTS, [slot]: template }, fontSize, startNumber, scope }, watermark: null }),
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
      pickerTitle={t('pageNumbers.pickerTitle')}
      stage={(running) => (item ? <DecorationStage item={item} decorations={decorations} disabled={running} onClear={quick.clear} /> : null)}
      runLabel={t('pageNumbers.run')}
      runIcon="hash"
      blocked={scopeError ?? (resolved?.ok && resolved.ids.size === 0 ? t('shared.scopeEmpty') : null)}
      task={() => decorateTask(item, decorations, { suffix: t('file.numbered'), title: t('pageNumbers.doneTitle') })}
      options={
        <>
          <Form.Group controlId={`${ids}-slot`} className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">{t('shared.position')}</Form.Label>
            <Form.Select value={slot} onChange={(event) => setSlot(event.target.value as StampSlot)}>
              {POSITIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`slot.${value}`)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId={`${ids}-template`} className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">{t('pageNumbers.template')}</Form.Label>
            <Form.Select value={template} onChange={(event) => setTemplate(event.target.value)}>
              {templates(t).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <div className="erp-flow-pair">
            <NumberField label={t('pageNumbers.startNumber')} value={startNumber} min={0} max={99999} onChange={setStartNumber} />
            <NumberField label={t('pageNumbers.fontSizePt')} value={fontSize} min={6} max={36} onChange={setFontSize} />
          </div>
          <ScopeField value={scope} error={scopeError} mergeKey="scope" onChange={setScope} />
        </>
      }
    />
  )
}
