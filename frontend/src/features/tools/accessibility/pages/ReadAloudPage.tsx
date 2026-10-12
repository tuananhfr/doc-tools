import { useId, useState } from 'react'
import { Button, Form, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { numberFormat, speechLanguage } from '@/i18n/intl'
import { withBase } from '@/utils/url'
import { useDeviceSpeech } from '../hooks/useDeviceSpeech'
import { usePiperSpeech } from '../hooks/usePiperSpeech'
import { PIPER_DOWNLOAD_BYTES, piperSupported } from '../services/piper-tts'
import type { PiperErrorCode } from '../types/piper-tts.types'

const MAX_CHARS = 20000
const formatCount = (value: number) => numberFormat().format(value)
const PIPER_ERROR_KEY = {
  MODEL_LOAD: 'readAloud.piperModelFailed',
  PROCESSING_FAILED: 'readAloud.piperFailed',
  UNSUPPORTED: 'readAloud.piperUnsupported',
  TIMEOUT: 'readAloud.piperTimeout',
} as const satisfies Record<PiperErrorCode, string>

type Engine = 'device' | 'piper'

export default function ReadAloudPage() {
  const { t } = useTranslation('accessibility')
  const textId = useId()
  const counterId = useId()
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [engine, setEngine] = useState<Engine>('device')
  const [saved, setSaved] = useState(false)
  const [canUsePiper] = useState(piperSupported)
  const device = useDeviceSpeech()
  const piper = usePiperSpeech()
  const tooLong = text.length > MAX_CHARS
  const input = text.slice(0, MAX_CHARS)
  const busy = engine === 'device' ? device.speaking : piper.phase !== 'idle'
  const canRead = Boolean(input.trim()) && !busy && (engine === 'device' ? device.supported : canUsePiper)

  const stop = () => { device.stop(); piper.stop() }
  const changeEngine = (next: Engine) => { stop(); setSaved(false); setEngine(next) }
  const read = () => {
    setSaved(false)
    if (engine === 'device') device.speak(input, rate)
    else piper.speak(input, rate)
  }
  const save = async () => {
    setSaved(false)
    const blob = await piper.exportWav(input, rate)
    if (!blob) return
    downloadOutput({ name: `${t('readAloud.fileName')}.wav`, blob })
    setSaved(true)
  }
  const changeRate = (value: number) => { setRate(value); piper.setRate(value) }

  const percent = piper.download ? Math.floor(piper.download.loaded / piper.download.total * 100) : null
  const status = engine === 'device'
    ? (device.speaking ? t('readAloud.speaking') : t('shared.ready'))
    : piper.phase === 'loading' ? (percent === null ? t('readAloud.piperPreparing') : t('readAloud.piperLoading', { percent }))
      : piper.phase === 'speaking' ? t('readAloud.speaking')
        : piper.phase === 'exporting' && piper.exported ? t('readAloud.exporting', { done: formatCount(piper.exported.done), total: formatCount(piper.exported.total) })
          : t('shared.ready')

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('readAloud.device')}</p>
    <p className="erp-tool-result__value" role="status" aria-live="polite">{status}</p>
    {percent !== null ? <ProgressBar now={percent} aria-label={t('readAloud.piperLoading', { percent })} className="mt-2" /> : null}
    <div className="d-flex flex-wrap gap-2 mt-3">
      <Button disabled={!canRead} onClick={read}>{t('readAloud.read')}</Button>
      <Button variant="outline-secondary" disabled={!busy} onClick={stop}>{t('shared.stop')}</Button>
      {engine === 'piper' ? <Button variant="outline-secondary" disabled={!canRead} onClick={() => void save()}>{t('readAloud.exportWav')}</Button> : null}
    </div>
    {engine === 'device' ? <>
      {device.supported && device.voice === 'missing' ? <p role="status" className="erp-tool-result__note mt-3"><strong>{t('readAloud.noVoice')}</strong></p> : null}
      {device.failed ? <p role="alert" className="erp-tool-result__note mt-3"><strong>{t('readAloud.deviceFailed')}</strong></p> : null}
      <p className="erp-tool-result__note mt-3">{device.supported ? t('readAloud.voiceNote') : t('readAloud.unsupported')}</p>
    </> : <>
      {piper.error ? <p role="alert" className="erp-tool-result__note mt-3"><strong>{t(PIPER_ERROR_KEY[piper.error])}</strong></p> : null}
      {saved ? <p role="status" className="erp-tool-result__note mt-3">{t('readAloud.exportDone')}</p> : null}
      <p className="erp-tool-result__note mt-3">{canUsePiper ? t('readAloud.piperNote', { size: formatCount(Math.round(PIPER_DOWNLOAD_BYTES / 1e6)) }) : t('readAloud.piperUnsupported')}</p>
      {speechLanguage().split('-')[0] !== 'vi' ? <p className="erp-tool-result__note mt-2">{t('readAloud.piperVietnameseOnly')}</p> : null}
      <p className="erp-tool-result__note mt-2">{t('readAloud.credit')} <a href={withBase('/vendor/tts/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('readAloud.license')}</a></p>
    </>}
  </div>}>
    <ToolPanel title={t('readAloud.title')}>
      <ToolSegments label={t('readAloud.engine')} value={engine} onChange={changeEngine} options={[
        { value: 'device', label: t('readAloud.engineDevice'), icon: 'phone' },
        { value: 'piper', label: t('readAloud.enginePiper'), icon: 'soundwave' },
      ]} />
      <label className="erp-flow-field__label mt-3" htmlFor={textId}>{t('readAloud.content')}</label>
      <Form.Control id={textId} as="textarea" rows={12} value={text} aria-describedby={counterId} onChange={(event) => setText(event.target.value)} />
      <p id={counterId} className={`erp-tool-result__note mt-1${tooLong ? ' text-danger' : ''}`}>
        {t('readAloud.counter', { used: formatCount(text.length), max: formatCount(MAX_CHARS) })}
        {tooLong ? <span className="d-block">{t('readAloud.tooLong', { max: formatCount(MAX_CHARS) })}</span> : null}
      </p>
      <label className="erp-flow-field__label mt-3">{t('readAloud.rate', { rate: rate.toFixed(1) })}
        <Form.Range min={0.5} max={2} step={0.1} value={rate} onChange={(event) => changeRate(Number(event.target.value))} />
      </label>
    </ToolPanel>
  </ToolBoard>
}
