import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { Button, Form, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { useDebounce } from '@/hooks'
import { numberFormat, speechLanguage } from '@/i18n/intl'
import { ReadErrorNotice } from '../components/ReadErrorNotice'
import { ReadingView } from '../components/ReadingView'
import { ReadLinkPanel } from '../components/ReadLinkPanel'
import { ReadPastePanel } from '../components/ReadPastePanel'
import { ReadPlayerControls } from '../components/ReadPlayerControls'
import { ReadSettings } from '../components/ReadSettings'
import { ReadVoicePanel } from '../components/ReadVoicePanel'
import { READ_LINK_TAB_ENABLED, READ_PART_CHARS } from '../config/read-listen'
import { useDeviceSpeech } from '../hooks/useDeviceSpeech'
import { useOnline } from '../hooks/useOnline'
import { usePiperSpeech } from '../hooks/usePiperSpeech'
import { useReadPosition } from '../hooks/useReadPosition'
import { piperSupported } from '../services/piper-tts'
import type { ReadEngine, ReadFontScale, ReadInputTab, ReadSource } from '../types/read-listen.types'
import { textFingerprint } from '../utils/read-position'
import { pastedSource, splitReadParts } from '../utils/read-source'
import { readInputTabs } from '../utils/read-tabs'
import { neighbourChunkStart, splitSpeechText } from '../utils/speech-chunks'
import { detectSpeechLang, languageName, readNotices, voiceCheck } from '../utils/voice-select'

// Thẻ Tệp kéo theo pdf.js + OCR: chỉ nạp khi người dùng mở thẻ đó, người chỉ dán chữ không phải tải.
const ReadFilePanel = lazy(() => import('../components/ReadFilePanel'))

// Kéo thanh tốc độ bắn hàng chục giá trị; mỗi giá trị là một lần co giãn / đọc lại nên chỉ áp giá trị dừng tay.
const RATE_SETTLE_MS = 300
const formatCount = (value: number) => numberFormat().format(value)
const INPUT_TABS = readInputTabs(READ_LINK_TAB_ENABLED)
const TAB_LABEL = { text: 'readAloud.tabPaste', file: 'readAloud.tabFile', link: 'readAloud.tabLink' } as const satisfies Record<ReadInputTab, string>
const TAB_ICON = { text: 'clipboard', file: 'file-earmark-text', link: 'link-45deg' } as const satisfies Record<ReadInputTab, string>

export default function ReadAloudPage() {
  const { t } = useTranslation('accessibility')
  const hintId = useId()
  const partId = useId()
  const [tab, setTab] = useState<ReadInputTab>('text')
  const [visited, setVisited] = useState<ReadonlySet<ReadInputTab>>(() => new Set<ReadInputTab>(['text']))
  const [pasted, setPasted] = useState('')
  const [fileSource, setFileSource] = useState<ReadSource | null>(null)
  const [linkSource, setLinkSource] = useState<ReadSource | null>(null)
  const [part, setPart] = useState({ key: '', index: 0 })
  const [reading, setReading] = useState('')
  const [rate, setRate] = useState(1)
  const [fontScale, setFontScale] = useState<ReadFontScale>('normal')
  const [engine, setEngine] = useState<ReadEngine>('device')
  const [exported, setExported] = useState(false)
  const [canUsePiper] = useState(piperSupported)
  const settledRate = useDebounce(rate, RATE_SETTLE_MS)
  const device = useDeviceSpeech(settledRate)
  const piper = usePiperSpeech(settledRate)
  const online = useOnline()
  const { enabled: remember, setEnabled: setRemember, recall, save: savePosition } = useReadPosition()

  // Mỗi thẻ giữ nguồn riêng: đổi thẻ rồi quay lại không mất chữ / tệp đã nạp (spec v3 §06).
  const pastedText = useMemo(() => pastedSource(pasted), [pasted])
  const source = tab === 'text' ? pastedText : tab === 'file' ? fileSource : linkSource
  const sourceText = source?.text ?? ''
  const parts = useMemo(() => splitReadParts(sourceText), [sourceText])
  const sourceKey = useMemo(() => textFingerprint(sourceText), [sourceText])
  // Phần đã chọn chỉ áp cho đúng văn bản đó; đổi văn bản là về phần 1 mà không cần effect.
  const partIndex = part.key === sourceKey ? Math.min(part.index, parts.length - 1) : 0
  const partText = sourceText.slice(parts[partIndex].start, parts[partIndex].end)
  const partKey = useMemo(() => textFingerprint(partText), [partText])
  const lang = detectSpeechLang(partText, speechLanguage())
  const voice = voiceCheck(device.voices, lang)
  const notices = readNotices({ engine, deviceSupported: device.supported, piperSupported: canUsePiper, voice, lang, online })

  const active = engine === 'device' ? device.status !== 'idle' : piper.phase === 'loading' || piper.phase === 'speaking' || piper.phase === 'paused'
  const busy = engine === 'device' ? device.status !== 'idle' : piper.phase !== 'idle'
  const speaking = engine === 'device' ? device.status === 'speaking' : piper.phase === 'speaking'
  const paused = engine === 'device' ? device.status === 'paused' : piper.phase === 'paused'
  const highlight = engine === 'device' ? device.highlight : piper.highlight
  const canRead = Boolean(partText.trim()) && !busy && (engine === 'device' ? device.supported : canUsePiper)
  const chunks = useMemo(() => splitSpeechText(reading), [reading])
  const readingKey = useMemo(() => textFingerprint(reading), [reading])
  const current = highlight?.start ?? 0
  const previous = active ? neighbourChunkStart(chunks, current, -1) : null
  const next = active ? neighbourChunkStart(chunks, current, 1) : null
  const resumeOffset = useMemo(() => (busy ? null : recall(partKey)), [busy, recall, partKey])

  const highlightStart = highlight?.start
  useEffect(() => {
    if (highlightStart !== undefined && reading) savePosition(readingKey, highlightStart)
  }, [highlightStart, reading, readingKey, savePosition])

  const stop = () => { device.stop(); piper.stop() }
  const changeEngine = (nextEngine: ReadEngine) => { stop(); setExported(false); setEngine(nextEngine) }
  const changeTab = (nextTab: ReadInputTab) => {
    setTab(nextTab)
    setVisited((seen) => new Set(seen).add(nextTab))
  }
  const pasteInstead = () => changeTab('text')
  const read = (offset = 0) => {
    setExported(false)
    setReading(partText)
    if (engine === 'device') device.speak(partText, lang, offset)
    else piper.speak(partText, offset)
  }
  const jump = (offset: number) => {
    if (engine === 'device') device.seek(offset)
    else piper.speak(reading, offset)
  }
  const pause = () => { if (engine === 'device') device.pause(); else piper.pause() }
  const resume = () => { if (engine === 'device') device.resume(); else piper.resume() }
  const downloadWav = async () => {
    setExported(false)
    const blob = await piper.exportWav(partText)
    if (!blob) return
    downloadOutput({ name: `${t('readAloud.fileName')}.wav`, blob })
    setExported(true)
  }

  const percent = piper.download ? Math.floor(piper.download.loaded / piper.download.total * 100) : null
  const status = paused ? t('readAloud.paused')
    : engine === 'device' ? (speaking ? t('readAloud.speaking') : t('shared.ready'))
      : piper.phase === 'loading' ? (percent === null ? t('readAloud.piperPreparing') : t('readAloud.piperLoading', { percent }))
        : piper.phase === 'speaking' ? t('readAloud.speaking')
          : piper.phase === 'exporting' && piper.exported ? t('readAloud.exporting', { done: formatCount(piper.exported.done), total: formatCount(piper.exported.total) })
            : t('shared.ready')

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('readAloud.device')}</p>
    <p className="erp-tool-result__value" role="status" aria-live="polite">{status}</p>
    {percent !== null ? <ProgressBar now={percent} aria-label={t('readAloud.piperLoading', { percent })} className="mt-2" /> : null}
    <ReadPlayerControls speaking={speaking} paused={paused} busy={busy} canRead={canRead}
      previous={previous} next={next} resumeOffset={resumeOffset}
      onRead={() => read()} onResumeSaved={() => { if (resumeOffset !== null) read(resumeOffset) }}
      onPause={pause} onResume={resume} onStop={stop} onJump={jump}
      extra={engine === 'piper' ? <Button variant="outline-secondary" disabled={!canRead} onClick={() => void downloadWav()}>{t('readAloud.exportWav')}</Button> : null} />
    <ReadVoicePanel engine={engine} notices={notices} language={languageName(lang, speechLanguage())} vietnamese={lang.toLowerCase().startsWith('vi')}
      voiceName={voice.state === 'ok' ? voice.name : null} deviceFailed={device.failed} piperError={piper.error} exported={exported}
      canUsePiper={canUsePiper} onUsePiper={() => changeEngine('piper')} onPasteInstead={tab === 'text' ? undefined : pasteInstead} />
  </div>}>
    <ToolPanel title={t('readAloud.title')}>
      <ToolSegments label={t('readAloud.engine')} value={engine} onChange={changeEngine} options={[
        { value: 'device', label: t('readAloud.engineDevice'), icon: 'phone' },
        { value: 'piper', label: t('readAloud.enginePiper'), icon: 'soundwave' },
      ]} />
      <div className="mt-3">
        <ToolSegments label={t('readAloud.inputMode')} value={tab} onChange={changeTab} disabled={busy}
          options={INPUT_TABS.map((value) => ({ value, label: t(TAB_LABEL[value]), icon: TAB_ICON[value] }))} />
      </div>
      {active ? <>
        <p className="erp-flow-field__label mt-3">{t('readAloud.content')}</p>
        <ReadingView text={reading} highlight={highlight} label={t('readAloud.readingView')} describedBy={hintId} fontScale={fontScale} />
        <p id={hintId} className="erp-tool-result__note mt-1">{t('readAloud.editHint')}</p>
      </> : null}
      {/* Thẻ chỉ bị ẩn, không unmount: giữ chữ, tệp đã nạp và khung kiểm tra OCR đang dở. */}
      <div hidden={active || tab !== 'text'}>
        <ReadPastePanel value={pasted} onChange={setPasted} fontScale={fontScale} />
      </div>
      {visited.has('file') ? <div hidden={active || tab !== 'file'}>
        <Suspense fallback={<p role="status" className="erp-tool-result__note mt-3">{t('readAloud.fileReading')}</p>}>
          <ReadFilePanel source={fileSource} onSource={setFileSource} onPasteInstead={pasteInstead} disabled={busy} />
        </Suspense>
      </div> : null}
      {READ_LINK_TAB_ENABLED && visited.has('link') ? <div hidden={active || tab !== 'link'}>
        <ReadLinkPanel onSource={setLinkSource} onPasteInstead={pasteInstead} />
      </div> : null}
      {!active && tab !== 'text' && source ? source.warnings.map((code) => <ReadErrorNotice key={code} code={code} onPasteInstead={pasteInstead} />) : null}
      {!active && parts.length > 1 ? <div className="mt-3">
        <label className="erp-flow-field__label" htmlFor={partId}>{t('readAloud.partLabel')}</label>
        <Form.Select id={partId} value={partIndex} disabled={busy} onChange={(event) => setPart({ key: sourceKey, index: Number(event.target.value) })}>
          {parts.map((range, index) => <option key={range.start} value={index}>{t('readAloud.partOption', { part: formatCount(index + 1), total: formatCount(parts.length) })}</option>)}
        </Form.Select>
        <p className="erp-tool-result__note mt-1">{t('readAloud.partsNote', { total: formatCount(parts.length), max: formatCount(READ_PART_CHARS) })}</p>
      </div> : null}
      <ReadSettings rate={rate} onRate={setRate} fontScale={fontScale} onFontScale={setFontScale} remember={remember} onRemember={setRemember} />
    </ToolPanel>
  </ToolBoard>
}
