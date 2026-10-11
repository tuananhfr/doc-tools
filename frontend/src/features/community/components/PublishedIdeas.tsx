import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { publishedIdeas, type PublicIdea } from '../services/contributions.api'

export function PublishedIdeas() {
  const { t } = useTranslation('community')
  const [ideas, setIdeas] = useState<PublicIdea[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    void publishedIdeas(controller.signal).then(value => { if (!controller.signal.aborted) { setIdeas(value.ideas); setState('ready') } }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [attempt])
  return <section className="cn-community-published"><h2>{t('ideas.published')}</h2>
    {state === 'loading' ? <p role="status">{t('ideas.loading')}</p> : state === 'error' ? <><p role="alert">{t('ideas.failed')}</p><button type="button" className="cn-button cn-button--ghost" onClick={() => setAttempt(value => value + 1)}>{t('ideas.retry')}</button></> : ideas.length ? <ul>{ideas.map(idea => <li key={idea.id}><p>{idea.text}</p>{idea.author ? <small>{idea.author}</small> : null}</li>)}</ul> : <p>{t('ideas.empty')}</p>}
  </section>
}
