import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { speechLanguage } from '@/i18n/intl'

interface SpeechResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface SpeechRecognizer {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  start(): void
  stop(): void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer }

// Chrome tự ngắt sau vài giây im lặng (`no-speech`) và khi người dùng bấm Dừng (`aborted`): không phải lỗi, onend sẽ nghe tiếp.
const BENIGN_ERRORS = new Set(['no-speech', 'aborted'])
const DENIED_ERRORS = new Set(['not-allowed', 'service-not-allowed'])

export default function DictationPage() {
  const { t } = useTranslation('accessibility')
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognizer = useRef<SpeechRecognizer | null>(null)
  const active = useRef(false)
  const supported = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition)

  useEffect(() => () => { active.current = false; recognizer.current?.stop() }, [])

  const toggle = () => {
    if (listening) {
      active.current = false
      recognizer.current?.stop()
      recognizer.current = null
      setListening(false)
      setInterim('')
      return
    }
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition
    if (!Constructor) return
    try {
      const instance = new Constructor()
      instance.lang = speechLanguage()
      instance.continuous = true
      instance.interimResults = true
      instance.onresult = (event) => {
        const segments: string[] = []
        let pending = ''
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]
          if (result.isFinal) segments.push(result[0].transcript.trim())
          else pending += result[0].transcript
        }
        setInterim(pending.trim())
        if (segments.length) setText((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${segments.join(' ')} `)
      }
      instance.onerror = (event) => {
        const code = event?.error ?? ''
        if (BENIGN_ERRORS.has(code)) return
        active.current = false
        setListening(false)
        setInterim('')
        setError(DENIED_ERRORS.has(code) ? t('dictation.micFailed') : t('dictation.interrupted'))
      }
      instance.onend = () => {
        setInterim('')
        if (active.current) { try { instance.start() } catch { active.current = false; setListening(false) } }
      }
      active.current = true
      recognizer.current = instance
      instance.start()
      setListening(true)
      setError('')
    } catch { active.current = false; setError(t('dictation.interrupted')) }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${t('dictation.fileName')}.txt`; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('dictation.status')}</p>
    <p className="erp-tool-result__value">{listening ? t('dictation.listening') : supported ? t('shared.ready') : t('dictation.unsupported')}</p>
    <p className="erp-tool-result__note">{t('dictation.privacy')}</p>
    {error ? <p role="alert" className="erp-tool-result__note">{error}</p> : null}
  </div>}>
    <ToolPanel title={t('dictation.title')}>
      <Button disabled={!supported} variant={listening ? 'outline-danger' : 'primary'} onClick={toggle}>{listening ? t('shared.stop') : t('dictation.start')}</Button>
      <label className="erp-flow-field__label mt-3">{t('dictation.text')}<Form.Control as="textarea" rows={10} maxLength={100_000} value={text} onChange={(event) => setText(event.target.value)} /></label>
      {/* Chữ tạm KHÔNG ghi vào ô văn bản: trình duyệt còn sửa nó tới khi chốt, ghi vào là người dùng sửa dở bị đè. */}
      {listening && interim ? <p className="erp-tool-result__note mt-2" data-testid="dictation-interim"><em>{t('dictation.interim')}: {interim}</em></p> : null}
      <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>{t('dictation.copy')}</Button><Button variant="outline-secondary" disabled={!text} onClick={download}>{t('dictation.download')}</Button></div>
    </ToolPanel>
  </ToolBoard>
}
