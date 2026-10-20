import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { toolPath, useToolsBranch, type ToolDefinition } from '@/features/tools/hub'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { ToolArtwork } from '@/features/tools/hub/components/ToolArtwork'
import { ExperienceControlsSlot } from '@/features/tools/hub/components/ExperienceControls'
import { directoryGroupTools, directoryToolGroup, DIRECTORY_GROUP_ICONS } from '@/features/site/utils/directory-groups'
import { hubDirectoryPath } from '@/features/site/config/site-navigation'

const RELATED = ['id-photo', 'crop-image', 'remove-background', 'compress-image', 'convert-image', 'collage', 'trim-video', 'compress-video', 'extract-audio', 'remove-metadata']

function PhotoMascot({ compass = false, entertainment = false, calculation = false, calendar = false, document = false, textDocument = false, qr = false, media = false }: { compass?: boolean; entertainment?: boolean; calculation?: boolean; calendar?: boolean; document?: boolean; textDocument?: boolean; qr?: boolean; media?: boolean }) {
  return <svg className="cn-idstudio-mascot" viewBox="0 0 200 180" fill="none" aria-hidden="true">
    <path d="M9 178c9-31 38-38 77-36h56c30 0 45 13 51 36" fill="#e5f3ff" />
    <path d="M74 108c-23 9-38 33-37 69h130c-2-37-14-60-40-69" fill="white" stroke="#112c78" strokeWidth="3" />
    <path d="m82 109 15 23 13-18 13 18 10-23" fill="#eaf4ff" stroke="#112c78" strokeWidth="2.5" />
    <path d="M95 94v19c2 11 18 11 21 0V92" fill="#ffdbbd" stroke="#112c78" strokeWidth="2.5" />
    <path d="M66 56c-11-26 3-42 18-42C103-4 142 4 153 26c13 13 10 27 5 43l-87 2" fill="#173c95" stroke="#112c78" strokeWidth="3" />
    <path d="M73 57c-15-7-14 17 0 20 1 25 17 37 37 36 24-1 40-18 40-44 14-1 14-23 0-19l-6-16c-20 16-42 18-64 15Z" fill="#ffdbbd" stroke="#112c78" strokeWidth="3" />
    <path d="M74 38c14 0 29-6 37-15m-18-9c-7 3-12 8-15 13m43-13c13 2 21 8 26 17" stroke="#4169bf" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="92" cy="65" rx="3" ry="4.5" fill="#112c78" /><ellipse cx="128" cy="63" rx="3" ry="4.5" fill="#112c78" />
    <path d="m86 55 10-2m25-2 10 3m-22 14-2 7h5m-13 10c8 10 20 6 23-2" stroke="#112c78" strokeWidth="2.4" strokeLinecap="round" />
    <ellipse cx="83" cy="80" rx="6" ry="3" fill="#ffb4b1" /><ellipse cx="139" cy="77" rx="6" ry="3" fill="#ffb4b1" />
    <path d="M53 150c-12-7-14-19-13-33l20-5c6 14 15 22 23 25" fill="#ffdbbd" stroke="#112c78" strokeWidth="3" />
    {compass ? <g transform="rotate(-8 43 91)"><circle cx="43" cy="91" r="30" fill="white" stroke="#112c78" strokeWidth="3" /><circle cx="43" cy="91" r="24" stroke="#afcbf7" strokeWidth="2" /><path d="m43 69 8 22-8 5-8-5Z" fill="#f43756" /><path d="m43 113 8-22-8 5-8-5Z" fill="#1674f4" /><circle cx="43" cy="91" r="3" fill="#112c78" /><path d="M43 62v4m0 50v4M14 91h4m50 0h4" stroke="#112c78" strokeWidth="2" /></g> : entertainment ? <g transform="rotate(-9 23 66)"><rect x="14" y="61" width="46" height="64" rx="5" fill="#9560f5" stroke="#112c78" strokeWidth="3" /><rect x="29" y="53" width="46" height="64" rx="5" fill="white" stroke="#112c78" strokeWidth="3" /><path d="m52 70 4 9 10 1-8 7 2 10-8-5-9 5 2-10-8-7 11-1Z" fill="#9560f5" /><path d="m35 105 7-5m23-38 4-3" stroke="#afcbf7" strokeWidth="2.5" strokeLinecap="round" /></g> : calculation ? <g transform="rotate(-8 23 66)"><rect x="19" y="56" width="52" height="72" rx="7" fill="#ff981f" stroke="#112c78" strokeWidth="3" /><rect x="26" y="65" width="38" height="17" rx="3" fill="white" /><text x="31" y="78" fontSize="12" fontFamily="Arial,sans-serif" fontWeight="700" fill="#112c78">123</text>{[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <rect key={row * 3 + col} x={27 + col * 13} y={90 + row * 10} width="8" height="6" rx="1.5" fill="white" />))}</g> : calendar ? <g transform="rotate(-8 23 66)"><rect x="19" y="58" width="54" height="68" rx="6" fill="white" stroke="#112c78" strokeWidth="3" /><path d="M20 76h52M31 53v13m29-13v13" stroke="#1674f4" strokeWidth="4" strokeLinecap="round" />{[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <rect key={row * 3 + col} x={28 + col * 13} y={85 + row * 11} width="7" height="7" rx="2" fill={row === 1 && col === 1 ? '#ff981f' : '#afcbf7'} />))}</g> : document || textDocument ? <g transform="rotate(-8 23 66)"><rect x="19" y="56" width="52" height="72" rx="4" fill="white" stroke="#112c78" strokeWidth="3" /><path d="M29 68h31m-31 8h25m-25 35h31m-31 7h20" stroke="#afcbf7" strokeWidth="3" strokeLinecap="round" /><text x="26" y="100" fontSize="19" fontFamily="Arial,sans-serif" fontWeight="700" fill={textDocument ? '#1674f4' : '#f43756'}>{textDocument ? 'Aa' : 'PDF'}</text></g> : media ? <g transform="rotate(-8 20 75)"><rect x="8" y="72" width="65" height="49" rx="5" fill="#e8f4ff" stroke="#112c78" strokeWidth="3" /><rect x="14" y="79" width="53" height="34" rx="2" fill="white" /><circle cx="40" cy="96" r="12" fill="#1674f4" /><path d="m37 90 9 6-9 6Z" fill="white" /><path d="m12 57 5-7v15m0-15 9-2v14" stroke="#1674f4" strokeWidth="3" strokeLinecap="round" /><circle cx="13" cy="66" r="3" fill="#1674f4" /><circle cx="22" cy="63" r="3" fill="#1674f4" /></g> : <>
    <rect x="23" y="66" width="41" height="61" rx="5" transform="rotate(-8 23 66)" fill="#1874ef" stroke="#112c78" strokeWidth="3" />
    <rect x="29" y="73" width="29" height="44" rx="2" transform="rotate(-8 29 73)" fill="#e8f4ff" />
    {qr ? <g transform="translate(32 77) rotate(-8)"><path d="M0 0h9v9H0Zm15 0h9v9h-9ZM0 15h9v9H0Z" stroke="#0067f4" strokeWidth="2" /><path d="M3 3h3v3H3Zm15 0h3v3h-3ZM3 18h3v3H3Zm10-6h4v4h-4Zm7 0h4v3h-4Zm-7 8h4v4h-4Zm7-3h4v7h-4ZM0 11h5v2H0Z" fill="#0067f4" /></g> : <><circle cx="45" cy="88" r="8" fill="#ffdbbd" /><path d="M32 112c0-18 26-20 27-3" fill="white" stroke="#a9cfff" strokeWidth="2" />
    <path d="M36 83c0-15 22-15 19 4-5-1-8-6-9-8-2 4-5 5-10 4" fill="#173c95" /></>}
    </>}
    <path d="m42 126 7-12c3-5 11-1 8 4l-4 9" fill="#ffdbbd" stroke="#112c78" strokeWidth="2.5" strokeLinecap="round" />
    <path d="m172 24 2-8 3 8 8 3-8 3-3 8-2-8-8-3Zm-160 22 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#a8d4ff" />
  </svg>
}

