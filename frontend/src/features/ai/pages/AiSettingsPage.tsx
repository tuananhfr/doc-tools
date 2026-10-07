import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateView } from '@/components/ui/StateView'
import { loginPath, useMe } from '@/features/account'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { ProInvite } from '../components/ProInvite'
import { ProviderForm } from '../components/ProviderForm'
import { AI_SETTINGS_PATH } from '../config/ai-routes'
import { useAiSetup } from '../hooks/useAiSetup'
import { AiError } from '../services/ai.service'

const ASSISTANT_PATH = '/tro-ly'

export default function AiSettingsPage() {
  const { t } = useTranslation('ai')
  const { t: tSite } = useTranslation('site')
  const { t: tAccount } = useTranslation('account')
  usePageTitle(t('pages.tai-khoan-ai.title'))
  const me = useMe()
  const user = me.data?.user
  const pro = Boolean(me.data?.plan.pro)
  const setup = useAiSetup(Boolean(user) && pro)

  if (me.data && !user) return <Navigate to={loginPath(AI_SETTINGS_PATH)} replace />

  const ready = setup.data?.provider?.status === 'ready' && setup.data.agent?.status === 'active'
  let body
  if (!me.data) body = <div className="cn-account-card"><Skeleton rows={5} /></div>
  else if (!pro) body = <ProInvite signedIn loginTo={loginPath(AI_SETTINGS_PATH)} />
  else if (setup.isError) {
    body = (
      <StateView
        icon="cloud-slash"
        tone="danger"
        title={t(`errors.${setup.error instanceof AiError ? setup.error.code : 'UNKNOWN'}`)}
        actions={<button type="button" className="cn-button" onClick={() => void setup.refetch()}>{t('chat.retry')}</button>}
      />
    )
  } else if (!setup.data) body = <div className="cn-account-card"><Skeleton rows={5} /></div>
  else if (!setup.data.available) body = <StateView icon="plug" title={t('settings.unavailable')} />
  else {
    body = (
      <div className="cn-ai-settings">
        <ProviderForm setup={setup.data} />
        {ready ? (
          <aside className="cn-ai-settings__ready" role="status">
            <Icon name="check-circle-fill" />
            <p>{t('provider.verified')}</p>
            <Link className="cn-button" to={ASSISTANT_PATH}><Icon name="chat-dots" />{t('settings.openChat')}</Link>
          </aside>
        ) : null}
      </div>
    )
  }

  return (
    <div className="cn-site-page cn-account cn-ai">
      <SitePageHero
        id="cn-ai-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: tAccount('account.trail'), to: '/tai-khoan' }, { label: t('settings.trail') }]}
        title={<Trans ns="ai" i18nKey="settings.title" components={{ accent: <span /> }} />}
        description={<p>{t('settings.intro')}</p>}
      />
      <section className="cn-container cn-page-section">{body}</section>
    </div>
  )
}
