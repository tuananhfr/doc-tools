import { useTranslation } from 'react-i18next'
import type { OcrWordResult } from '../../types/ocr-result.types'

export function OcrCandidates({ word, onSelect }: { word: OcrWordResult; onSelect: (value: string) => void }) {
  const { t } = useTranslation('ocr')
  if (!word.candidates?.length) return null
  return <fieldset className="cn-ocr-candidates"><legend>{t('candidates')}</legend>
    {word.reviewReasons?.includes('disagreement') ? <p role="status">{t('disagreement')}</p> : null}
    {word.candidates.map(candidate => <div key={candidate.id}>
      <span>{candidate.rawText} <small>({t(`passNames.${candidate.pass}`)}, {Math.round(candidate.score)}/100)</small></span>
      <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => onSelect(candidate.rawText)}>{t('useCandidate')}</button>
    </div>)}
  </fieldset>
}
