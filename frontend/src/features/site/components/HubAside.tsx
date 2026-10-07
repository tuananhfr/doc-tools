import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { withBase } from '@/utils/url'
import type { HubAside as HubAsideItem, HubPageText } from '../types/hub-page.types'
import { PRODUCT_LINKS, SUPPORT_EMAIL } from '../config/site-navigation'

type Of<K extends HubAsideItem['kind']> = Extract<HubAsideItem, { kind: K }>
type AsideText = HubPageText['aside'][string]

function ProductCard({ item, text }: { item: Of<'product'>; text: AsideText }) {
  const { t } = useTranslation('site')
  const erp = item.product === 'erpcons'
  return (
    <section className={`cn-hub-aside-card cn-hub-product cn-hub-product--${item.product}`}>
      <h2>{text.title}</h2>
      <p>{text.description}</p>
      {erp
        ? <Image className="cn-hub-product-logo" src={erpLogo} width={150} height={57} unoptimized alt="ERPCons Construction OS" />
        : <>
            <Image className="cn-hub-product-logo cn-hub-product-logo--light" src={withBase('/brand/tekshot-ai-logo-light.webp')} width={440} height={162} alt="TekShot AI" />
            <Image className="cn-hub-product-logo cn-hub-product-logo--dark" src={withBase('/brand/tekshot-ai-logo-dark.webp')} width={600} height={223} alt="TekShot AI" />
          </>}
      <ul className="cn-hub-checks">{item.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{text.points?.[point]}</li>)}</ul>
      <a className={`cn-button${erp ? ' cn-button--red' : ''}`} href={erp ? PRODUCT_LINKS.erpcons : PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">
        {t('products.learnMore', { product: erp ? 'ERPCons' : 'TekShot AI' })} <Icon name="arrow-up-right" />
      </a>
    </section>
  )
}

function SpotlightCard({ item, text }: { item: Of<'spotlight'>; text: AsideText }) {
  const { t } = useTranslation('site')
  const { base } = useToolsBranch()
  const tool = TOOL_CATALOG.find((entry) => entry.id === item.toolId)
  // Công cụ bị tắt bằng cờ thì bỏ cả thẻ giới thiệu, đừng để một nút dẫn về trang chủ.
  if (!tool || tool.status !== 'ready') return null
  return (
    <section className="cn-hub-aside-card cn-hub-spotlight">
      <span className="cn-hub-spotlight-icon" aria-hidden="true"><Icon name={tool.icon} /></span>
      <h2>{text.title}</h2>
      <p className="cn-hub-spotlight-subtitle">{text.subtitle}</p>
      <ul className="cn-hub-checks">{item.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{text.points?.[point]}</li>)}</ul>
      <Link className="cn-button" to={toolPath(base, tool)}>{t('toolCard.useNow')} <Icon name="arrow-right" /></Link>
    </section>
  )
}

function TipsCard({ item, text }: { item: Of<'tips'>; text: AsideText }) {
  return (
    <section className="cn-hub-aside-card cn-hub-tips">
      <h2><Icon name="lightbulb" />{text.title}</h2>
      <ol>{item.items.map((tip) => <li key={tip}>{text.items?.[tip]}</li>)}</ol>
    </section>
  )
}

function PrivacyCard() {
  const { t } = useTranslation('site')
  return (
    <section className="cn-hub-aside-card cn-hub-privacy">
      <h2><Icon name="shield-check" />{t('hub.privacy.title')}</h2>
      <p>{t('hub.privacy.description')}</p>
      <Link to="/xu-ly-du-lieu">{t('hub.privacy.link')} <Icon name="arrow-right" /></Link>
    </section>
  )
}

function SupportCard() {
  const { t } = useTranslation('site')
  return (
    <section className="cn-hub-aside-card cn-hub-support">
      <Icon name="headset" />
      <div>
        <h2>{t('hub.support.title')}</h2>
        <p>{t('hub.support.description')}</p>
        <div className="cn-hub-support-links">
          <Link className="cn-button cn-button--ghost" to="/huong-dan">{t('hub.support.guides')}</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </section>
  )
}

export function HubAside({ items, text }: { items: readonly HubAsideItem[]; text: HubPageText['aside'] }) {
  const { t } = useTranslation('site')
  return (
    <aside className="cn-hub-aside" aria-label={t('hub.asideLabel')}>
      {items.map((item, index) => {
        const key = `${item.kind}-${index}`
        switch (item.kind) {
          case 'product': return <ProductCard key={key} item={item} text={text[item.id]} />
          case 'spotlight': return <SpotlightCard key={key} item={item} text={text[item.id]} />
          case 'tips': return <TipsCard key={key} item={item} text={text[item.id]} />
          case 'privacy': return <PrivacyCard key={key} />
          case 'support': return <SupportCard key={key} />
        }
      })}
    </aside>
  )
}
