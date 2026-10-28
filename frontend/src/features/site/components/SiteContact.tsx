import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { SITE_IDENTITY } from '../config/site-identity'

/** Compact, visible contact details in every public page shell. */
export function SiteContact() {
  const { t } = useTranslation('site')
  return <div className="cn-site-contact">
    <a href={'tel:' + SITE_IDENTITY.telephone}><Icon name="telephone" />{SITE_IDENTITY.telephoneDisplay}</a>
    <a href={'mailto:' + SITE_IDENTITY.email}><Icon name="envelope" />{SITE_IDENTITY.email}</a>
    <span>{t('footer.copyright', { year: new Date().getFullYear(), owner: SITE_IDENTITY.owner })}</span>
  </div>
}
