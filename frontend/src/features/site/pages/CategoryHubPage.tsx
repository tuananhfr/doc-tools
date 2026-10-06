import { useMemo } from 'react'
import { StateView } from '@/components/ui/StateView'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { HUB_PAGES } from '../config/hub-pages'
import { ALL_SUBGROUPS, useHubSearch } from '../hooks/useHubSearch'
import { resolveHubTools } from '../utils/hub-tools'
import type { HubPageSlug } from '../types/hub-page.types'
import { HubAside } from '../components/HubAside'
import { HubHero } from '../components/HubHero'
import { HubJourney } from '../components/HubJourney'
import { HubToolCard } from '../components/HubToolCard'
import { ToolSearch } from '../components/ToolSearch'

export default function CategoryHubPage({ slug }: { slug: HubPageSlug }) {
  const page = HUB_PAGES[slug]
  const hub = useMemo(() => resolveHubTools(page, TOOL_CATALOG), [page])
  const { groupId, keyword, tools, onGroup, onKeyword, reset } = useHubSearch(hub)
  const resultsId = `cn-hub-results-${slug}`
  usePageTitle(page.metaTitle)

  const chips = [{ id: ALL_SUBGROUPS, label: 'Tất cả', count: hub.all.length }, ...hub.groups.map((group) => ({ id: group.id, label: group.label, count: group.tools.length }))]

  return (
    <div className="cn-site-page cn-hub">
      <HubHero page={page} />
      <div className="cn-container cn-hub-body">
        <section className="cn-hub-main" aria-label={`Danh sách ${page.label.toLowerCase()}`}>
          <ToolSearch id={`tim-${slug}`} keyword={keyword} onKeyword={onKeyword} placeholder={page.searchPlaceholder} onSubmit={() => document.getElementById(resultsId)?.focus()} />
          <div className="cn-tool-filters cn-hub-filters" role="group" aria-label="Lọc theo nhóm con">
            {chips.map((chip) => (
              <button key={chip.id} type="button" className={`cn-filter${chip.id === groupId ? ' is-active' : ''}`} aria-pressed={chip.id === groupId} onClick={(event) => { onGroup(chip.id); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>
                {chip.label} <span className="cn-filter-count">({chip.count})</span>
              </button>
            ))}
          </div>
          <p id={resultsId} className="cn-results-count" tabIndex={-1} role="status">
            {tools.length} công cụ{keyword ? ` cho “${keyword}”` : ''}
          </p>
          {tools.length > 0 ? (
            <ul className="cn-hub-grid">{tools.map((tool) => <li key={tool.id}><HubToolCard tool={tool} /></li>)}</ul>
          ) : (
            <StateView icon="search" title="Không tìm thấy công cụ nào" description="Thử từ khoá khác hoặc bỏ lọc nhóm con." actions={<button type="button" className="cn-button" onClick={reset}>Xem cả nhóm</button>} />
          )}
        </section>
        <HubAside items={page.aside} />
      </div>
      <HubJourney journey={page.journey} />
    </div>
  )
}
