import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { useOcrReview } from '../../hooks/useOcrReview'
import { ocrTask, type OcrOutput } from '../../services/quick-tasks'
import { QuickToolShell } from './QuickToolShell'
import { OcrReview } from './OcrReview'
import { OcrReadiness } from './OcrReadiness'

const DOCUMENTS: readonly QuickKind[] = ['pdf', 'image']
const IMAGES: readonly QuickKind[] = ['image']
const OUTPUTS: readonly OcrOutput[] = ['pdf', 'text']

export function OcrTool({ imagesOnly = false }: { imagesOnly?: boolean }) {
  const { t } = useTranslation('pdf')
  const accept = imagesOnly ? IMAGES : DOCUMENTS
  const quick = useQuickSources({ accept, multiple: true })
  const review = useOcrReview()
  const [output, setOutput] = useState<OcrOutput>(imagesOnly ? 'text' : 'pdf')
  const outputs: FlowChoiceOption<OcrOutput>[] = OUTPUTS.map(value => ({ value, label: t(`ocrPage.output.${value}`), hint: t(`ocrPage.output.${value}Hint`) }))
  return <QuickToolShell quick={quick} accept={accept} multiple reorder
    pickerTitle={t(imagesOnly ? 'imageToText.pickerTitle' : 'ocrPage.pickerTitle')}
    runLabel={t(imagesOnly ? 'imageToText.run' : 'ocrPage.run')} runIcon="card-text" blocked={null}
    task={() => ocrTask(quick.items, output, review.request)}
    stage={() => review.pages ? <OcrReview pages={review.pages} onComplete={review.complete} /> : undefined}
    options={<>
      {!imagesOnly ? <FlowChoice legend={t('ocrPage.outputLegend')} value={output} options={outputs} onChange={setOutput} /> : null}
      <p className="erp-flow-field__hint">{t('ocrReview.handwriting')}</p>
      <OcrReadiness />
    </>} />
}
