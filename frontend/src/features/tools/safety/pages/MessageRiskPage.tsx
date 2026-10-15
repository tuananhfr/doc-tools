import { useId, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel, ToolSegments, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { inspectLink, inspectMessage } from '../utils/message-risk'

export default function MessageRiskPage() {
  const { t } = useTranslation('safety')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.messageRisk' })
  const inputId = useId()
  const resultRef = useRef<HTMLDivElement>(null)
  const [kind, setKind] = useState<'message' | 'link'>('message')
  const [input, setInput] = useState('')
  const risk = input.trim() ? kind === 'link' ? inspectLink(input) : inspectMessage(input) : null
  const label = !risk ? '—'
    : risk.level === 'unreadable' ? t('flags.unreadable')
      : risk.level === 'high' ? t('messageRisk.levelHigh') : risk.level === 'medium' ? t('messageRisk.levelMedium') : t('messageRisk.levelLow')
  // Kết quả vẫn tính theo từng phím gõ; trên điện thoại cột kết quả nằm dưới ô nhập nên cần nút đưa người dùng tới đó.
  const showResult = () => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    resultRef.current?.focus({ preventScroll: true })
  }

  return <ToolBoard className="cn-risk-workspace" layout="wide-result" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>} side={<div ref={resultRef} tabIndex={-1} className="erp-tool-result cn-risk-result" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="shield-check" /></span><div><h2>{t('messageRisk.result')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className="cn-risk-verdict" data-level={risk?.level ?? 'empty'}><Icon name={!risk ? 'chat-square-text' : risk.level === 'high' ? 'exclamation-octagon' : risk.level === 'medium' || risk.level === 'unreadable' ? 'exclamation-triangle' : 'info-circle'} /><p className="erp-tool-result__value">{label}</p></div>
    {risk?.signals.length ? <ul className="erp-tool-rows">{risk.signals.map((item, index) => <li key={`${item.text}-${index}`}>{item.text}</li>)}</ul> : null}
    <p className="erp-tool-result__note">{t('messageRisk.note')}</p>
  </div>}>
    <ToolPanel title={t('messageRisk.title')} actions={<span className="cn-studio-small-icon"><Icon name="search" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      <ToolSegments label={t('messageRisk.kind')} value={kind} options={[{ value: 'message', label: t('messageRisk.kindMessage'), icon: 'chat-left-text' }, { value: 'link', label: t('messageRisk.kindLink'), icon: 'link-45deg' }]} onChange={setKind} />
      <label className="erp-flow-field__label mt-3" htmlFor={inputId}>{kind === 'link' ? t('messageRisk.kindLink') : t('messageRisk.messageLabel')}</label>
      <Form.Control id={inputId} as="textarea" rows={10} value={input} onChange={(event) => setInput(event.target.value)} placeholder={kind === 'link' ? t('messageRisk.linkPlaceholder') : t('messageRisk.messagePlaceholder')} />
      <Button className="mt-3 cn-risk-check" disabled={!input.trim()} onClick={showResult}><Icon name="search" className="me-2" />{t('messageRisk.check')}</Button>
      <p className="erp-tool-result__note mt-3">{t('messageRisk.privacy')}</p>
    </ToolPanel>
  </ToolBoard>
}
