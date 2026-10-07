import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolBoard } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import { ContributionForm } from '../components/ContributionForm'

interface PublicIdea { id: string; text: string }
export default function IdeaSuggestionPage() {
  const { t } = useTranslation('community')
  const [ideas, setIdeas] = useState<PublicIdea[]>([])
  useEffect(() => { void fetch(withBase('/api/v1/contributions/ideas'), { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((value: { ideas?: PublicIdea[] } | null) => { if (value?.ideas) setIdeas(value.ideas) }).catch(() => undefined) }, [])
  return <ToolBoard><div className="d-grid gap-4"><ContributionForm mode="idea" /><section className="erp-tool-panel"><h2 className="h5">{t('ideas.published')}</h2>{ideas.length ? <ul>{ideas.map((idea) => <li key={idea.id} style={{ whiteSpace: 'pre-line' }}>{idea.text}</li>)}</ul> : <p>{t('ideas.empty')}</p>}</section></div></ToolBoard>
}
