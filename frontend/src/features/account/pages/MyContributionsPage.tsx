import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateView } from '@/components/ui/StateView'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'
import { MyContributionItem } from '../components/MyContributionItem'
import { useMe, useMyContributions } from '../hooks/useAccount'
import { accountErrorCode } from '../utils/account-error'
import { loginPath } from '../utils/next-path'

const SELF = '/de-xuat-cua-toi'

function pageFrom(raw: string | null) {
  const page = Number(raw ?? 1)
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1
}

export default function MyContributionsPage() {
  const { t } = useTranslation('account')
  const { t: tSite } = useTranslation('site')
  usePageTitle(t('pages.de-xuat-cua-toi.title'))
  const [params, setParams] = useSearchParams()
  const page = pageFrom(params.get('page'))
  const me = useMe()
  const user = me.data?.user
  const list = useMyContributions(page, Boolean(user))
  const catalog = useToolCatalog()
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1
  const goTo = (next: number) => setParams(next === 1 ? {} : { page: String(next) })

  if (me.data && !user) return <Navigate to={loginPath(SELF)} replace />

  return (
    <div className="cn-site-page cn-account">
      <SitePageHero
        id="cn-mine-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: t('account.trail'), to: '/tai-khoan' }, { label: t('mine.trail') }]}
        title={<Trans ns="account" i18nKey="mine.title" components={{ accent: <span /> }} />}
        description={user ? <p>{t('mine.intro')}</p> : null}
      >
        <div className="cn-mine-actions">
          <Link className="cn-button" to="/de-xuat-tien-ich"><Icon name="lightbulb" />{t('mine.newIdea')}</Link>
          <Link className="cn-button cn-button--ghost" to="/gop-y-quy-dinh"><Icon name="chat-left-text" />{t('mine.newRegulation')}</Link>
        </div>
      </SitePageHero>
      <section className="cn-container cn-page-section" aria-labelledby="cn-mine-title">
        {me.isError || list.isError ? (
          <StateView
            icon="cloud-slash"
            tone="danger"
            title={t('mine.loadFailed')}
            description={t(`errors.${accountErrorCode(me.error ?? list.error)}`)}
            actions={<button type="button" className="cn-button" onClick={() => void (me.isError ? me.refetch() : list.refetch())}>{t('account.retry')}</button>}
          />
        ) : !list.data ? (
          <div className="cn-contribution-list"><div className="cn-contribution"><Skeleton rows={4} /></div><div className="cn-contribution"><Skeleton rows={4} /></div></div>
        ) : !list.data.total ? (
          <StateView icon="inbox" title={t('mine.empty.title')} description={t('mine.empty.text')} />
        ) : (
          <>
            <p className="cn-mine-summary">{t('mine.summary', { total: list.data.total })}</p>
            <div className="cn-contribution-list">
              {list.data.items.map((item) => (
                <MyContributionItem key={item.id} item={item} toolName={findToolBySlug(item.toolId, catalog)?.name ?? null} />
              ))}
            </div>
            {pages > 1 ? (
              <nav className="cn-mine-pager" aria-label={t('mine.pager')}>
                <button type="button" className="cn-button cn-button--ghost" disabled={page <= 1} onClick={() => goTo(page - 1)}><Icon name="chevron-left" />{t('mine.prev')}</button>
                <span>{t('mine.pageOf', { page, pages })}</span>
                <button type="button" className="cn-button cn-button--ghost" disabled={page >= pages} onClick={() => goTo(page + 1)}>{t('mine.next')}<Icon name="chevron-right" /></button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
