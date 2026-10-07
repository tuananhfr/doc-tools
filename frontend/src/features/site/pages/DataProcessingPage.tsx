import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { TOOL_FILTERS } from '@/features/tools/hub/config/tool-catalog'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { FaqList } from '../components/FaqList'
import { SitePageHero } from '../components/SitePageHero'
import { ToolSearch } from '../components/ToolSearch'
import { QualityConsent } from '../components/QualityConsent'
import { LEGAL_DRAFT } from '../config/legal'
import { DATA_FAQ_IDS, FAQ_ITEMS } from '../config/support-faq'
import { filterProcessingRows, PROCESSING_FILTERS, processingRows, type ProcessingFilter, type ProcessingMode } from '../utils/data-processing'
import { localizeFaq, pickFaq } from '../utils/faq'

const MODE_ICON: Record<ProcessingMode, string> = { device: 'check-circle-fill', model: 'cpu', server: 'cloud-arrow-up' }

export default function DataProcessingPage() {
  const { t: tc } = useTranslation('catalog')
  const { t } = useTranslation('site')
  usePageTitle(t('pages.xu-ly-du-lieu.title'))
  const { base } = useToolsBranch()
  const catalog = useToolCatalog()
  const allRows = useMemo(() => processingRows(catalog, new Map(TOOL_FILTERS.map((value) => [value as string, tc(`groups.${value}`)]))), [catalog, tc])
  const dataFaq = useMemo(() => localizeFaq(t, pickFaq(FAQ_ITEMS, DATA_FAQ_IDS)), [t])
  const deviceReady = allRows.filter((row) => row.tool.status === 'ready' && row.mode !== 'server').length
  const serverSoon = allRows.filter((row) => row.mode === 'server').length
  const [filter, setFilter] = useState<ProcessingFilter>('all')
  const [keyword, setKeyword] = useState('')
  const rows = useMemo(() => filterProcessingRows(allRows, filter, keyword), [allRows, filter, keyword])

  const columns = [
    {
      icon: 'laptop', tone: 'device', title: t('data.columns.device.title'), lead: t('data.columns.device.lead', { count: deviceReady }),
      points: [t('data.columns.device.points.tab'), t('data.columns.device.points.download'), t('data.columns.device.points.model')],
    },
    {
      icon: 'cloud-arrow-up', tone: 'server', title: t('data.columns.server.title'), lead: t('data.columns.server.lead'),
      points: [
        t('data.columns.server.points.visits'),
        t('data.columns.server.points.ip'),
        t('data.columns.server.points.feedback'),
        t('data.columns.server.points.account'),
        t('data.columns.server.points.pro'),
        ...(serverSoon ? [t('data.columns.server.points.soon', { count: serverSoon })] : []),
      ],
    },
    {
      icon: 'hdd', tone: 'local', title: t('data.columns.local.title'), lead: t('data.columns.local.lead'),
      points: [t('data.columns.local.points.prefs'), t('data.columns.local.points.saved'), t('data.columns.local.points.clear')],
    },
  ] as const
  const filterLabel = (value: ProcessingFilter) => value === 'all' ? t('filters.all') : value === 'model' ? t('data.modelFilter') : t(`data.modes.${value}`)

  return (
    <div className="cn-site-page cn-data">
      <SitePageHero
        id="cn-data-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('data.trail') }]}
        title={<Trans ns="site" i18nKey="data.title" components={{ accent: <span /> }} />}
        tagline={t('data.tagline')}
        description={(
          <>
            <p>{t('data.intro')}</p>
            {LEGAL_DRAFT ? <p className="cn-legal-draft"><Icon name="hourglass-split" />{t('data.draftNotice')}</p> : null}
          </>
        )}
        caption={t('data.caption')}
        art={<span className="cn-page-hero-icon"><Icon name="shield-lock" /></span>}
      >
        <ul className="cn-page-points">
          <li><Icon name="cookie" />{t('data.points.noCookie')}</li>
          <li><Icon name="eye-slash" />{t('data.points.noTracking')}</li>
          <li><Icon name="person-x" />{t('data.points.noAccount')}</li>
        </ul>
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-label={t('data.flowLabel')}>
        <QualityConsent disclosure />
        <ul className="cn-data-columns">
          {columns.map((column) => (
            <li key={column.tone} className={`cn-data-column cn-data-column--${column.tone}`}>
              <Icon name={column.icon} />
              <h2>{column.title}</h2>
              <p>{column.lead}</p>
              <ul className="cn-hub-checks">{column.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-data-table-title">
        <h2 id="cn-data-table-title">{t('data.tableTitle')}</h2>
        <p className="cn-section-description">{t('data.tableDescription')}</p>
        <div className="cn-data-toolbar">
          <ToolSearch id="tim-xu-ly" keyword={keyword} onKeyword={setKeyword} placeholder={t('data.searchPlaceholder')} />
          <div className="cn-tool-filters cn-hub-filters" role="group" aria-label={t('data.filterLabel')}>
            {PROCESSING_FILTERS.map((value) => (
              <button key={value} type="button" className={`cn-filter${value === filter ? ' is-active' : ''}`} aria-pressed={value === filter} onClick={() => setFilter(value)}>
                {filterLabel(value)}
              </button>
            ))}
          </div>
        </div>
        <p className="cn-results-count" role="status">{t('results.count', { count: rows.length })}</p>
        {rows.length > 0 ? (
          <div className="cn-data-table-wrap">
            <table className="cn-data-table">
              <thead><tr><th scope="col">{t('data.head.tool')}</th><th scope="col">{t('data.head.group')}</th><th scope="col">{t('data.head.where')}</th><th scope="col">{t('data.head.note')}</th></tr></thead>
              <tbody>
                {rows.map(({ tool, group, mode, note, defaultNote }) => (
                  <tr key={tool.id}>
                    <th scope="row">
                      {tool.status === 'ready'
                        ? <Link to={toolPath(base, tool)}>{tool.name}</Link>
                        : <span>{tool.name} <small className="cn-soon-tag">{t('toolCard.soon')}</small></span>}
                    </th>
                    <td data-label={t('data.head.group')}>{group}</td>
                    <td data-label={t('data.head.where')}><span className={`cn-processing cn-processing--${mode === 'server' ? 'server' : 'device'}`}><Icon name={MODE_ICON[mode]} />{t(`data.modes.${mode}`)}</span></td>
                    <td data-label={t('data.head.note')}>{note ?? t(`data.notes.${defaultNote}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateView icon="search" title={t('results.empty')} description={t('data.emptyHint')} actions={<button type="button" className="cn-button" onClick={() => { setKeyword(''); setFilter('all') }}>{t('data.showAll')}</button>} />
        )}
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-data-faq">
        <h2 id="cn-data-faq">{t('data.faqTitle')}</h2>
        <p className="cn-section-description"><Trans ns="site" i18nKey="data.faqDescription" components={{ link: <Link to="/quyen-rieng-tu" /> }} /></p>
        <FaqList items={dataFaq} />
      </section>
    </div>
  )
}
