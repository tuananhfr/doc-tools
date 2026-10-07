import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateView } from '@/components/ui/StateView'
import { loginPath, useMe } from '@/features/account'
import { SitePageHero } from '@/features/site/components/SitePageHero'
import { toolPath, useToolsBranch } from '@/features/tools/hub'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'
import { formatFileSize } from '@/utils/format'
import { SavedResultRow } from '../components/SavedResultRow'
import { SourceCheckHistory } from '../components/SourceCheckHistory'
import { SAVED_PAGE_PATH } from '../config/cloud-routes'
import { useSavedItems, useToggleBookmark } from '../hooks/useSavedItems'
import { CloudError } from '../services/cloud.service'
import { savedDay, savedItemPath } from '../utils/saved-format'

export default function SavedPage() {
  const { t } = useTranslation('cloud')
  const { t: tSite } = useTranslation('site')
  const { t: tAccount } = useTranslation('account')
  usePageTitle(t('pages.tai-khoan-da-luu.title'))
  const me = useMe()
  const user = me.data?.user
  const pro = Boolean(me.data?.plan.pro)
  const saved = useSavedItems(Boolean(user))
  const unstar = useToggleBookmark()
  const catalog = useToolCatalog()
  const { base } = useToolsBranch()

  if (me.data && !user) return <Navigate to={loginPath(SAVED_PAGE_PATH)} replace />

  const items = saved.data?.items ?? []
  const bookmarks = items.filter((item) => item.kind === 'bookmark')
  const results = items.filter((item) => item.kind === 'result')
  const writable = Boolean(saved.data?.writable)

  let body
  if (saved.isError) {
    body = (
      <StateView
        icon="cloud-slash"
        tone="danger"
        title={t(`errors.${saved.error instanceof CloudError ? saved.error.code : 'UNKNOWN'}`)}
        actions={<button type="button" className="cn-button" onClick={() => void saved.refetch()}>{t('page.retry')}</button>}
      />
    )
  } else if (!me.data || !saved.data) {
    body = <div className="cn-account-card"><Skeleton rows={6} /></div>
  } else if (!pro && !items.length) {
    body = (
      <StateView
        icon="cloud-check"
        title={t('page.invite.title')}
        description={t('page.invite.text')}
        actions={<Link className="cn-button" to="/tai-khoan"><Icon name="stars" />{t('page.invite.action')}</Link>}
      />
    )
  } else {
    const { usage } = saved.data
    const share = Math.min(100, Math.round(Math.max(usage.items / usage.maxItems, usage.bytes / usage.maxBytes) * 100))
    body = (
      <div className="cn-saved">
        {!writable ? (
          <p className="cn-saved-readonly" role="status">
            <Icon name="lock" />
            <span>{t('page.readOnly')}{saved.data.purgeAt ? <> <strong>{t('page.purgeOn', { date: savedDay(saved.data.purgeAt) })}</strong></> : null}</span>
          </p>
        ) : null}

        <div className="cn-saved-usage">
          <div className="cn-saved-usage__text">
            <strong>{t('page.usageItems', { used: usage.items, max: usage.maxItems })}</strong>
            <span>{t('page.usageBytes', { used: formatFileSize(usage.bytes), max: formatFileSize(usage.maxBytes) })}</span>
          </div>
          <div className="cn-saved-usage__bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} aria-label={t('page.usageLabel')}>
            <span style={{ width: `${share}%` }} />
          </div>
          <p className="cn-saved-usage__sync"><Icon name="arrow-repeat" />{t('page.syncNote')}</p>
        </div>

        <section className="cn-saved-section" aria-labelledby="cn-saved-favourites">
          <h2 id="cn-saved-favourites"><Icon name="star" />{t('page.favourites')}<span className="cn-saved-count">{bookmarks.length}</span></h2>
          {bookmarks.length ? (
            <ul className="cn-saved-favourites">
              {bookmarks.map((item) => {
                const tool = findToolBySlug(item.toolId, catalog)
                return (
                  <li key={item.id}>
                    {tool ? <Link to={toolPath(base, tool)}><Icon name={tool.icon} /><span>{tool.name}</span></Link> : <span className="is-gone"><Icon name="question-circle" />{t('page.unknownTool')}</span>}
                    <button
                      type="button"
                      className="cn-icon-button"
                      aria-label={t('page.unstar', { tool: tool?.name ?? item.toolId })}
                      disabled={unstar.isPending}
                      onClick={() => unstar.mutate({ toolId: item.toolId, on: false })}
                    >
                      <Icon name="star-fill" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : <p className="cn-saved-empty">{writable ? t('page.noFavourites') : t('page.noFavouritesReadOnly')}</p>}
        </section>

        <section className="cn-saved-section" aria-labelledby="cn-saved-results">
          <h2 id="cn-saved-results"><Icon name="cloud-check" />{t('page.results')}<span className="cn-saved-count">{results.length}</span></h2>
          {results.length ? (
            <ul className="cn-saved-list">
              {results.map((item) => {
                const tool = findToolBySlug(item.toolId, catalog)
                return <SavedResultRow key={item.id} item={item} toolName={tool?.name ?? null} toolIcon={tool?.icon ?? null} openTo={tool ? savedItemPath(toolPath(base, tool), item.id) : null} writable={writable} />
              })}
            </ul>
          ) : <p className="cn-saved-empty">{t('page.noResults')}</p>}
        </section>

        <section className="cn-saved-section" aria-labelledby="cn-saved-history">
          <h2 id="cn-saved-history"><Icon name="clock-history" />{t('history.title')}</h2>
          <p className="cn-saved-section__text">{t('history.text')}</p>
          <SourceCheckHistory catalog={catalog} />
        </section>
      </div>
    )
  }

  return (
    <div className="cn-site-page cn-account cn-saved-page">
      <SitePageHero
        id="cn-saved-title"
        trail={[{ label: tSite('breadcrumb.home'), to: '/' }, { label: tAccount('account.trail'), to: '/tai-khoan' }, { label: t('page.trail') }]}
        title={<Trans ns="cloud" i18nKey="page.title" components={{ accent: <span /> }} />}
        description={<p>{t('page.intro')}</p>}
      />
      <section className="cn-container cn-page-section">{body}</section>
    </div>
  )
}
