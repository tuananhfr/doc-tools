import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import type { useVideoTask } from '../hooks/useVideoTask'
import { formatSeconds } from '../services/video-format'
import type { VideoOptions } from '../types/video.types'
import { MediaStudio } from './MediaStudio'

export interface TrimRangeControls {
  onStart: (value: string) => void
  onEnd: (value: string) => void
}

export function useFilmstrip(url: string | null, duration: number | null) {
  const [frames, setFrames] = useState<{ url: string; images: string[] } | null>(null)
  useEffect(() => {
    if (!url || !duration) return
    let alive = true
    const video = document.createElement('video'), canvas = document.createElement('canvas')
    const images: string[] = []
    canvas.width = 144; canvas.height = 82
    video.muted = true; video.preload = 'auto'; video.playsInline = true
    video.onloadedmetadata = () => { if (alive) video.currentTime = duration / 12 }
    video.onseeked = () => {
      if (!alive) return
      try {
        canvas.getContext('2d')?.drawImage(video, 0, 0, 144, 82)
        images.push(canvas.toDataURL('image/jpeg', .65))
        if (images.length < 6) video.currentTime = duration * (images.length + .5) / 6
        else { setFrames({ url, images }); video.removeAttribute('src'); video.load() }
      } catch { video.removeAttribute('src'); video.load() }
    }
    video.src = url
    return () => { alive = false; video.onloadedmetadata = null; video.onseeked = null; video.removeAttribute('src'); video.load(); canvas.width = canvas.height = 0 }
  }, [url, duration])
  return frames?.url === url ? frames.images : []
}

interface TrimVideoStudioProps {
  file: File | null
  inputUrl: string | null
  outputUrl: string | null
  duration: number | null
  onDuration: (value: number | null) => void
  supported: boolean | null
  task: ReturnType<typeof useVideoTask>
  options: Extract<VideoOptions, { action: 'trim' }>
  range?: TrimRangeControls
  picker: ReactNode
  children: ReactNode
  failure: string
  note: string
}

