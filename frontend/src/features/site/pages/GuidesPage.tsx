import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { SitePageHero } from '../components/SitePageHero'
import { GUIDE_GROUPS, GUIDES, type GuideGroupId } from '../config/guides'
import { SITE_PAGE_META } from '../config/site-pages'

type GroupFilter = GuideGroupId | 'all'

const GROUP_LABEL = new Map(GUIDE_GROUPS.map((group) => [group.id, group.label]))
const iconOf = (toolId: string) => TOOL_CATALOG.find((tool) => tool.id === toolId)?.icon ?? 'book'

export default function GuidesPage() {
  usePageTitle(SITE_PAGE_META['huong-dan'].title)
  const [group, setGroup] = useState<GroupFilter>('all')
  const guides = useMemo(() => group === 'all' ? GUIDES : GUIDES.filter((guide) => guide.group === group), [group])
  const chips = [{ id: 'all' as const, label: 'Tất cả', count: GUIDES.length }, ...GUIDE_GROUPS.map((item) => ({ id: item.id, label: item.label, count: GUIDES.filter((guide) => guide.group === item.id).length }))]

  return (
    <div className="cn-site-page cn-guides">
      <SitePageHero
        id="cn-guides-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Hướng dẫn' }]}
        title={<>Hướng dẫn <span>sử dụng</span></>}
        tagline="Từng bước ngắn, đúng chữ trên màn hình."
        description={<p>Mỗi bài chỉ vài phút đọc. Làm theo từng bước là xong việc, kèm mẹo và những điều cần lưu ý.</p>}
        caption={'Đọc 2 phút,\nlàm ngay!'}
        art={<span className="cn-page-hero-icon"><Icon name="book" /></span>}
      />

      <section className="cn-container cn-page-section" aria-labelledby="cn-guides-list">
        <h2 id="cn-guides-list" className="visually-hidden">Danh sách bài hướng dẫn</h2>
        <div className="cn-tool-filters cn-hub-filters" role="group" aria-label="Lọc theo nhóm">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className={`cn-filter${chip.id === group ? ' is-active' : ''}`} aria-pressed={chip.id === group} onClick={() => setGroup(chip.id)}>
              {chip.label} <span className="cn-filter-count">({chip.count})</span>
            </button>
          ))}
        </div>
        <ul className="cn-guide-grid">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <article className="cn-guide-card">
                <span className="cn-guide-card-icon" aria-hidden="true"><Icon name={iconOf(guide.toolIds[0])} /></span>
                <p className="cn-guide-card-group">{GROUP_LABEL.get(guide.group)}</p>
                <h3><Link to={`/huong-dan/${guide.slug}`}>{guide.title}</Link></h3>
                <p>{guide.summary}</p>
                <p className="cn-guide-meta"><Icon name="clock" />{guide.minutes} phút<span aria-hidden="true">·</span>{guide.steps.length} bước</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="cn-container cn-page-section">
        <div className="cn-page-callout">
          <Icon name="question-circle" />
          <div>
            <h2>Chưa thấy bài bạn cần?</h2>
            <p>Xem <Link to="/ho-tro">câu hỏi thường gặp</Link>, cách <Link to="/cai-dat">cài Chuyện Nhỏ lên thiết bị</Link>, hoặc gửi đề xuất bài hướng dẫn mới qua <Link to="/de-xuat-tien-ich">Đề xuất tiện ích</Link>.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
