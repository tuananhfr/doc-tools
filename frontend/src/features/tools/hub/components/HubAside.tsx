import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { PRO_FEATURES } from '../config/pro-offer'
import { useTranslation } from 'react-i18next'
import { HUB_TIP_KEYS } from '../config/tool-catalog'
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
function tipOfToday(): (typeof HUB_TIP_KEYS)[number] {
  return HUB_TIP_KEYS[Math.floor(Date.now() / DAY_MS) % HUB_TIP_KEYS.length]
}

/** Cột phải của trang chọn công cụ. */
export function HubAside({ recent, guest }: HubAsideProps) {
  const [tip] = useState(tipOfToday)
  const { t } = useTranslation('catalog')
  const { t: tc } = useTranslation('common')
  const { base } = useToolsBranch()

  return (
    <aside className="erp-tools-aside" aria-label={tc('aside.label')}>
      {/* Thứ tự + `--wide` phục vụ lúc cột này rơi xuống dưới lưới thẻ: mỗi hàng phải
          KÍN bề ngang (gần đây · Pro · hai khối chữ chia đôi), không để một khối lẻ. */}
      <section className="erp-tools-panel erp-tools-panel--wide">
        <h2 className="erp-tools-panel__title">
          <Icon name="clock-history" />
          {tc('aside.recent')}
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
          <p className="erp-tools-panel__text">{tc('aside.recentEmpty')}</p>
        )}
      </section>

      {guest ? (
        <section className="erp-tools-panel erp-tools-panel--cta erp-tools-panel--wide erp-tools-pro">
          <div className="erp-tools-pro__intro">
            <h2 className="erp-tools-panel__title">
              <Icon name="stars" />
              ERPCons Pro
            </h2>
            <p className="erp-tools-panel__text">{tc('aside.proIntro')}</p>
          </div>
          <ul className="erp-tools-pro__list">
            {PRO_FEATURES.map((feature) => (
              <li key={feature}>
                <Icon name="check2" />
                {tc(`pro.features.${feature}`)}
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
          {tc('aside.about')}
        </h2>
        <p className="erp-tools-panel__text">
          {tc('aside.aboutText')}
        </p>
      </section>

      <section className="erp-tools-panel">
        <h2 className="erp-tools-panel__title">
          <Icon name="lightbulb" />
          {tc('aside.tips')}
        </h2>
        <p className="erp-tools-panel__text">{t(`tips.${tip}`)}</p>
      </section>
    </aside>
  )
}
