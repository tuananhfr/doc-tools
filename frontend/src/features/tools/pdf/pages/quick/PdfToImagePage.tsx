import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { convertTask } from '../../services/quick-tasks'
import type { ImageFormat } from '../../types/doc-tools.types'

const ACCEPT: readonly QuickKind[] = ['pdf']

const FORMATS: readonly { value: ImageFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
]

const DPI_OPTIONS = [96, 150, 300] as const

/** PDF → ẢNH — mỗi trang một ảnh; nhiều trang hoặc nhiều tệp thì gói chung một .zip. */
export default function PdfToImagePage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [dpi, setDpi] = useState(150)
  const pages = quick.items.reduce((sum, item) => sum + item.pages.length, 0)
  const formats: FlowChoiceOption<ImageFormat>[] = FORMATS.map((option) => ({ ...option, hint: t(`pdfToImage.format.${option.value}Hint`) }))

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle={t('pdfToImage.pickerTitle')}
      runLabel={pages > 1 ? t('pdfToImage.runMany', { count: pages }) : t('pdfToImage.run')}
      runIcon="image"
      blocked={null}
      task={() => convertTask(quick.items, format, dpi)}
      options={
        <>
          <FlowChoice legend={t('pdfToImage.formatLegend')} value={format} options={formats} onChange={setFormat} />
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
        </>
      }
    />
  )
}
