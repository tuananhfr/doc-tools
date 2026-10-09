import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { numberFormat, speechLanguage } from '@/i18n/intl'

const MAX_CHARS = 20000
const formatCount = (value: number) => numberFormat().format(value)
// Chrome nạp danh sách giọng bất đồng bộ; có trình duyệt không bao giờ bắn `voiceschanged` khi máy không có giọng nào.
const VOICE_WAIT_MS = 1500

type VoiceState = 'loading' | 'ok' | 'missing'

function hasVoiceFor(lang: string): boolean {
  const base = lang.toLowerCase().split('-')[0]
  return window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
}

export default function ReadAloudPage() {
  const { t } = useTranslation('accessibility')
  const textId = useId()
  const counterId = useId()
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const [voice, setVoice] = useState<VoiceState>('loading')
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const tooLong = text.length > MAX_CHARS

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const check = (final: boolean) => {
      if (hasVoiceFor(speechLanguage())) setVoice('ok')
      else if (final || synth.getVoices().length) setVoice('missing')
    }
    const onChange = () => check(false)
    check(false)
    const timer = window.setTimeout(() => check(true), VOICE_WAIT_MS)
    synth.addEventListener('voiceschanged', onChange)
    return () => { window.clearTimeout(timer); synth.removeEventListener('voiceschanged', onChange) }
  }, [supported])

  const speak = () => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.slice(0, MAX_CHARS))
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
    {supported && voice === 'missing' ? <p role="status" className="erp-tool-result__note mt-3"><strong>{t('readAloud.noVoice')}</strong></p> : null}
    <p className="erp-tool-result__note mt-3">{supported ? t('readAloud.voiceNote') : t('readAloud.unsupported')}</p>
  </div>}>
    <ToolPanel title={t('readAloud.title')}>
      <label className="erp-flow-field__label" htmlFor={textId}>{t('readAloud.content')}</label>
      <Form.Control id={textId} as="textarea" rows={12} value={text} aria-describedby={counterId} onChange={(event) => setText(event.target.value)} />
      <p id={counterId} className={`erp-tool-result__note mt-1${tooLong ? ' text-danger' : ''}`}>
        {t('readAloud.counter', { used: formatCount(text.length), max: formatCount(MAX_CHARS) })}
        {tooLong ? <span className="d-block">{t('readAloud.tooLong', { max: formatCount(MAX_CHARS) })}</span> : null}
      </p>
      <label className="erp-flow-field__label mt-3">{t('readAloud.rate', { rate: rate.toFixed(1) })}
        <Form.Range min={0.5} max={2} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} />
      </label>
    </ToolPanel>
  </ToolBoard>
}
