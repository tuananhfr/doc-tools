import type { ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import type { useVideoTask } from '../hooks/useVideoTask'
import type { VideoOptions } from '../types/video.types'
import { formatSeconds } from '../services/video-format'
import { MediaStudio } from './MediaStudio'

interface Props {
  file: File | null
  inputUrl: string | null
  outputUrl: string | null
  duration: number | null
  onDuration: (value: number | null) => void
  supported: boolean | null
  task: ReturnType<typeof useVideoTask>
  options: Extract<VideoOptions, { action: 'audio' }>
  picker: ReactNode
  children: ReactNode
  failure: string
  note: string
}

export function AudioExtractStudio({ file, inputUrl, outputUrl, duration, onDuration, supported, task, options, picker, children, failure, note }: Props) {
  const { t } = useTranslation('video')
  const { t: s } = useTranslation('common', { keyPrefix: 'studio.extractAudio' })
  const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`
  const output = task.output
  return <MediaStudio kind="audio"><div className="cn-media-editor cn-audiostudio-editor">
    <section className="cn-idstudio-panel cn-trimstudio-upload"><h2>1. {s('inputTitle')}</h2><div className="cn-convertstudio-upload">{picker}</div>
      {file ? <div className="cn-media-file"><Icon name="file-earmark-play" /><div><strong>{file.name}</strong><span>{size(file.size)}{duration !== null ? ` · ${formatSeconds(duration)} s` : ''}</span></div></div> : null}
      <p className="cn-media-note"><Icon name="shield-check" />{t('mediaStudio.trim.privacy')}</p>
      <p className="cn-media-hint">{t('workspace.engineNote')}</p><a className="cn-media-license" href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('workspace.license')}</a>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-options"><h2>2. {t('audio.format')}</h2>
      {inputUrl ? <video key={inputUrl} src={inputUrl} controls playsInline preload="metadata" aria-label={t('workspace.sourceVideo')} onLoadedMetadata={event => onDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} /> : <div className="cn-media-placeholder"><Icon name="film" /><strong>{t('workspace.chooseVideo')}</strong></div>}
      {inputUrl ? <p className="cn-media-hint">{t('workspace.playbackHint')}</p> : null}
      <fieldset disabled={task.busy} className="cn-trimstudio-fields">{children}</fieldset><p className="cn-media-note"><Icon name="info-circle" />{note}</p>
    </section>
    <section className="cn-idstudio-panel cn-trimstudio-output"><h2>3. {t('workspace.result')}</h2>
      <div className="cn-media-format"><Icon name="file-earmark-music" /><div><strong>{options.format.toUpperCase()}</strong><span>{options.format === 'm4a' ? 'AAC' : options.format === 'mp3' ? t('audio.mp3') : t('audio.wav')}</span></div><Icon name="check-circle-fill" /></div>
      {supported === false ? <p className="cn-media-error" role="alert">{t('workspace.unsupported')}</p> : null}
      <div role="status" aria-live="polite" className="cn-media-hint">{task.message || (task.progress ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.idle'))}</div>
      {failure ? <p className="cn-media-error" role="alert">{failure}</p> : null}
      {task.progress ? <><progress className="cn-media-progress" aria-label={t('workspace.progressLabel')} max={100} value={task.progress.percent ?? undefined} /><p className="cn-media-hint">{task.progress.percent === null ? t(`workspace.phase.${task.progress.phase}`) : t('workspace.progressEstimate', { percent: task.progress.percent })}</p></> : null}
      <Button className="cn-media-run" disabled={!file || task.busy || supported !== true} onClick={() => { if (file) void task.run(file, options) }}><Icon name={task.busy ? 'hourglass-split' : 'music-note-beamed'} />{task.busy ? t('workspace.processing') : t('audio.action')}</Button>
      {task.busy ? <Button variant="outline-secondary" className="cn-media-run" onClick={task.cancel}>{t('workspace.cancel')}</Button> : null}
      {output && outputUrl ? <div className="cn-trimstudio-result cn-audiostudio-result"><audio src={outputUrl} controls preload="metadata" aria-label={t('workspace.outputAudio')} /><strong>{output.name}</strong><span>{size(output.blob.size)}</span><Button onClick={() => downloadOutput({ name: output.name, blob: output.blob })}><Icon name="download" />{t('workspace.download')}</Button></div> : <div className="cn-audiostudio-empty"><Icon name="soundwave" /><p className="cn-media-hint">{s('resultHint')}</p></div>}
    </section>
  </div></MediaStudio>
}
