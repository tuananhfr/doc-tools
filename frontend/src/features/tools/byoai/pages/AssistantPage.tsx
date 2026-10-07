import { loginPath, useMe } from '@/features/account'
import { AiAssistant } from '@/features/ai'
import { ToolBoard } from '@/features/tools/hub'

export default function AssistantPage() {
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
  return (
    <ToolBoard>
      <AiAssistant member={member} loginTo={loginPath('/tro-ly')} />
    </ToolBoard>
  )
}
