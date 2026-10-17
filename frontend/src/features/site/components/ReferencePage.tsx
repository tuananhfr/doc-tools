import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { HUB_NAVIGATION } from '../config/site-navigation'
import { DIRECTORY_GROUP_ICONS } from '../utils/directory-groups'
import { FAQ_ITEMS } from '../config/support-faq'
import { localizeFaq, pickFaq } from '../utils/faq'
import { DirectoryMascot } from './DirectoryMascot'
import { FaqList } from './FaqList'

export function CategoryNavigation({ current }: { current: string }) {
  const { t } = useTranslation('site')
  return <nav className="cn-reference-nav" aria-label={t('nav.groups')}><Link to="/cong-cu"><Icon name="grid" />{t('directoryStudio.all')}</Link>{HUB_NAVIGATION.map(slug => <Link to={`/${slug}`} key={slug} aria-current={current === slug ? 'page' : undefined}><Icon name={DIRECTORY_GROUP_ICONS[slug]} />{t(`hubs.${slug}.label`)}</Link>)}</nav>
}

export function ReferenceAside({ reference = false }: { reference?: boolean }) {
  const { t } = useTranslation('site')
  const count = useToolCatalog().filter(tool => tool.status === 'ready').length
  const faq = pickFaq(localizeFaq(t, FAQ_ITEMS), ['mien-phi', 'tai-khoan', 'luu-tep', 'offline'])
  return <>
    <section className="cn-reference-card cn-reference-count"><Icon name="graph-up-arrow" /><div><strong>{t('directoryStudio.ready', { count })}</strong><p>{t('pageStudio.countHint')}</p></div></section>
    <section className="cn-reference-card cn-reference-tip"><h2><Icon name="lightbulb-fill" />{t(reference ? 'pageStudio.referenceTitle' : 'directoryStudio.tipTitle')}</h2><p>{t(reference ? 'pageStudio.referenceHint' : 'pageStudio.tip')}</p></section>
    <section className="cn-reference-card"><h2><Icon name="question-circle-fill" />{t('pageStudio.faq')}</h2><FaqList items={faq} /><Link className="cn-reference-more" to="/ho-tro">{t('pageStudio.allFaq')}<Icon name="arrow-right" /></Link></section>
    <section className="cn-reference-card cn-reference-support"><h2><Icon name="headset" />{t('hub.support.title')}</h2><p>{t('hub.support.description')}</p><Link className="cn-button cn-button--ghost" to="/ho-tro">{t('pageStudio.support')}<Icon name="arrow-right" /></Link></section>
  </>
}

export function ReferenceDevices() {
  const { t } = useTranslation('site')
  return <section className="cn-reference-devices"><h2>{t('pageStudio.devices')}</h2><div>{[{ icon: 'laptop', name: 'PC / Laptop' }, { icon: 'tablet', name: 'Tablet' }, { icon: 'phone', name: 'Mobile' }, { icon: 'globe', name: 'Web' }].map(item => <span key={item.icon}><Icon name={item.icon} />{item.name}</span>)}</div><p>{t('directoryStudio.devicesHint')}</p></section>
}

export function ReferencePage({ title, subtitle, lead, icon, note, sidebar, search, children, reference = false }: { title: string; subtitle: string; lead?: string; icon: string; note: string; sidebar: ReactNode; search?: ReactNode; children: ReactNode; reference?: boolean }) {
  const { t } = useTranslation('site')
  return <div className="cn-site-page cn-reference-page"><div className="cn-reference-layout">
    <aside className="cn-reference-sidebar"><Link className="cn-reference-back" to="/cong-cu"><Icon name="arrow-left" />{t('pageStudio.back')}</Link>{sidebar}<div className="cn-reference-motto" aria-hidden="true"><Icon name="house-heart" /><p>{t('directoryStudio.smallThings')}</p><span>♡</span></div></aside>
    <div className="cn-reference-main"><nav className="cn-reference-breadcrumb" aria-label={t('breadcrumb.home')}><Link to="/">{t('breadcrumb.home')}</Link><Icon name="chevron-right" /><span>{title}</span></nav>
      <header className="cn-reference-hero"><div className="cn-reference-hero-copy"><span className="cn-reference-hero-icon"><Icon name={icon} /></span><div><h1>{title}</h1><p className="cn-reference-subtitle">{subtitle}</p>{lead ? <p className="cn-reference-lead">{lead}</p> : null}</div></div><div className="cn-reference-illustration" aria-hidden="true"><p>{note}<span>♡</span></p><DirectoryMascot /></div>{search}</header>
      {children}<ReferenceDevices />
    </div><aside className="cn-reference-aside"><ReferenceAside reference={reference} /></aside>
  </div></div>
}
