import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { splitTask } from '../../services/quick-tasks'
import { planSplit, type SplitMode } from '../../utils/split-groups'

const ACCEPT: readonly QuickKind[] = ['pdf']

const MODES: FlowChoiceOption<SplitMode>[] = [
  { value: 'ranges', label: 'Theo khoảng trang', hint: 'Tự chọn trang nào vào tệp nào.' },
  { value: 'every', label: 'Mỗi N trang một tệp', hint: 'Cắt đều từ đầu tới cuối.' },
]

/** TÁCH PDF — một tệp PDF, tách theo khoảng trang hoặc mỗi N trang. */
export default function SplitPdfPage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const [mode, setMode] = useState<SplitMode>('ranges')
  const [ranges, setRanges] = useState('')
  const [every, setEvery] = useState('1')

  const [item] = quick.items
  const pageCount = item?.pages.length ?? 0
  const plan = item ? planSplit({ mode, ranges, every: Number(every) }, pageCount) : null
  const parts = plan?.ok ? plan.groups.length : 0

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple={false}
      pickerTitle="Chọn tệp PDF cần tách"
      runLabel={parts > 1 ? `Tách thành ${parts} tệp` : parts === 1 ? 'Lấy trang ra tệp riêng' : 'Tách PDF'}
      runIcon="scissors"
      blocked={plan && !plan.ok ? plan.message : null}
      task={() => splitTask(item, plan?.ok ? plan.groups : [])}
      options={
        <>
          <FlowChoice legend="Cách tách" value={mode} options={MODES} onChange={setMode} />
          {mode === 'ranges' ? (
            <Form.Group controlId={`${ids}-ranges`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">Khoảng trang</Form.Label>
              <Form.Control
                value={ranges}
                placeholder="Ví dụ: 1-3, 5, 8-10"
                autoComplete="off"
                isInvalid={ranges.trim() !== '' && !!plan && !plan.ok}
                aria-describedby={`${ids}-ranges-help`}
                onChange={(event) => setRanges(event.target.value)}
              />
              <Form.Text id={`${ids}-ranges-help`} className="erp-flow-field__hint">
                Mỗi nhóm cách nhau dấu phẩy thành một tệp.{pageCount > 0 ? ` Tệp có ${pageCount} trang.` : ''}
              </Form.Text>
            </Form.Group>
          ) : (
            <Form.Group controlId={`${ids}-every`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">Số trang mỗi tệp</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={Math.max(1, pageCount - 1)}
                step={1}
                inputMode="numeric"
                value={every}
                isInvalid={!!plan && !plan.ok}
                aria-describedby={`${ids}-every-help`}
                onChange={(event) => setEvery(event.target.value)}
              />
              <Form.Text id={`${ids}-every-help`} className="erp-flow-field__hint">
                {parts > 0 ? `Ra ${parts} tệp, gói chung một .zip.` : pageCount > 0 ? `Tệp có ${pageCount} trang.` : 'Tệp cuối có thể ít trang hơn.'}
              </Form.Text>
            </Form.Group>
          )}
        </>
      }
    />
  )
}
