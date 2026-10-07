import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

/** What a guest or a free member sees where the assistant would be; Pro itself is sold on the account page. */
export function ProInvite({ signedIn, loginTo, title, text }: { signedIn: boolean; loginTo: string; title?: string; text?: string }) {
  const { t } = useTranslation('ai')
  return (
    <section className="cn-ai-invite" aria-labelledby="cn-ai-invite">
      <span className="cn-ai-invite__icon"><Icon name="stars" /></span>
      <div className="cn-ai-invite__body">
        <h2 id="cn-ai-invite">{title ?? t('invite.title')} <span className="cn-pro-chip">Pro</span></h2>
        <p>{text ?? t('invite.text')}</p>
        {signedIn ? null : <p className="cn-ai-invite__hint">{t('invite.guest')}</p>}
      </div>
      {signedIn ? (
        <Link className="cn-button cn-button--navy" to="/tai-khoan"><Icon name="patch-check" />{t('invite.upgrade')}</Link>
      ) : (
        <Link className="cn-button" to={loginTo}><Icon name="box-arrow-in-right" />{t('invite.signIn')}</Link>
      )}
    </section>
  )
}