export function TrimVideoStudio({ file, inputUrl, outputUrl, duration, onDuration, supported, task, options, range, picker, children, failure, note }: TrimVideoStudioProps) {
  const { t } = useTranslation('video')
  const { t: s } = useTranslation('video', { keyPrefix: 'mediaStudio.trim' })
  const player = useRef<HTMLVideoElement>(null)
  const [segmentPreview, setSegmentPreview] = useState(false)
  const frames = useFilmstrip(inputUrl, duration)
  const validRange = Number.isFinite(options.start) && Number.isFinite(options.end) && options.start >= 0 && options.end > options.start
  const rangeError = !validRange ? t('errors.badRange') : duration !== null && options.end > duration + .001 ? t('errors.endPastDuration', { seconds: formatSeconds(duration) }) : ''
  const end = Math.min(duration ?? 0, Math.max(0, Number.isFinite(options.end) ? options.end : 0))
  const start = Math.min(end, Math.max(0, Number.isFinite(options.start) ? options.start : 0))
  useEffect(() => { setSegmentPreview(false); player.current?.pause() }, [inputUrl, options.start, options.end])
  const preview = async () => {
    if (!player.current || rangeError) return
    player.current.currentTime = options.start
    setSegmentPreview(true)
    try { await player.current.play() } catch { setSegmentPreview(false) }
  }
  const slider = (which: 'start' | 'end', value: number, onChange: (value: string) => void) => <label className="cn-trimstudio-slider"><span>{t(`timeRange.${which}`)}</span><input type="range" min={0} max={duration ?? 1} step={.01} value={value} disabled={!duration || task.busy} onChange={event => onChange(formatSeconds(Number(event.target.value)))} /></label>
  return <MediaStudio kind="trim"><div className="cn-media-editor cn-trimstudio-editor">
    <section className="cn-idstudio-panel cn-trimstudio-upload"><h2>{s('inputTitle')}</h2><div className="cn-convertstudio-upload">{picker}</div>
      {file ? <div className="cn-media-file"><Icon name="file-earmark-play" /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB{duration !== null ? ` · ${formatSeconds(duration)} s` : ''}</span></div></div> : null}
      <p className="cn-media-note"><Icon name="shield-check" />{s('privacy')}</p>
      <p className="cn-media-hint">{t('workspace.engineNote')}</p>
      <a className="cn-media-license" href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('workspace.license')}</a>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-options"><h2>{s('optionsTitle')}</h2>
      {inputUrl ? <video key={inputUrl} ref={player} src={inputUrl} controls playsInline preload="metadata" aria-label={t('workspace.sourceVideo')} onLoadedMetadata={event => { const value = event.currentTarget.duration; onDuration(Number.isFinite(value) ? value : null) }} onTimeUpdate={event => { if (segmentPreview && event.currentTarget.currentTime >= options.end) { event.currentTarget.pause(); setSegmentPreview(false) } }} onEnded={() => setSegmentPreview(false)} /> : <div className="cn-media-placeholder"><Icon name="film" /><strong>{s('emptyTitle')}</strong><p>{s('emptyHint')}</p></div>}
      {inputUrl ? <p className="cn-media-hint">{t('workspace.playbackHint')}</p> : null}
      {duration !== null ? <div className="cn-trimstudio-timeline"><div className="cn-trimstudio-filmstrip" aria-hidden="true">{frames.map((src, index) => <img key={index} src={src} alt="" />)}<span style={{ insetInlineStart: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%` }} /></div><div className="cn-trimstudio-times"><span>0 s</span><span>{formatSeconds(duration)} s</span></div></div> : null}
      {range ? <div className="cn-trimstudio-sliders">{slider('start', Number.isFinite(options.start) ? options.start : 0, range.onStart)}{slider('end', Number.isFinite(options.end) ? options.end : 0, range.onEnd)}</div> : null}
      <fieldset disabled={task.busy} className="cn-trimstudio-fields">{children}</fieldset>
      {rangeError ? <p className="cn-media-error" role="alert">{rangeError}</p> : validRange ? <p className="cn-media-selection"><Icon name="scissors" />{s('selection', { seconds: formatSeconds(options.end - options.start) })}</p> : null}
      <Button variant="outline-primary" className="cn-trimstudio-preview" disabled={!inputUrl || duration === null || Boolean(rangeError)} onClick={() => void preview()}><Icon name="play-circle" />{s('preview')}</Button>
      <p className="cn-media-hint">{note}</p>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-output"><h2>{s('outputTitle')}</h2>
      <div className="cn-media-format"><Icon name="file-earmark-play" /><div><strong>MP4</strong><span>H.264 / AAC · ≤ 1080 px</span></div><Icon name="check-circle-fill" /></div>
      {supported === false ? <p className="cn-media-error" role="alert">{t('workspace.unsupported')}</p> : null}
      <div role="status" aria-live="polite" className="cn-media-hint">{task.message || (task.progress ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.idle'))}</div>
      {failure ? <p className="cn-media-error" role="alert">{failure}</p> : null}
      {task.progress ? <><progress className="cn-media-progress" aria-label={t('workspace.progressLabel')} max={100} value={task.progress.percent ?? undefined} /><p className="cn-media-hint">{task.progress.percent === null ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.progressEstimate', { percent: task.progress.percent })}</p></> : null}
      <Button className="cn-media-run" disabled={!file || task.busy || supported !== true || Boolean(rangeError)} onClick={() => { if (file) void task.run(file, options) }}><Icon name={task.busy ? 'hourglass-split' : 'scissors'} />{task.busy ? t('workspace.processing') : t('trim.action')}</Button>
      {task.busy ? <Button variant="outline-secondary" className="cn-media-run" onClick={task.cancel}>{t('workspace.cancel')}</Button> : null}
      {task.output && outputUrl ? <div className="cn-trimstudio-result"><video src={outputUrl} controls playsInline preload="metadata" aria-label={t('workspace.outputVideo')} /><strong>{task.output.name}</strong><span>{(task.output.blob.size / 1024 / 1024).toFixed(2)} MB</span><Button onClick={() => { if (task.output) downloadOutput({ name: task.output.name, blob: task.output.blob }) }}><Icon name="download" />{t('workspace.download')}</Button></div> : <p className="cn-media-note"><Icon name="info-circle" />{s('resultHint')}</p>}
    </section>
  </div></MediaStudio>
}
