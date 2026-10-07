import { Trans, useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { LoginForm } from '../components/LoginForm'
import { useMe } from '../hooks/useAccount'
import { safeNextPath } from '../utils/next-path'
import { ADMIN_ROOT } from '@/features/admin'

const BENEFITS = [
  { id: 'attributed', icon: 'person-check' },
  { id: 'track', icon: 'list-check' },
  { id: 'pro', icon: 'stars' },
] as const

export default function LoginPage() {
  const { t } = useTranslation('account')
  const { t: tSite } = useTranslation('site')
  usePageTitle(t('pages.dang-nhap.title'))
  const [params] = useSearchParams()
  const requested = params.get('next')
  const next = safeNextPath(requested)
  const { data } = useMe()

  // Also the redirect after a successful sign-in: verifying writes the new session into the `/me` cache.
  // Staff land in the admin area unless a link asked for somewhere specific.
  if (data?.user) return <Navigate to={data.staff && !requested ? ADMIN_ROOT : next} replace />

  return (
    <div className="cn-site-page cn-account">
      <SitePageHero
        id="cn-login-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: t('login.trail') }]}
        title={<Trans ns="account" i18nKey="login.title" components={{ accent: <span /> }} />}
        description={<p>{t('login.intro')}</p>}
      />
      <section className="cn-container cn-page-section">
        <div className="cn-account-layout">
          <div className="cn-account-panel">
            <LoginForm />
          </div>
          <aside className="cn-account-aside" aria-labelledby="cn-login-aside">
            <h2 id="cn-login-aside">{t('login.asideTitle')}</h2>
            <ul className="cn-account-benefits">
              {BENEFITS.map((item) => (
                <li key={item.id}>
                  <span className="cn-account-benefit-icon"><Icon name={item.icon} /></span>
                  <span>
                    <strong>{t(`login.benefits.${item.id}.title`)}</strong>
                    <span>{t(`login.benefits.${item.id}.text`)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="cn-account-note"><Icon name="shield-lock" />{t('login.asideNote')}</p>
          </aside>
        </div>
      </section>
    </div>
  )
}