interface ImageStudioProps {
  children: ReactNode
  toolId: ToolDefinition['id']
  icon: string
  title: string
  subtitle: string
  heroNote: string
  steps: readonly string[]
  tips: readonly string[]
  faq: readonly { q: string; a: string }[]
  trustLabels?: readonly string[]
  /** Scan/conversion/media references use real tool links below the banner. */
  navigation?: readonly string[]
  category?: { title: string; icon: string; path: string; tools: readonly string[]; relatedTitle: string }
}

/** The approved /anh-the layout is the shared frame for photo tools. */
export function ImageStudio({ children, toolId, icon, title, subtitle, heroNote, steps, tips, faq, navigation, category, trustLabels }: ImageStudioProps) {
  const { t } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const { t: site } = useTranslation('site')
  const { base, kind } = useToolsBranch()
  const catalog = useToolCatalog()
  const currentTool = catalog.find(tool => tool.id === toolId)
  const group = directoryToolGroup(toolId)
  const tools = group ? directoryGroupTools(catalog, group).filter(tool => tool.status === 'ready') : (category?.tools ?? RELATED).flatMap(id => { const tool = catalog.find(item => item.id === id && item.status === 'ready'); return tool ? [tool] : [] })
  const imageHub = kind === 'public' ? group ? hubDirectoryPath(group) : category?.path ?? '/hinh-anh' : base
  const categoryTitle = group ? site(`hubs.${group}.label`) : category?.title ?? t('category')
  return <div className={`cn-idstudio cn-image-studio cn-image-studio--${toolId}`}>
    <div className="cn-idstudio-topline">
      <nav className="cn-idstudio-breadcrumb" aria-label={t('breadcrumb')}><Link to={base}>{t('tools')}</Link><Icon name="chevron-right" /><Link to={imageHub}>{categoryTitle}</Link><Icon name="chevron-right" /><span>{title}</span></nav>
      <ExperienceControlsSlot />
    </div>
    <div className="cn-idstudio-layout">
      <aside className="cn-idstudio-sidebar">
        <Link to={imageHub} className="cn-idstudio-back"><Icon name="arrow-left" />{t('back')}</Link>
        <nav className="cn-idstudio-toolnav" aria-label={categoryTitle}><h2><Icon name={group ? DIRECTORY_GROUP_ICONS[group] : category?.icon ?? 'images'} />{categoryTitle}</h2>{tools.map(tool => <Link key={tool.id} to={toolPath(base, tool)} aria-current={tool.id === toolId ? 'page' : undefined}><Icon name={tool.icon} /><span>{tool.name}</span></Link>)}</nav>
        <div className="cn-idstudio-side-note" aria-hidden="true"><p>{t('sideNote')}</p><Icon name="house-heart" /><span>♡</span></div>
      </aside>
      <div className="cn-idstudio-main">
        <header className="cn-idstudio-hero">
          <span className="cn-idstudio-hero-icon">{currentTool ? <ToolArtwork tool={currentTool} /> : <Icon name={icon} />}</span>
          <div className="cn-idstudio-hero-copy"><h1>{title}</h1><p>{subtitle}</p><ul>{(trustLabels ?? (['free', 'easy', 'noAccount', 'private'] as const).map(key => t(`trust.${key}`))).map((label, index) => <li key={index}><Icon name="check-circle-fill" />{label}</li>)}</ul></div>
          <div className="cn-idstudio-hero-note" aria-hidden="true">{heroNote}<span>♡</span></div><PhotoMascot compass={toolId === 'house-orientation' || toolId === 'address-conversion'} entertainment={['numerology', 'playing-cards', 'tarot', 'spin-wheel'].includes(toolId)} calculation={['payroll', 'pomodoro', 'electricity', 'quick-calc', 'unit-convert', 'loan', 'unit-price', 'study', 'group-split', 'money-calc', 'date-calc'].includes(toolId)} calendar={toolId === 'lunar-calendar'} textDocument={['assistant', 'invoice-xml', 'office-word', 'office-sheet', 'office-slide', 'flashcards', 'cv', 'form-templates', 'number-words', 'legacy-font', 'char-count'].includes(toolId)} document={['edit-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'convert-file', 'pdf-password', 'organize-pdf', 'page-numbers', 'stamp-pdf', 'ocr', 'pdf-to-image', 'view-pdf', 'redact-pdf', 'sign', 'compare'].includes(toolId)} qr={['qr-read', 'qr-create', 'barcode-create', 'vietqr', 'code-manager'].includes(toolId)} media={['extract-audio', 'trim-video', 'compress-video', 'video-gif', 'read-aloud'].includes(toolId)} />
        </header>
        {navigation ? <nav className="cn-processing-nav" aria-label={t('related')}>{navigation.flatMap(id => { const tool = catalog.find(item => item.id === id && item.status === 'ready'); return tool ? [<Link key={id} to={toolPath(base, tool)} aria-current={id === toolId ? 'page' : undefined}><Icon name={tool.icon} /><span>{tool.name}</span></Link>] : [] })}</nav> : null}
        {children}
        <section className="cn-idstudio-related" aria-labelledby="idstudio-related-title"><h2 id="idstudio-related-title">{category?.relatedTitle ?? t('related')}</h2><div>{tools.filter(tool => tool.id !== toolId).slice(0, 8).map(tool => <Link to={toolPath(base, tool)} key={tool.id}><ToolArtwork tool={tool} small /><span>{tool.name}</span></Link>)}</div></section>
      </div>
      <aside className="cn-idstudio-help">
        <section className="cn-idstudio-help-card"><h2><Icon name="lightbulb-fill" />{t('guideTitle')}</h2><ol>{steps.map((step, index) => <li key={index}><span>{index + 1}</span>{step}</li>)}</ol></section>
        <section className="cn-idstudio-help-card cn-idstudio-tips"><h2><Icon name="patch-check-fill" />{t('tipsTitle')}</h2><ul>{tips.map((tip, index) => <li key={index}><Icon name="check-circle-fill" />{tip}</li>)}</ul></section>
        <section className="cn-idstudio-help-card cn-idstudio-faq"><h2><Icon name="question-circle-fill" />{t('faqTitle')}</h2>{faq.map((item, index) => <details key={index}><summary>{item.q}<Icon name="chevron-right" /></summary><p>{item.a}</p></details>)}</section>
        <div className="cn-idstudio-cheer" aria-hidden="true"><p>{t('cheer')}</p><PhotoMascot /></div>
      </aside>
    </div>
  </div>
}
