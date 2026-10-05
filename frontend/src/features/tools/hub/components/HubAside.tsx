import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { PRO_FEATURES } from '../config/pro-offer'
import { HUB_TIPS } from '../config/tool-catalog'
import { useToolsBranch } from '../hooks/tools-branch'
import type { ToolDefinition } from '../types/tool.types'
import { toolPath } from '../utils/tool-lookup'
import { ProContactButton } from './ProContactButton'
import { ToolTile } from './ToolTile'

interface HubAsideProps {
  recent: ToolDefinition[]
  /** Khách chưa đăng nhập mới thấy thẻ ERPCons Pro. */
  guest: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Mỗi ngày một mẹo: đổi theo từng lần mở trang thì người dùng không kịp đọc lại. */
function tipOfToday(): string {
  return HUB_TIPS[Math.floor(Date.now() / DAY_MS) % HUB_TIPS.length]
}

/** Cột phải của trang chọn công cụ. */
export function HubAside({ recent, guest }: HubAsideProps) {
  const [tip] = useState(tipOfToday)
  const { base } = useToolsBranch()

  return (
    <aside className="erp-tools-aside" aria-label="Thông tin thêm">
      {/* Thứ tự + `--wide` phục vụ lúc cột này rơi xuống dưới lưới thẻ: mỗi hàng phải
          KÍN bề ngang (gần đây · Pro · hai khối chữ chia đôi), không để một khối lẻ. */}
      <section className="erp-tools-panel erp-tools-panel--wide">
        <h2 className="erp-tools-panel__title">
          <Icon name="clock-history" />
          Dùng gần đây
        </h2>
        {recent.length > 0 ? (
          <ul className="erp-tools-recent">
            {recent.map((tool) => (
              <li key={tool.id}>
                <Link className="erp-tools-recent__item" to={toolPath(base, tool)}>
                  <ToolTile tool={tool} small />
                  <span className="erp-tools-recent__name">{tool.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="erp-tools-panel__text">Chưa dùng công cụ nào trên máy này. Công cụ bạn mở sẽ hiện ở đây.</p>
        )}
      </section>

      {guest ? (
        <section className="erp-tools-panel erp-tools-panel--cta erp-tools-panel--wide erp-tools-pro">
          <div className="erp-tools-pro__intro">
            <h2 className="erp-tools-panel__title">
              <Icon name="stars" />
              ERPCons Pro
            </h2>
            <p className="erp-tools-panel__text">Khi việc nhỏ thành hồ sơ dự án:</p>
          </div>
          <ul className="erp-tools-pro__list">
            {PRO_FEATURES.map((feature) => (
              <li key={feature}>
                <Icon name="check2" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="erp-tools-pro__actions">
            <ProContactButton className="erp-tools-panel__action" />
          </div>
        </section>
      ) : null}

      <section className="erp-tools-panel">
        <h2 className="erp-tools-panel__title">
          <Icon name="shield-check" />
          Về Chuyện Nhỏ
        </h2>
        <p className="erp-tools-panel__text">
          Bộ công cụ miễn phí từ ERPCons, giúp bạn xử lý nhanh những việc nhỏ trong công việc hàng ngày. Tệp được xử lý ngay trên máy bạn, không tải lên máy chủ.
        </p>
      </section>

      <section className="erp-tools-panel">
        <h2 className="erp-tools-panel__title">
          <Icon name="lightbulb" />
          Mẹo nhanh
        </h2>
        <p className="erp-tools-panel__text">{tip}</p>
      </section>
    </aside>
  )
}
