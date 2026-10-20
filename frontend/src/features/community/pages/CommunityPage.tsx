import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { WorkspaceGuide } from '@/features/tools/hub'
import { ContributionForm } from '../components/ContributionForm'
import { PublishedIdeas } from '../components/PublishedIdeas'
import { ReceiptTracker } from '../components/ReceiptTracker'

export default function CommunityPage({ mode }: { mode: 'idea' | 'feedback' }) {
  const { t } = useTranslation('community')
  const { t: tSite } = useTranslation('site')
  const { t: common } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.ideas' })
  const title = t(mode === 'idea' ? 'contribution.ideaTitle' : 'feedback.title')
  const guide = mode === 'idea' ? <details className="cn-idea-guide"><summary><Icon name="signpost-split" /><span>{common('studio.howTitle')}</span><Icon name="chevron-down" /></summary><WorkspaceGuide steps={[studio('stepDescribe'), studio('stepSend'), studio('stepTrack')]} tip={studio('tip')} /></details> : null
  usePageTitle(`${title} · Chuyện Nhỏ`)
  return <div className={`cn-site-page cn-community-page${mode === 'idea' ? ' cn-community-page--studio' : ''}`}><div className="cn-container">
    <header className="cn-community-hero"><Link to="/" className="cn-directory-back"><Icon name="arrow-left" />{tSite('directory.title')}</Link>{mode === 'idea' ? <div className="cn-idea-heading"><span className="cn-idea-heading-icon"><Icon name="lightbulb" /></span><div><h1>{title}</h1><p>{t('contribution.ideaIntro')}</p></div><span className="cn-studio-hero-art" aria-hidden="true"><span /><span /><span><Icon name="lightbulb" /></span><Icon name="stars" /></span></div> : <><h1>{title}</h1><p>{t('feedback.intro')}</p></>}</header>
    <div className="cn-community-layout"><section className="cn-community-main" aria-label={title}>{mode === 'idea' ? <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="pencil-square" /></span><div><h2>{studio('formTitle')}</h2><p>{studio('formHint')}</p></div></div> : null}<ContributionForm mode={mode} /></section><aside className="cn-community-aside">{mode === 'idea' ? <><div className="cn-studio-card cn-idea-tracker"><span className="cn-studio-small-icon"><Icon name="ticket-perforated" /></span><ReceiptTracker /></div><div className="cn-studio-card cn-idea-published"><span className="cn-studio-small-icon"><Icon name="stars" /></span><PublishedIdeas /></div></> : <ReceiptTracker />}<Link className={mode === 'idea' ? 'cn-idea-existing' : undefined} to={mode === 'idea' ? '/gop-y-quy-dinh' : '/de-xuat-tien-ich'}>{mode === 'idea' ? <Icon name="chat-left-text" /> : null}{t(mode === 'idea' ? 'feedback.existingTool' : 'feedback.needTool')}{mode === 'idea' ? <Icon name="arrow-right" /> : null}</Link>{guide}</aside></div>
  </div></div>
}
