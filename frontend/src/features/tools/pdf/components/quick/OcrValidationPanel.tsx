import { useTranslation } from 'react-i18next'
import type { OcrValidation } from '../../types/ocr-layout.types'

export function OcrValidationPanel({ findings, labels = {} }: { findings: OcrValidation[]; labels?: Record<string, string> }) {
  const { t } = useTranslation('ocr')
  if (!findings.length) return null
  return <section className="cn-ocr-validation" aria-label={t('validation')}>
    <h3>{t('validation')}</h3><p>{t('validationHint')}</p>
    <ul>{findings.map(finding => <li key={finding.id}>{labels[finding.targetId] ?? finding.targetId} · {t(`validationCodes.${finding.code}`)}</li>)}</ul>
  </section>
}
