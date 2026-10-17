import { useTranslation } from 'react-i18next'
import { EntertainmentError } from '../services/entertainment.api'

export function EntertainmentFailure({ error }: { error: unknown }) {
  const { t } = useTranslation('entertainment')
  const code = error instanceof EntertainmentError ? error.code : 'NETWORK_ERROR'
  const key = ['SERVICE_UNAVAILABLE', 'INVALID_RESPONSE', 'UNSUPPORTED_NAME', 'INVALID_BIRTH_DATE', 'SESSION_EXPIRED', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED'].includes(code) ? code : 'NETWORK_ERROR'
  return <p className="cn-field-error" role="alert">{t(`errors.${key}` as 'errors.NETWORK_ERROR')}</p>
}
