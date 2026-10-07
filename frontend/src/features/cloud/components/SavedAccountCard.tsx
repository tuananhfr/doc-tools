import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { SAVED_PAGE_PATH } from '../config/cloud-routes'
import { useSavedItems } from '../hooks/useSavedItems'

/** Account page card; also shown after Pro ends while saved items remain, since they are still readable. */
export function SavedAccountCard({ pro }: { pro: boolean }) {
  const { t } = useTranslation('cloud')
  const saved = useSavedItems(true)
  if (!pro && !saved.data?.items.length) return null
  const count = saved.data?.items.length
  return (
    <section className="cn-account-card" aria-labelledby="cn-account-saved">
      <div className="cn-account-card__head">
        <h2 id="cn-account-saved">{t('card.title')}</h2>
        {count !== undefined ? <span className="cn-saved-count">{t('card.count', { total: count })}</span> : null}
      </div>
      <p className="cn-account-card__text">{pro ? t('card.text') : t('card.readOnly')}</p>
      <Link className="cn-button cn-button--ghost" to={SAVED_PAGE_PATH}><Icon name="bookmark-star" />{t('card.open')}</Link>
    </section>
  )
}
