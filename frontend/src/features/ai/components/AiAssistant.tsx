import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { StateView } from '@/components/ui/StateView'
import { AI_SETTINGS_PATH } from '../config/ai-routes'
import { useAiSetup } from '../hooks/useAiSetup'
import { AiError } from '../services/ai.service'
import { AgentChat } from './AgentChat'
import { ProInvite } from './ProInvite'

interface AiAssistantProps {
  /** `null` while the session is still unknown (hydrating). */
  member: { signedIn: boolean; pro: boolean } | null
  loginTo: string
}

/** The whole assistant screen: invite, setup prompt or the live chat, in that order of gates. */
export function AiAssistant({ member, loginTo }: AiAssistantProps) {
  const { t } = useTranslation('ai')
  const allowed = Boolean(member?.signedIn && member.pro)
  const setup = useAiSetup(allowed)

  if (!member) return <div className="cn-ai"><Skeleton rows={4} /></div>
  if (!allowed) return <div className="cn-ai"><ProInvite signedIn={member.signedIn} loginTo={loginTo} /></div>
  if (setup.isError) {
    const code = setup.error instanceof AiError ? setup.error.code : 'UNKNOWN'
    return (
      <div className="cn-ai">
        <StateView icon="cloud-slash" tone="danger" title={t(`errors.${code}`)} actions={<button type="button" className="cn-button" onClick={() => void setup.refetch()}>{t('chat.retry')}</button>} />
      </div>
    )
  }
  if (!setup.data) return <div className="cn-ai"><Skeleton rows={4} /></div>
  if (!setup.data.available) return <div className="cn-ai"><StateView icon="plug" title={t('settings.unavailable')} /></div>

  const { provider, agent } = setup.data
  if (provider?.status === 'disabled') return <div className="cn-ai"><StateView icon="slash-circle" tone="warning" title={t('provider.disabled')} /></div>
  if (provider?.status !== 'ready' || agent?.status !== 'active') {
    return (
      <div className="cn-ai">
        <StateView
          icon="key"
          title={t('chat.notReadyTitle')}
          description={t('chat.notReadyText')}
          actions={<Link className="cn-button" to={AI_SETTINGS_PATH}><Icon name="key" />{t('chat.settings')}</Link>}
        />
      </div>
    )
  }
  return <div className="cn-ai"><AgentChat /></div>
}
