import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { AI_SETTINGS_PATH } from '../config/ai-routes'
import { useAiSetup } from '../hooks/useAiSetup'
import { useContributionDrafts } from '../hooks/useContributionDrafts'
import { aiService } from '../services/ai.service'
import type { RuleSnapshot } from '../types/ai.types'
import { sourceCheckMessage } from '../utils/source-check'
import { AgentChat, type ChatStarter } from './AgentChat'
import { DraftReview } from './DraftReview'
import { ProInvite } from './ProInvite'

interface AiSourceCheckPanelProps {
  /** `null` while the session is still unknown (hydrating). */
  member: { signedIn: boolean; pro: boolean } | null
  loginTo: string
  toolId: string
  domain: string
  /** Rule kinds the tool reads, in the order the agent should check them. */
  kinds: string[]
  snapshot: RuleSnapshot | null
  /** Plain-text summary of what the person is computing; sent only when they tick the box. */
  currentResult: string
}

const storageKeyFor = (toolId: string) => `cn.ai.check.${toolId}`

function hasStoredCheck(toolId: string) {
  try { return Boolean(localStorage.getItem(storageKeyFor(toolId))) } catch { return false }
}

function Notice({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <section className="cn-ai-invite" aria-label={title}>
      <span className="cn-ai-invite__icon"><Icon name={icon} /></span>
      <div className="cn-ai-invite__body">
        <h2>{title} <span className="cn-pro-chip">Pro</span></h2>
        <p>{text}</p>
      </div>
      {action}
    </section>
  )
}

/**
 * Replaces the copy-a-prompt panel on tools that run on signed rule packages: a Pro member's own agent
 * compares the package in use with the latest official text and leaves drafts the member reviews here.
 */
export function AiSourceCheckPanel({ member, loginTo, toolId, domain, kinds, snapshot, currentResult }: AiSourceCheckPanelProps) {
  const { t } = useTranslation('ai')
  const allowed = Boolean(member?.signedIn && member.pro)
  const setup = useAiSetup(allowed)
  const ready = setup.data?.provider?.status === 'ready' && setup.data.agent?.status === 'active'
  const drafts = useContributionDrafts(toolId, allowed && Boolean(setup.data?.available))
  const toolName = useToolCatalog().find((tool) => tool.slug === toolId)?.name ?? toolId
  const [open, setOpen] = useState(() => hasStoredCheck(toolId))
  const [includeResult, setIncludeResult] = useState(false)
  const [starter, setStarter] = useState<ChatStarter | null>(null)
  const hasResult = currentResult.trim() !== ''

  if (!member) return <div className="cn-ai cn-ai-check"><Skeleton rows={2} title={false} /></div>
  if (!allowed) {
    return <div className="cn-ai cn-ai-check"><ProInvite signedIn={member.signedIn} loginTo={loginTo} title={t('sourceCheck.title')} text={t('sourceCheck.inviteText')} /></div>
  }
  if (setup.isPending) return <div className="cn-ai cn-ai-check"><Skeleton rows={2} title={false} /></div>
  // Errors, a server without AI, or a key switched off by staff: the tool itself still works, so stay quiet-ish.
  if (setup.isError || !setup.data?.available || setup.data.provider?.status === 'disabled') {
    const text = setup.isError ? t('errors.UNKNOWN') : setup.data?.available ? t('provider.disabled') : t('sourceCheck.unavailable')
    return <div className="cn-ai cn-ai-check"><Notice icon="shield-exclamation" title={t('sourceCheck.title')} text={text} /></div>
  }

  const pending = drafts.data ?? []
  const review = <DraftReview drafts={pending} failed={drafts.isError} onRetry={() => void drafts.refetch()} />
  if (!ready) {
    return (
      <div className="cn-ai cn-ai-check">
        <Notice
          icon="key"
          title={t('sourceCheck.title')}
          text={t('sourceCheck.setupText')}
          action={<Link className="cn-button cn-button--navy" to={AI_SETTINGS_PATH}><Icon name="key" />{t('chat.settings')}</Link>}
        />
        {review}
      </div>
    )
  }

  const start = () => {
    const text = sourceCheckMessage({ tool: toolName, toolId, domain, kinds, snapshot, result: includeResult ? currentResult : null }, (key, values) => t(key, values))
    setStarter({
      id: Date.now(),
      text,
      // History is a convenience; a failed record must not stop the check itself.
      beforeSend: (sessionKey) => aiService.recordSourceCheck({ toolId, baseSnapshotId: snapshot?.id ?? null, sessionKey }).catch(() => undefined),
    })
    setOpen(true)
  }

  return (
    <section className="cn-ai cn-ai-check is-ready" aria-labelledby="cn-ai-check-title">
      <header className="cn-ai-check__head">
        <span className="cn-ai-invite__icon"><Icon name="shield-check" /></span>
        <div>
          <h2 id="cn-ai-check-title">{t('sourceCheck.title')} <span className="cn-pro-chip">Pro</span></h2>
          <p>{t('sourceCheck.text')}</p>
        </div>
      </header>

      <div className="cn-ai-check__setup">
        <dl className="cn-ai-check__basis">
          <dt>{t('sourceCheck.basis')}</dt>
          <dd>
            {snapshot ? (
              <>
                {t('sourceCheck.basisValue', { date: snapshot.effectiveFrom })}{' '}
                <a href={snapshot.sourceUrl} target="_blank" rel="noopener noreferrer">{snapshot.sourceTitle}</a>
              </>
            ) : t('sourceCheck.noBasis')}
          </dd>
        </dl>
        <label className="form-check cn-ai-check__include">
          <input type="checkbox" className="form-check-input" checked={includeResult && hasResult} disabled={!hasResult} onChange={(event) => setIncludeResult(event.target.checked)} />
          <span className="form-check-label">
            {t('sourceCheck.includeResult')}
            <small>{hasResult ? t('sourceCheck.includeResultHint') : t('sourceCheck.noResult')}</small>
          </span>
        </label>
        <button type="button" className={`cn-button${open ? ' cn-button--ghost' : ''}`} onClick={start}>
          <Icon name={open ? 'arrow-counterclockwise' : 'search'} />{open ? t('sourceCheck.restart') : t('sourceCheck.start')}
        </button>
      </div>

      {open ? (
        <AgentChat
          embedded
          storageKey={storageKeyFor(toolId)}
          starter={starter}
          onTurnEnd={() => void drafts.refetch()}
          emptyTitle={t('sourceCheck.emptyTitle')}
          emptyText={t('sourceCheck.emptyText')}
          placeholder={t('sourceCheck.placeholder')}
        />
      ) : null}
      {review}
    </section>
  )
}
