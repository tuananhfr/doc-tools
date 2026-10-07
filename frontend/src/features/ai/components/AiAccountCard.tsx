import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { AI_SETTINGS_PATH } from '../config/ai-routes'
import { useAiSetup } from '../hooks/useAiSetup'
import { AiStatusBadge } from './AiStatusBadge'

/** Shown on the account page to Pro members only; the plan card already tells everyone else what Pro adds. */
export function AiAccountCard() {
  const { t } = useTranslation('ai')
  const setup = useAiSetup(true)
  if (setup.data && !setup.data.available) return null
  const provider = setup.data?.provider
  return (
    <section className="cn-account-card" aria-labelledby="cn-account-ai">
      <div className="cn-account-card__head">
        <h2 id="cn-account-ai">{t('card.title')}</h2>
        {setup.data ? <AiStatusBadge status={provider?.status ?? 'none'} /> : null}
      </div>
      <p className="cn-account-card__text">{t('card.text')}</p>
      <Link className="cn-button cn-button--ghost" to={AI_SETTINGS_PATH}><Icon name="key" />{provider ? t('card.manage') : t('card.setup')}</Link>
    </section>
  )
}
