import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SOURCE_URL_MAX, checkSourceUrl } from '../utils/contribution-check'
import type { SourceType } from '../types/community.types'

export function SourceFields({ url, type, onUrl, onType, required = false }: { url: string; type: SourceType; onUrl: (value: string) => void; onType: (value: SourceType) => void; required?: boolean }) {
  const { t } = useTranslation('community')
  const id = useId()
  const check = checkSourceUrl(url.trim())
  const error = check === 'invalid' ? t('contribution.sourceUrlInvalid') : check === 'notHttps' ? t('contribution.sourceUrlNotHttps') : check === 'unsafe' ? t('contribution.sourceUrlUnsafe') : ''
  return <div className="cn-community-sources">
    <label htmlFor={`${id}-url`}>{t('contribution.sourceUrl')}<input id={`${id}-url`} type="url" maxLength={SOURCE_URL_MAX} required={required} value={url} onChange={event => onUrl(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /></label>
    {error ? <p id={`${id}-error`} className="cn-field-error" role="alert">{error}</p> : null}
    <label htmlFor={`${id}-type`}>{t('contribution.sourceType')}<select id={`${id}-type`} value={type} onChange={event => onType(event.target.value as SourceType)}>{(['OFFICIAL_WEB', 'OFFICIAL_DOCUMENT', 'OFFICIAL_API', 'OTHER'] as const).map(value => <option key={value} value={value}>{t(`contribution.sourceTypes.${value}`)}</option>)}</select></label>
  </div>
}
