import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import type { WorkspaceTabLink } from '../utils/workspace-tabs'

/**
 * Thanh tab giữa các công cụ cùng nhóm việc (tổng quát hoá `QrModeTabs` cũ). Mỗi tab là LINK tới slug
 * riêng chứ không phải trạng thái trong một màn: mỗi việc vẫn có đường dẫn để gửi người khác, và nút Quay
 * lại của trình duyệt đi đúng tab.
 */
export function WorkspaceTabs({ label, tabs }: { label: string; tabs: readonly WorkspaceTabLink[] }) {
  const active = useRef<HTMLAnchorElement>(null)
  const currentId = tabs.find((tab) => tab.current)?.toolId
  // Ở 360px tab đang mở có thể nằm ngoài khung cuộn ngang; kéo vào tầm nhìn, `nearest` để trang không nhảy dọc.
  useEffect(() => { active.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [currentId])
  return (
    <div className="cn-workspace-tabs-row">
      <nav className="erp-tool-tabs cn-workspace-tabs" aria-label={label}>
        {tabs.map((tab) => (
          <Link key={tab.toolId} ref={tab.current ? active : undefined} to={tab.to} className={`btn erp-tool-tab${tab.current ? ' is-active' : ''}`} aria-current={tab.current ? 'page' : undefined}>
            <Icon name={tab.icon} />
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}
