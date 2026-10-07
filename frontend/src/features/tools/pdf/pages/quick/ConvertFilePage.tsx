import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { convertTask, type ConvertTarget } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

const DPI_OPTIONS = [96, 150, 300] as const

/** CHUYỂN ĐỔI FILE — PDF sang Word, Excel hoặc ảnh từng trang. */
export default function ConvertFilePage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const targets: FlowChoiceOption<ConvertTarget>[] = [
    { value: 'word', label: t('convert.target.word') },
    { value: 'excel', label: t('convert.target.excel'), hint: t('convert.target.excelHint') },
    { value: 'jpeg', label: t('convert.target.jpeg'), hint: t('convert.target.jpegHint') },
    { value: 'png', label: t('convert.target.png'), hint: t('convert.target.pngHint') },
  ]
  const [target, setTarget] = useState<ConvertTarget>('word')
  const [dpi, setDpi] = useState(150)
  const [ocr, setOcr] = useState(true)
  const image = target === 'jpeg' || target === 'png'

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle={t('convert.pickerTitle')}
      runLabel={t('convert.run')}
      runIcon="arrow-left-right"
      blocked={null}
      task={() => convertTask(quick.items, target, dpi, ocr)}
      options={
        <>
          <FlowChoice legend={t('convert.targetLegend')} value={target} options={targets} onChange={setTarget} />
          {image ? (
            <Form.Group controlId={`${ids}-dpi`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('dpi.label')}</Form.Label>
              <Form.Select value={dpi} aria-describedby={`${ids}-dpi-help`} onChange={(event) => setDpi(Number(event.target.value))}>
                {DPI_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {`${value} DPI`}
                  </option>
                ))}
              </Form.Select>
              <Form.Text id={`${ids}-dpi-help`} className="erp-flow-field__hint">
                {DPI_OPTIONS.map((value) => (value === dpi ? t(`dpi.hint${value}`) : null))}
              </Form.Text>
            </Form.Group>
          ) : (
            <>
              <Form.Check id={`${ids}-ocr`} type="checkbox" label={t('convert.ocr')} checked={ocr} aria-describedby={`${ids}-ocr-help`} onChange={(event) => setOcr(event.target.checked)} />
              <p id={`${ids}-ocr-help`} className="erp-flow-field__hint">
                {ocr
                  ? t('convert.ocrOnHint')
                  : t('convert.ocrOffHint')}
              </p>
              <p className="erp-flow-field__hint">{t('convert.note')}</p>
            </>
          )}
        </>
      }
    />
  )
}
