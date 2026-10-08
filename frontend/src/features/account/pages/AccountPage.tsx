import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateView } from '@/components/ui/StateView'
import { AiAccountCard } from '@/features/ai'
import { SavedAccountCard } from '@/features/cloud'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { DeleteAccountSection } from '../components/DeleteAccountSection'
import { PlanSection } from '../components/PlanSection'
import { ProfileForm } from '../components/ProfileForm'
import { SecuritySection } from '../components/SecuritySection'
import { useLogout, useMe } from '../hooks/useAccount'
import { accountErrorCode } from '../utils/account-error'
import { loginPath } from '../utils/next-path'

export default function AccountPage() {
  const { t } = useTranslation('account')
  const { t: tSite } = useTranslation('site')
  usePageTitle(t('pages.tai-khoan.title'))
  const navigate = useNavigate()
  const me = useMe()
  const logout = useLogout()
  const user = me.data?.user
  const [deleted, setDeleted] = useState(false)

  // Sign-out and deletion also empty the session; both go home, not to the login page. Router
  // navigation commits in a transition, after the session reset has already re-rendered this page.
  if (me.data && !user && !deleted && (logout.isIdle || logout.isError)) return <Navigate to={loginPath('/tai-khoan')} replace />

  return (
    <div className="cn-site-page cn-account">
      <SitePageHero
        id="cn-account-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: t('account.trail') }]}
        title={<Trans ns="account" i18nKey="account.title" components={{ accent: <span /> }} />}
        description={user ? <p><Trans ns="account" i18nKey="account.signedInAs" values={{ email: user.email }} components={{ strong: <strong /> }} /></p> : null}
      />
      <section className="cn-container cn-page-section">
        {me.isError ? (
          <StateView
            icon="cloud-slash"
            tone="danger"
            title={t('account.loadFailed')}
            description={t(`errors.${accountErrorCode(me.error)}`)}
            actions={<button type="button" className="cn-button" onClick={() => void me.refetch()}>{t('account.retry')}</button>}
          />
        ) : !me.data || !user ? (
          <div className="cn-account-grid"><div className="cn-account-card"><Skeleton rows={5} /></div></div>
        ) : (
          <div className="cn-account-grid">
            <PlanSection account={me.data} email={user.email} />
            <div className="cn-account-stack">
              <section className="cn-account-card" aria-labelledby="cn-account-mine">
                <div className="cn-account-card__head"><h2 id="cn-account-mine">{t('account.mine.title')}</h2></div>
                <p className="cn-account-card__text">{t('account.mine.text')}</p>
                <Link className="cn-button cn-button--ghost" to="/de-xuat-cua-toi"><Icon name="list-check" />{t('account.mine.open')}</Link>
              </section>
              {me.data.plan.pro ? <AiAccountCard /> : null}
              <SavedAccountCard pro={me.data.plan.pro} />
              <ProfileForm key={user.id} user={user} />
              <SecuritySection user={user} />
              <section className="cn-account-card" aria-labelledby="cn-account-signout">
                <div className="cn-account-card__head"><h2 id="cn-account-signout">{t('account.signOut.title')}</h2></div>
                <p className="cn-account-card__text">{t('account.signOut.text')}</p>
                {logout.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(logout.error)}`)}</p> : null}
                <button
                  type="button"
                  className="cn-button cn-button--ghost"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
                >
                  <Icon name="box-arrow-right" />{logout.isPending ? t('account.signOut.busy') : t('account.signOut.button')}
                </button>
              </section>
              <DeleteAccountSection staff={Boolean(me.data.staff)} hasPassword={user.hasPassword} onDeleted={() => setDeleted(true)} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
