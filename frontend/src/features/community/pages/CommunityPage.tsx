import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { ContributionForm } from '../components/ContributionForm'
import { PublishedIdeas } from '../components/PublishedIdeas'
import { ReceiptTracker } from '../components/ReceiptTracker'

export default function CommunityPage({ mode }: { mode: 'idea' | 'feedback' }) {
  const { t } = useTranslation('community')
  const { t: tSite } = useTranslation('site')
  const title = t(mode === 'idea' ? 'contribution.ideaTitle' : 'feedback.title')
  usePageTitle(`${title} · Chuyện Nhỏ`)
  return <div className="cn-site-page cn-community-page"><div className="cn-container">
    <header className="cn-community-hero"><Link to="/cong-cu" className="cn-directory-back"><Icon name="arrow-left" />{tSite('directory.title')}</Link><h1>{title}</h1><p>{t(mode === 'idea' ? 'contribution.ideaIntro' : 'feedback.intro')}</p></header>
    <div className="cn-community-layout"><section className="cn-community-main" aria-label={title}><ContributionForm mode={mode} /></section><aside className="cn-community-aside"><ReceiptTracker />{mode === 'idea' ? <PublishedIdeas /> : null}<Link to={mode === 'idea' ? '/gop-y-quy-dinh' : '/de-xuat-tien-ich'}>{t(mode === 'idea' ? 'feedback.existingTool' : 'feedback.needTool')}</Link></aside></div>
  </div></div>
}
