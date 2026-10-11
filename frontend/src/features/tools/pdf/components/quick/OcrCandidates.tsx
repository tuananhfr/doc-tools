import { useTranslation } from 'react-i18next'
import type { OcrWordResult } from '../../types/ocr-result.types'

export function OcrCandidates({ word, onSelect }: { word: OcrWordResult; onSelect: (value: string) => void }) {
  const { t } = useTranslation('ocr')
  if (!word.candidates?.length) return null
  const distinct = [...new Map(word.candidates.map(candidate => [candidate.rawText, candidate])).values()]
  return <div className="cn-ocr-candidates">
    <details key={word.id}><summary>{t('candidates')}</summary>
    {distinct.map(candidate => <div key={candidate.id}>
      <span>{candidate.rawText} <small>({t(`passNames.${candidate.pass}`)}, {Math.round(candidate.score)}/100)</small></span>
      <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => onSelect(candidate.rawText)}>{t('useCandidate')}</button>
    </div>)}
    </details>
  </div>
}
