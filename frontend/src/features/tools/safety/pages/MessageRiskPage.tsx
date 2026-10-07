import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { inspectLink, inspectMessage } from '../utils/message-risk'

export default function MessageRiskPage() {
  const { t } = useTranslation('safety')
  const inputId = useId()
  const [kind, setKind] = useState<'message' | 'link'>('message')
  const [input, setInput] = useState('')
  const risk = input.trim() ? kind === 'link' ? inspectLink(input) : inspectMessage(input) : null
  const label = risk?.level === 'high' ? t('messageRisk.levelHigh') : risk?.level === 'medium' ? t('messageRisk.levelMedium') : risk ? t('messageRisk.levelLow') : '—'

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('messageRisk.result')}</p>
    <p className="erp-tool-result__value">{label}</p>
    {risk?.flags.length ? <ul className="erp-tool-rows">{risk.flags.map((flag, index) => <li key={`${flag}-${index}`}>{flag}</li>)}</ul> : null}
    <p className="erp-tool-result__note">{t('messageRisk.note')}</p>
  </div>}>
    <ToolPanel title={t('messageRisk.title')}>
      <label className="erp-flow-field__label">{t('messageRisk.kind')}
        <Form.Select value={kind} onChange={(event) => setKind(event.target.value as 'message' | 'link')}><option value="message">{t('messageRisk.kindMessage')}</option><option value="link">{t('messageRisk.kindLink')}</option></Form.Select>
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={inputId}>{kind === 'link' ? t('messageRisk.kindLink') : t('messageRisk.messageLabel')}</label>
      <Form.Control id={inputId} as="textarea" rows={10} value={input} onChange={(event) => setInput(event.target.value)} placeholder={kind === 'link' ? t('messageRisk.linkPlaceholder') : t('messageRisk.messagePlaceholder')} />
      <p className="erp-tool-result__note mt-3">{t('messageRisk.privacy')}</p>
    </ToolPanel>
  </ToolBoard>
}
