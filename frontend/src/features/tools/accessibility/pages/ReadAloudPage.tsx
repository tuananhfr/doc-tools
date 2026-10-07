import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { speechLanguage } from '@/i18n/intl'

export default function ReadAloudPage() {
  const { t } = useTranslation('accessibility')
  const textId = useId()
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  const speak = () => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 20000))
    utterance.lang = speechLanguage()
    utterance.rate = rate
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }
  const stop = () => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('readAloud.device')}</p>
    <p className="erp-tool-result__value">{speaking ? t('readAloud.speaking') : t('shared.ready')}</p>
    <div className="d-flex flex-wrap gap-2 mt-3"><Button disabled={!supported || !text.trim()} onClick={speak}>{t('readAloud.read')}</Button><Button variant="outline-secondary" disabled={!speaking} onClick={stop}>{t('shared.stop')}</Button></div>
    <p className="erp-tool-result__note mt-3">{supported ? t('readAloud.voiceNote') : t('readAloud.unsupported')}</p>
  </div>}>
    <ToolPanel title={t('readAloud.title')}>
      <label className="erp-flow-field__label" htmlFor={textId}>{t('readAloud.content')}</label>
      <Form.Control id={textId} as="textarea" rows={12} maxLength={20000} value={text} onChange={(event) => setText(event.target.value)} />
      <label className="erp-flow-field__label mt-3">{t('readAloud.rate', { rate: rate.toFixed(1) })}
        <Form.Range min={0.5} max={2} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} />
      </label>
    </ToolPanel>
  </ToolBoard>
}
