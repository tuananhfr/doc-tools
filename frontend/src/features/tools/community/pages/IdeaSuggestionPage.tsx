import { useEffect, useState } from 'react'
import { ToolBoard } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import { ContributionForm } from '../components/ContributionForm'

interface PublicIdea { id: string; text: string }
export default function IdeaSuggestionPage() {
  const [ideas, setIdeas] = useState<PublicIdea[]>([])
  useEffect(() => { void fetch(withBase('/api/v1/contributions/ideas'), { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((value: { ideas?: PublicIdea[] } | null) => { if (value?.ideas) setIdeas(value.ideas) }).catch(() => undefined) }, [])
  return <ToolBoard><div className="d-grid gap-4"><ContributionForm mode="idea" /><section className="erp-tool-panel"><h2 className="h5">Ý tưởng đã công bố</h2>{ideas.length ? <ul>{ideas.map((idea) => <li key={idea.id} style={{ whiteSpace: 'pre-line' }}>{idea.text}</li>)}</ul> : <p>Chưa có ý tưởng nào được duyệt và công bố.</p>}</section></div></ToolBoard>
}
