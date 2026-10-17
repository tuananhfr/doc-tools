import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import type { useVideoTask } from '../hooks/useVideoTask'
import type { VideoOptions } from '../types/video.types'
import { formatSeconds } from '../services/video-format'
import { validateVideoOptions } from '../services/video-validation'
import { MediaStudio } from './MediaStudio'
import { useFilmstrip, type TrimRangeControls } from './TrimVideoStudio'

interface Props {
  file: File | null
  inputUrl: string | null
  outputUrl: string | null
  duration: number | null
  onDuration: (value: number | null) => void
  supported: boolean | null
  task: ReturnType<typeof useVideoTask>
  options: Extract<VideoOptions, { action: 'compress' | 'gif' }>
  picker: ReactNode
  children: ReactNode
  failure: string
  note: string
  range?: TrimRangeControls
}

/** Keep the processing engine and file state shared with the other video tools. */
export function VideoProcessStudio({ file, inputUrl, outputUrl, duration, onDuration, supported, task, options, picker, children, failure, note, range }: Props) {
  const { t } = useTranslation('video')
  const { t: s } = useTranslation('video', { keyPrefix: `mediaStudio.${options.action}` })
  const gif = options.action === 'gif'
  const player = useRef<HTMLVideoElement>(null)
  const [previewing, setPreviewing] = useState(false)
  const start = gif ? options.start : 0
  const end = gif ? options.end : duration ?? 0
  const frames = useFilmstrip(gif ? inputUrl : null, duration)
  let invalid = ''
  try { validateVideoOptions(options) } catch (error) { invalid = error instanceof Error ? error.message : t('errors.badRange') }
  if (!invalid && gif && duration !== null && end > duration + .001) invalid = t('errors.endPastDuration', { seconds: formatSeconds(duration) })
  useEffect(() => { setPreviewing(false); player.current?.pause() }, [inputUrl, start, end])
  const preview = async () => {
    if (!player.current || invalid) return
    player.current.currentTime = start
    setPreviewing(true)
    try { await player.current.play() } catch { setPreviewing(false) }
  }
  const output = task.output
  const saving = output && file ? Math.round((1 - output.blob.size / file.size) * 100) : 0
  const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`
  const slider = (which: 'start' | 'end', value: number, onChange: (value: string) => void) => <label className="cn-trimstudio-slider"><span>{t(`timeRange.${which}`)}</span><input type="range" min={0} max={duration ?? 1} step={.01} value={Math.max(0, Math.min(duration ?? 1, Number.isFinite(value) ? value : 0))} disabled={!duration || task.busy} onChange={event => onChange(formatSeconds(Number(event.target.value)))} /></label>
  return <MediaStudio kind={options.action}><div className={`cn-media-editor cn-processstudio-editor cn-processstudio--${options.action}`}>
    <section className="cn-idstudio-panel cn-trimstudio-upload"><h2>{s('inputTitle')}</h2><div className="cn-convertstudio-upload">{picker}</div>
      {file ? <div className="cn-media-file"><Icon name="file-earmark-play" /><div><strong>{file.name}</strong><span>{size(file.size)}{duration !== null ? ` · ${formatSeconds(duration)} s` : ''}</span></div></div> : null}
      <p className="cn-media-note"><Icon name="shield-check" />{t('mediaStudio.trim.privacy')}</p>
      <p className="cn-media-hint">{t('workspace.engineNote')}</p>
      <a className="cn-media-license" href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('workspace.license')}</a>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-options"><h2>{s('optionsTitle')}</h2>
      {inputUrl ? <video key={inputUrl} ref={player} src={inputUrl} controls playsInline preload="metadata" aria-label={t('workspace.sourceVideo')} onLoadedMetadata={event => onDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} onTimeUpdate={event => { if (gif && previewing && event.currentTarget.currentTime >= end) { event.currentTarget.pause(); setPreviewing(false) } }} onEnded={() => setPreviewing(false)} /> : <div className="cn-media-placeholder"><Icon name={gif ? 'images' : 'film'} /><strong>{s('emptyTitle')}</strong><p>{s('emptyHint')}</p></div>}
      {inputUrl ? <p className="cn-media-hint">{t('workspace.playbackHint')}</p> : null}
      {gif && duration !== null && duration > 0 ? <div className="cn-trimstudio-timeline"><div className="cn-trimstudio-filmstrip" aria-hidden="true">{frames.map((src, index) => <img key={index} src={src} alt="" />)}{!invalid ? <span style={{ insetInlineStart: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%` }} /> : null}</div><div className="cn-trimstudio-times"><span>0 s</span><span>{formatSeconds(duration)} s</span></div></div> : null}
      {gif && range ? <div className="cn-trimstudio-sliders">{slider('start', start, range.onStart)}{slider('end', end, range.onEnd)}</div> : null}
      <fieldset disabled={task.busy} className="cn-trimstudio-fields">{children}</fieldset>
      {invalid ? <p className="cn-media-error" role="alert">{invalid}</p> : null}
      {gif ? <Button variant="outline-primary" className="cn-trimstudio-preview" disabled={!inputUrl || duration === null || Boolean(invalid)} onClick={() => void preview()}><Icon name="play-circle" />{t('mediaStudio.trim.preview')}</Button> : null}
      <p className="cn-media-hint">{note}</p>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-output"><h2>{s('outputTitle')}</h2>
      <div className="cn-media-format"><Icon name={gif ? 'file-earmark-image' : 'file-earmark-play'} /><div><strong>{gif ? 'GIF' : 'MP4'}</strong><span>{gif ? `${options.width} px · ${options.fps} FPS` : `H.264 / AAC · ≤ ${options.edge} px`}</span></div><Icon name="check-circle-fill" /></div>
      {supported === false ? <p className="cn-media-error" role="alert">{t('workspace.unsupported')}</p> : null}
      <div role="status" aria-live="polite" className="cn-media-hint">{task.message || (task.progress ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.idle'))}</div>
      {failure ? <p className="cn-media-error" role="alert">{failure}</p> : null}
      {task.progress ? <><progress className="cn-media-progress" aria-label={t('workspace.progressLabel')} max={100} value={task.progress.percent ?? undefined} /><p className="cn-media-hint">{task.progress.percent === null ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.progressEstimate', { percent: task.progress.percent })}</p></> : null}
      <Button className="cn-media-run" disabled={!file || task.busy || supported !== true || Boolean(invalid)} onClick={() => { if (file) void task.run(file, options) }}><Icon name={task.busy ? 'hourglass-split' : gif ? 'images' : 'arrows-collapse'} />{task.busy ? t('workspace.processing') : t(gif ? 'gif.action' : 'compress.action')}</Button>
      {task.busy ? <Button variant="outline-secondary" className="cn-media-run" onClick={task.cancel}>{t('workspace.cancel')}</Button> : null}
      {output && outputUrl ? <div className="cn-trimstudio-result">{gif ? <img className="cn-processstudio-gif" src={outputUrl} alt={t('workspace.outputGif')} /> : <video src={outputUrl} controls playsInline preload="metadata" aria-label={t('workspace.outputVideo')} />}<strong>{output.name}</strong><span>{size(output.blob.size)}</span>{!gif ? <p className="cn-media-hint">{saving > 0 ? t('workspace.smaller', { percent: saving }) : t('workspace.notSmaller')}</p> : null}<Button onClick={() => downloadOutput({ name: output.name, blob: output.blob })}><Icon name="download" />{t('workspace.download')}</Button></div> : <p className="cn-media-note"><Icon name="info-circle" />{s('resultHint')}</p>}
    </section>
  </div></MediaStudio>
}
