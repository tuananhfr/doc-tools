import Image from 'next/image'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { withBase } from '@/utils/url'
import type { HubAside as HubAsideItem } from '../types/hub-page.types'
import { PRODUCT_LINKS, SUPPORT_EMAIL } from '../config/site-navigation'

type Of<K extends HubAsideItem['kind']> = Extract<HubAsideItem, { kind: K }>

function ProductCard({ item }: { item: Of<'product'> }) {
  const erp = item.product === 'erpcons'
  return (
    <section className={`cn-hub-aside-card cn-hub-product cn-hub-product--${item.product}`}>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      {erp
        ? <Image className="cn-hub-product-logo" src={erpLogo} width={150} height={57} unoptimized alt="ERPCons Construction OS" />
        : <Image className="cn-hub-product-logo cn-hub-product-logo--tekshot" src={withBase('/logo-tekshot.png')} width={120} height={59} alt="Tekshot OS" />}
      <ul className="cn-hub-checks">{item.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
      <a className={`cn-button${erp ? ' cn-button--red' : ''}`} href={erp ? PRODUCT_LINKS.erpcons : PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">
        Tìm hiểu {erp ? 'ERPCons' : 'Tekshot OS'} <Icon name="arrow-up-right" />
      </a>
    </section>
  )
}

function SpotlightCard({ item }: { item: Of<'spotlight'> }) {
  const { base } = useToolsBranch()
  const tool = TOOL_CATALOG.find((entry) => entry.id === item.toolId)
  // Công cụ bị tắt bằng cờ thì bỏ cả thẻ giới thiệu, đừng để một nút dẫn về trang chủ.
  if (!tool || tool.status !== 'ready') return null
  return (
    <section className="cn-hub-aside-card cn-hub-spotlight">
      <span className="cn-hub-spotlight-icon" aria-hidden="true"><Icon name={tool.icon} /></span>
      <h2>{item.title}</h2>
      <p className="cn-hub-spotlight-subtitle">{item.subtitle}</p>
      <ul className="cn-hub-checks">{item.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
      <Link className="cn-button" to={toolPath(base, tool)}>Dùng ngay <Icon name="arrow-right" /></Link>
    </section>
  )
}

function TipsCard({ item }: { item: Of<'tips'> }) {
  return (
    <section className="cn-hub-aside-card cn-hub-tips">
      <h2><Icon name="lightbulb" />{item.title}</h2>
      <ol>{item.items.map((tip) => <li key={tip}>{tip}</li>)}</ol>
    </section>
  )
}

function PrivacyCard() {
  return (
    <section className="cn-hub-aside-card cn-hub-privacy">
      <h2><Icon name="shield-check" />Tệp của bạn được tôn trọng</h2>
      <p>Phần lớn công cụ xử lý ngay trên thiết bị. Công cụ nào cần máy chủ đều ghi rõ trên thẻ.</p>
      <Link to="/xu-ly-du-lieu">Xem cách chúng tôi xử lý dữ liệu <Icon name="arrow-right" /></Link>
    </section>
  )
}

function SupportCard() {
  return (
    <section className="cn-hub-aside-card cn-hub-support">
      <Icon name="headset" />
      <div>
        <h2>Cần hỗ trợ?</h2>
        <p>Xem hướng dẫn từng bước hoặc gửi thư cho chúng tôi.</p>
        <div className="cn-hub-support-links">
          <Link className="cn-button cn-button--ghost" to="/huong-dan">Xem hướng dẫn</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </section>
  )
}

export function HubAside({ items }: { items: readonly HubAsideItem[] }) {
  return (
    <aside className="cn-hub-aside" aria-label="Gợi ý thêm">
      {items.map((item, index) => {
        const key = `${item.kind}-${index}`
        switch (item.kind) {
          case 'product': return <ProductCard key={key} item={item} />
          case 'spotlight': return <SpotlightCard key={key} item={item} />
          case 'tips': return <TipsCard key={key} item={item} />
          case 'privacy': return <PrivacyCard key={key} />
          case 'support': return <SupportCard key={key} />
        }
      })}
    </aside>
  )
}
