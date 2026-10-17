import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { AccessibilityStudio } from '../components/AccessibilityStudio'
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
  const { t: s } = useTranslation('accessibility', { keyPrefix: 'studio.dictation' })
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

  return <AccessibilityStudio kind="dictation"><div className="cn-accessstudio-columns cn-dictationstudio">
    <section className="cn-idstudio-panel cn-dictationstudio-input"><h2>{s('inputTitle')}</h2>
      <div className={`cn-dictationstudio-microphone${listening ? ' is-listening' : ''}`}>
        <Button className="cn-dictationstudio-mic" disabled={!supported} variant={listening ? 'danger' : 'primary'} onClick={toggle} aria-label={listening ? t('shared.stop') : t('dictation.start')} aria-pressed={listening}><Icon name={listening ? 'stop-fill' : 'mic-fill'} /></Button>
        <strong role="status">{listening ? t('dictation.listening') : supported ? t('shared.ready') : t('dictation.unsupported')}</strong>
        <p>{s(listening ? 'listeningHint' : 'startHint')}</p>
        <Button className="cn-accessstudio-primary" disabled={!supported} variant={listening ? 'outline-danger' : 'primary'} onClick={toggle}><Icon name={listening ? 'stop-circle' : 'mic'} />{listening ? t('shared.stop') : t('dictation.start')}</Button>
      </div>
      {error ? <p role="alert" className="cn-accessstudio-error">{error}</p> : null}
      <p className="cn-accessstudio-note"><Icon name="info-circle" />{s('textOnly')}</p>
      <p className="cn-accessstudio-note"><Icon name="shield-check" />{t('dictation.privacy')}</p>
    </section>
    <section className="cn-idstudio-panel cn-dictationstudio-output"><h2>{s('outputTitle')}</h2>
      <label className="cn-accessstudio-label">{t('dictation.text')}<Form.Control as="textarea" rows={12} maxLength={100_000} placeholder={s('placeholder')} value={text} onChange={(event) => setText(event.target.value)} /></label>
      {/* Chữ tạm KHÔNG ghi vào ô văn bản: trình duyệt còn sửa nó tới khi chốt, ghi vào là người dùng sửa dở bị đè. */}
      {listening && interim ? <p className="cn-dictationstudio-interim" role="status" data-testid="dictation-interim"><em>{t('dictation.interim')}: {interim}</em></p> : null}
      <p className="cn-accessstudio-note">{s('editHint')}</p>
      <div className="cn-accessstudio-actions"><Button variant="outline-primary" disabled={!text} onClick={() => navigator.clipboard.writeText(text)}><Icon name="copy" />{t('dictation.copy')}</Button><Button disabled={!text} onClick={download}><Icon name="download" />{t('dictation.download')}</Button></div>
    </section>
  </div></AccessibilityStudio>
}
