import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { splitTask } from '../../services/quick-tasks'
import { planSplit, type SplitMode } from '../../utils/split-groups'

const ACCEPT: readonly QuickKind[] = ['pdf']

const MODES: readonly SplitMode[] = ['ranges', 'every']

/** TÁCH PDF — một tệp PDF, tách theo khoảng trang hoặc mỗi N trang. */
export default function SplitPdfPage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const modes: FlowChoiceOption<SplitMode>[] = MODES.map((value) => ({ value, label: t(`split.mode.${value}`), hint: t(`split.mode.${value}Hint`) }))
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
      pickerTitle={t('split.pickerTitle')}
      runLabel={parts > 1 ? t('split.runMany', { count: parts }) : parts === 1 ? t('split.runOne') : t('split.run')}
      runIcon="scissors"
      blocked={plan && !plan.ok ? plan.message : null}
      task={() => splitTask(item, plan?.ok ? plan.groups : [])}
      options={
        <>
          <FlowChoice legend={t('split.modeLegend')} value={mode} options={modes} onChange={setMode} />
          {mode === 'ranges' ? (
            <Form.Group controlId={`${ids}-ranges`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('split.ranges')}</Form.Label>
              <Form.Control
                value={ranges}
                placeholder={t('split.rangesPlaceholder')}
                autoComplete="off"
                isInvalid={ranges.trim() !== '' && !!plan && !plan.ok}
                aria-describedby={`${ids}-ranges-help`}
                onChange={(event) => setRanges(event.target.value)}
              />
              <Form.Text id={`${ids}-ranges-help`} className="erp-flow-field__hint">
                {t('split.rangesHint')}
                {pageCount > 0 ? ` ${t('split.pageCount', { count: pageCount })}` : ''}
              </Form.Text>
            </Form.Group>
          ) : (
            <Form.Group controlId={`${ids}-every`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('split.every')}</Form.Label>
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
                {parts > 0 ? t('split.partsZip', { count: parts }) : pageCount > 0 ? t('split.pageCount', { count: pageCount }) : t('split.lastShorter')}
              </Form.Text>
            </Form.Group>
          )}
        </>
      }
    />
  )
}
