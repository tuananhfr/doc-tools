import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'

export function RecentTools({ recent }: { recent: ToolDefinition[] }) {
  const { base } = useToolsBranch()
  if (recent.length === 0) return null
  return (
    <section className="cn-recent" aria-labelledby="cn-recent-title">
      <h2 id="cn-recent-title"><Icon name="clock-history" /> Dùng gần đây</h2>
      <ul>{recent.slice(0, 4).map((tool) => <li key={tool.id}><Link to={toolPath(base, tool)}><Icon name={tool.icon} />{tool.name}</Link></li>)}</ul>
    </section>
  )
}
