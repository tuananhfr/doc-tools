import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import type { ReadyTool } from '@/features/tools/hub/types/tool.types'
import { SitePageHero } from '../components/SitePageHero'
import { findGuide, GUIDES } from '../config/guides'
import { guideTitle } from '../utils/guide'

export default function GuidePage() {
  const guide = findGuide(useParams().guide)
  const { base } = useToolsBranch()
  usePageTitle(guide ? guideTitle(guide) : 'Hướng dẫn | Chuyện Nhỏ')
  if (!guide) return <Navigate to="/huong-dan" replace />

  // Công cụ bị tắt bằng cờ thì bỏ nút mở, bài vẫn đọc được.
  const tools = guide.toolIds.flatMap((id) => TOOL_CATALOG.find((tool): tool is ReadyTool => tool.id === id && tool.status === 'ready') ?? [])
  const primary = tools[0]
  const others = GUIDES.filter((item) => item.slug !== guide.slug && item.group === guide.group).concat(GUIDES.filter((item) => item.group !== guide.group)).slice(0, 3)
  const icon = TOOL_CATALOG.find((tool) => tool.id === guide.toolIds[0])?.icon ?? 'book'

  return (
    <div className="cn-site-page cn-guide">
      <SitePageHero
        id="cn-guide-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Hướng dẫn', to: '/huong-dan' }, { label: guide.title }]}
        title={guide.title}
        description={<p>{guide.intro}</p>}
        art={<span className="cn-page-hero-icon"><Icon name={icon} /></span>}
      >
        <p className="cn-guide-meta"><Icon name="clock" />{guide.minutes} phút<span aria-hidden="true">·</span>{guide.steps.length} bước</p>
        {primary ? <div className="cn-page-actions"><Link className="cn-button" to={toolPath(base, primary)}>Mở {primary.name} <Icon name="arrow-right" /></Link></div> : null}
      </SitePageHero>

      <div className="cn-container cn-guide-body">
        <article className="cn-guide-main">
          <section aria-labelledby="cn-guide-steps">
            <h2 id="cn-guide-steps">Các bước</h2>
            <ol className="cn-steps cn-guide-steps">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="cn-step-number" aria-hidden="true">{index + 1}</span>
                  <span><strong>{step.title}</strong><small>{step.detail}</small></span>
                </li>
              ))}
            </ol>
          </section>
          <section className="cn-guide-tips" aria-labelledby="cn-guide-tips">
            <h2 id="cn-guide-tips"><Icon name="lightbulb" />Mẹo</h2>
            <ul className="cn-hub-checks">{guide.tips.map((tip) => <li key={tip}><Icon name="check-circle-fill" />{tip}</li>)}</ul>
          </section>
          <section className="cn-page-callout cn-guide-notes" aria-labelledby="cn-guide-notes">
            <Icon name="info-circle" />
            <div>
              <h2 id="cn-guide-notes">Cần lưu ý</h2>
              <ul>{guide.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          </section>
        </article>

        <aside className="cn-guide-aside" aria-label="Liên quan">
          {tools.length > 0 ? (
            <section className="cn-hub-aside-card">
              <h2>Công cụ trong bài</h2>
              <ul className="cn-guide-links">
                {tools.map((tool) => <li key={tool.id}><Link to={toolPath(base, tool)}><Icon name={tool.icon} /><span>{tool.name}</span><Icon name="arrow-right" /></Link></li>)}
              </ul>
            </section>
          ) : null}
          <section className="cn-hub-aside-card">
            <h2>Bài khác</h2>
            <ul className="cn-guide-links">
              {others.map((item) => <li key={item.slug}><Link to={`/huong-dan/${item.slug}`}><Icon name="book" /><span>{item.title}</span><Icon name="arrow-right" /></Link></li>)}
            </ul>
            <Link className="cn-guide-all" to="/huong-dan">Xem tất cả hướng dẫn <Icon name="arrow-right" /></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
