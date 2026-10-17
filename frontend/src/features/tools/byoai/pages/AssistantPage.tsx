import { PracticalStudio } from '@/features/tools/utility/components/PracticalStudio'
import { loginPath, useMe } from '@/features/account'
import { AiAssistant } from '@/features/ai'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'

export default function AssistantPage() {
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.assistant' })
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
  return (
    <PracticalStudio kind="assistant"><ToolBoard className="cn-assistant-workspace" layout="compact">
      <ToolPanel title={studio('panelTitle')} actions={<span className="cn-studio-small-icon"><Icon name="chat-dots" /></span>}>
      <p className="cn-studio-form-hint">{studio('introHint')}</p>
      <AiAssistant member={member} loginTo={loginPath('/tro-ly')} />
      </ToolPanel>
      <section className="cn-studio-card cn-assistant-capabilities"><h2>{studio('ideasTitle')}</h2><div>{([['grid', 'write', 'writeHint'], ['list-check', 'summarize', 'summarizeHint'], ['search', 'plan', 'planHint']] as const).map(([icon, title, hint]) => <div key={title}><span className="cn-studio-small-icon"><Icon name={icon} /></span><h3>{studio(title)}</h3><p>{studio(hint)}</p></div>)}</div></section>
    </ToolBoard></PracticalStudio>
  )
}
