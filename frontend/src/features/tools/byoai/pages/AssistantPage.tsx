import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { useLocale } from '@/i18n/I18nProvider'
import { localizePath } from '@/i18n/locales'
import { withBase } from '@/utils/url'
import { assistantMatches, assistantPrompt } from '../utils/assistant-prompt'

export default function AssistantPage() {
  const { t } = useTranslation('byoai')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const catalog = useToolCatalog()
  const locale = useLocale()
  const matches = useMemo(() => assistantMatches(catalog, question), [catalog, question])
  const prompt = useMemo(() => assistantPrompt(question, matches), [question, matches])
  return <ToolBoard side={<div className="erp-tool-result"><p className="erp-tool-result__label">{t('assistant.suggestions')}</p><p className="erp-tool-result__note">{t('assistant.intro')}</p>{matches.length ? <ul className="list-unstyled">{matches.map((tool) => <li className="mb-3" key={tool.id}><a href={withBase(localizePath(`/${tool.slug}`, locale))}>{tool.name}</a><div>{tool.description}</div></li>)}</ul> : <p>{t('assistant.noMatch')}</p>}</div>}>
    <ToolPanel title={t('assistant.title')}>
      <label className="erp-flow-field__label">{t('assistant.question')}<Form.Control as="textarea" rows={4} maxLength={4000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('assistant.placeholder')} /></label>
      {question.trim() ? <><p className="mt-3">{t('assistant.copyNote')}</p><label className="erp-flow-field__label">{t('assistant.promptLabel')}<Form.Control as="textarea" rows={12} readOnly value={prompt} /></label><Button className="mt-3" onClick={() => void navigator.clipboard.writeText(prompt).then(() => setMessage(t('shared.copied'))).catch(() => setMessage(t('assistant.copyFailed')))}>{t('shared.copyPrompt')}</Button></> : null}
      {message ? <p role="status" className="mt-2">{message}</p> : null}
      <label className="erp-flow-field__label mt-4">{t('assistant.answerLabel')}<Form.Control as="textarea" rows={7} maxLength={20000} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
      {answer ? <div className="erp-tool-panel mt-3" style={{ whiteSpace: 'pre-wrap' }}><strong>{t('assistant.unverified')}</strong><p>{answer}</p></div> : null}
    </ToolPanel>
  </ToolBoard>
}
