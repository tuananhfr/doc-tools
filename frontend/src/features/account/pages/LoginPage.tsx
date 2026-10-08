import { useState, useSyncExternalStore } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { PasswordLoginForm } from '../components/PasswordLoginForm'
import { PasswordSetupForm } from '../components/PasswordSetupForm'
import { useMe } from '../hooks/useAccount'
import { safeNextPath } from '../utils/next-path'
import { ADMIN_ROOT } from '@/features/admin'

const BENEFITS = [
  { id: 'attributed', icon: 'person-check' },
  { id: 'track', icon: 'list-check' },
  { id: 'pro', icon: 'stars' },
] as const

// `?mode=` rather than separate routes: one page, one metadata entry, and `next` survives every switch.
const SETUP_MODES = ['signup', 'reset'] as const
type SetupMode = (typeof SETUP_MODES)[number]
const subscribeNever = () => () => {}

export default function LoginPage() {
  const { t } = useTranslation('account')
  const { t: tSite } = useTranslation('site')
  usePageTitle(t('pages.dang-nhap.title'))
  const [params, setParams] = useSearchParams()
  const requested = params.get('next')
  const next = safeNextPath(requested)
  const { data } = useMe()
  // The page is prerendered without a query string, so the mode is read only after hydration.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  const mode = hydrated ? SETUP_MODES.find((value) => value === params.get('mode')) : undefined
  // Kept across modes so "forgot password" does not make the person type their email again.
  const [email, setEmail] = useState('')

  const switchMode = (next: SetupMode | null) => {
    const changed = new URLSearchParams(params)
    if (next) changed.set('mode', next); else changed.delete('mode')
    setParams(changed)
  }

  // Also the redirect after a successful sign-in: login and password setup write the new session into the `/me` cache.
  // Staff land in the admin area unless a link asked for somewhere specific.
  if (data?.user) return <Navigate to={data.staff && !requested ? ADMIN_ROOT : next} replace />

  return (
    <div className="cn-site-page cn-account">
      <SitePageHero
        id="cn-login-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: mode ? t(`setup.${mode}.trail`) : t('login.trail') }]}
        title={<Trans ns="account" i18nKey={mode ? `setup.${mode}.title` : 'login.title'} components={{ accent: <span /> }} />}
        description={<p>{mode ? t(`setup.${mode}.intro`) : t('login.intro')}</p>}
      />
      <section className="cn-container cn-page-section">
        <div className="cn-account-layout">
          <div className="cn-account-panel">
            {mode ? (
              <>
                <PasswordSetupForm key={mode} mode={mode} email={email} onEmailChange={setEmail} />
                <p className="cn-account-switch">
                  {mode === 'signup' ? <>{t('setup.haveAccount')} </> : null}
                  <button type="button" className="cn-link-button" onClick={() => switchMode(null)}>
                    {mode === 'signup' ? t('setup.signIn') : <><Icon name="arrow-left" />{t('setup.backToLogin')}</>}
                  </button>
                </p>
              </>
            ) : (
              <PasswordLoginForm email={email} onEmailChange={setEmail} onForgot={() => switchMode('reset')} onSignup={() => switchMode('signup')} />
            )}
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
