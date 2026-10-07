import { useTranslation } from 'react-i18next'
import type { OcrPipelineOptions, OcrProfile } from '../../types/ocr-profile.types'

const PROFILES: OcrProfile[] = ['printed', 'numeric', 'table', 'form', 'mixed']
export function OcrProfileOptions({ value, onChange }: { value: OcrPipelineOptions; onChange: (options: OcrPipelineOptions) => void }) {
  const { t } = useTranslation('ocr')
  return <div className="cn-ocr-options">
    <label>{t('profile')}<select aria-label={t('profile')} className="form-select" value={value.profile} onChange={event => onChange({ ...value, profile: event.target.value as OcrProfile })}>
      {PROFILES.map(profile => <option key={profile} value={profile}>{t(`profiles.${profile}`)}</option>)}
    </select></label>
    <label>{t('passes')}<select aria-label={t('passes')} className="form-select" value={value.maxPasses} onChange={event => onChange({ ...value, maxPasses: Number(event.target.value) as 1 | 2 | 3 })}>
      {[1, 2, 3].map(count => <option key={count} value={count}>{count}</option>)}
    </select></label>
    <p className="erp-flow-field__hint">{t('passesHint')}</p>
  </div>
}
