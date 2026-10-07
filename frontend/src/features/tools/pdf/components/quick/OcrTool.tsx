import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { useOcrReview } from '../../hooks/useOcrReview'
import { ocrTask, type OcrOutput } from '../../services/quick-tasks'
import { QuickToolShell } from './QuickToolShell'
import { OcrReview } from './OcrReview'
import { OcrReadiness } from './OcrReadiness'
import { OcrProfileOptions } from './OcrProfileOptions'
import { OcrQualityPreview } from './OcrQualityPreview'
import { OcrOutputOptions } from './OcrOutputOptions'
import { OcrCornerPicker } from './OcrCornerPicker'
import { DEFAULT_OCR_OPTIONS, type OcrPipelineOptions } from '../../types/ocr-profile.types'

const DOCUMENTS: readonly QuickKind[] = ['pdf', 'image']
const IMAGES: readonly QuickKind[] = ['image']

export function OcrTool({ imagesOnly = false }: { imagesOnly?: boolean }) {
  const { t } = useTranslation('pdf')
  const { t: o } = useTranslation('ocr')
  const accept = imagesOnly ? IMAGES : DOCUMENTS
  const quick = useQuickSources({ accept, multiple: true })
  const review = useOcrReview()
  const [params] = useSearchParams()
  const tableIntent = params.get('ocrProfile') === 'table' && params.get('ocrOutput') === 'xlsx'
  const [output, setOutput] = useState<OcrOutput>(tableIntent ? 'xlsx' : imagesOnly ? 'text' : 'pdf')
  const [options, setOptions] = useState<OcrPipelineOptions>({ ...DEFAULT_OCR_OPTIONS, profile: tableIntent ? 'table' : DEFAULT_OCR_OPTIONS.profile })
  const [invalidCorners, setInvalidCorners] = useState(false)
  return <QuickToolShell quick={quick} accept={accept} multiple reorder
    waitingLabel={review.pages ? o('waitingReview') : undefined}
    pickerTitle={t(imagesOnly ? 'imageToText.pickerTitle' : 'ocrPage.pickerTitle')}
    runLabel={t(imagesOnly ? 'imageToText.run' : 'ocrPage.run')} runIcon="card-text" blocked={invalidCorners ? o('invalidCorners') : (output === 'csv' || output === 'xlsx') && options.profile !== 'table' ? o('tableRequired') : null}
    task={() => ocrTask(quick.items, output, review.request, options)}
    stage={() => review.pages ? <OcrReview pages={review.pages} onComplete={review.complete} /> : undefined}
    options={<>
      <OcrProfileOptions value={options} onChange={setOptions} />
      <OcrCornerPicker item={quick.items[0]} onChange={perspective => setOptions(current => ({ ...current, perspective, maxPasses: perspective && current.maxPasses === 1 ? 2 : current.maxPasses }))} onInvalid={setInvalidCorners} />
      <OcrQualityPreview items={quick.items} />
      <OcrOutputOptions value={output} onChange={setOutput} />
      <p className="erp-flow-field__hint">{t('ocrReview.handwriting')}</p>
      <OcrReadiness />
    </>} />
}
