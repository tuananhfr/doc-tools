import { useEffect, useState, type ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput, FilePicker, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useVideoTask } from '../hooks/useVideoTask'
import { videoEngineSupported } from '../services/video-engine'
import { formatSeconds } from '../services/video-format'
import { validateVideoFile, VIDEO_ACCEPT } from '../services/video-validation'
import type { VideoOptions } from '../types/video.types'
import styles from './VideoWorkspace.module.css'

const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

const FlowAlert = ({ children }: { children: ReactNode }) => <p className="erp-flow-error" role="alert"><Icon name="x-octagon" /><span>{children}</span></p>

export function VideoWorkspace({ options, children, actionLabel, note }: { options: VideoOptions; children: ReactNode; actionLabel: string; note: string }) {
  const { t } = useTranslation('video')
  const { t: studioCopy } = useTranslation('common', { keyPrefix: options.action === 'audio' ? 'studio.extractAudio' : options.action === 'gif' ? 'studio.gif' : options.action === 'trim' ? 'studio.trimVideo' : 'studio.compressVideo' })
  const studio = options.action === 'compress' || options.action === 'trim' || options.action === 'gif' || options.action === 'audio'
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const task = useVideoTask()
  const inputUrl = useObjectUrl(file)
  const outputUrl = useObjectUrl(task.output?.blob ?? null)
  useEffect(() => setSupported(videoEngineSupported()), [])
  const chooseFile = (next: File | null) => {
    task.reset()
    setDuration(null)
    setFileError('')
    setFile(null)
    if (!next) return
    try { validateVideoFile(next); setFile(next) }
    catch (error) { setFileError(error instanceof Error ? error.message : t('workspace.chooseFailed')) }
  }
  const output = task.output
  const progress = task.progress
  const failure = fileError || task.error
  const saving = output && file ? Math.round((1 - output.blob.size / file.size) * 100) : 0
  // Hai bản: cột phải trên màn rộng, ngay dưới thiết lập khi cột phải bị đẩy xuống cuối trang (<=1024px).
  // Bản kia `display: none` nên trình đọc màn hình không đọc hai lần.
  const actions = (placement: string) => <div className={placement}>
    <div role="status" aria-live="polite" className="erp-tool-result__note">{task.message || (progress ? t(`workspace.phase.${progress.phase}`) : failure ? null : t('workspace.idle'))}</div>
    {failure ? <FlowAlert>{failure}</FlowAlert> : null}
    {progress ? <><progress className={styles.progress} aria-label={t('workspace.progressLabel')} max={100} value={progress.percent ?? undefined} /><p className={styles.note}>{progress.percent === null ? t(`workspace.phase.${progress.phase}`) : t('workspace.progressEstimate', { percent: progress.percent })}</p></> : null}
    <div className={styles.actions}>
      <Button disabled={!file || task.busy || supported === false} onClick={() => { if (file) void task.run(file, options) }}>{studio ? <Icon name={task.busy ? 'hourglass-split' : options.action === 'gif' ? 'images' : options.action === 'trim' ? 'scissors' : options.action === 'audio' ? 'music-note-beamed' : 'arrows-collapse'} className="me-2" /> : null}{task.busy ? t('workspace.processing') : actionLabel}</Button>
      {task.busy ? <Button variant="outline-secondary" onClick={task.cancel}>{t('workspace.cancel')}</Button> : null}
    </div>
  </div>
  const picker = <FilePicker accept={VIDEO_ACCEPT} multiple={false} title={t('workspace.chooseVideo')} hint={t('workspace.limits')} compact={Boolean(file)} loading={null} disabled={task.busy} onFiles={files => chooseFile(files[0] ?? null)} />
  return <ToolBoard layout="balanced" className={`cn-video-workspace${studio ? ' cn-video-studio' : ''}`} after={studio ? <div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studioCopy('stepChoose'), studioCopy('stepSet'), studioCopy('stepSave')]} tip={studioCopy('tip')} /></div> : undefined} side={<div className="erp-tool-result">
    {studio ? <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name={options.action === 'audio' ? 'headphones' : options.action === 'gif' ? 'file-earmark-image' : 'file-earmark-play'} /></span><div><h2>{t('workspace.result')}</h2><p>{studioCopy('resultHint')}</p></div></div> : <p className="erp-tool-result__label">{t('workspace.result')}</p>}
    {studio && !output ? <div className="cn-video-empty" aria-hidden="true"><Icon name={options.action === 'audio' ? 'soundwave' : options.action === 'gif' ? 'images' : 'play-circle'} /><span /><span /></div> : null}
    <p className={`erp-tool-result__value${output ? '' : ' erp-tool-result__value--empty'} ${styles.name}`}>{output ? sizeLabel(output.blob.size) : t('workspace.noOutput')}</p>
    {actions(styles.sideActions)}
    {output ? <>
      <p className={`${styles.name} mt-3`}>{output.name}</p>
      {options.action === 'compress' ? <p className={styles.note}>{saving > 0 ? t('workspace.smaller', { percent: saving }) : t('workspace.notSmaller')}</p> : null}
      {!outputUrl ? null : output.blob.type.startsWith('video/') ? <video className={styles.preview} src={outputUrl} controls playsInline preload="metadata" aria-label={t('workspace.outputVideo')} /> : output.blob.type.startsWith('audio/') ? <audio className={styles.audio} src={outputUrl} controls preload="metadata" aria-label={t('workspace.outputAudio')} /> : <img className={styles.preview} src={outputUrl} alt={t('workspace.outputGif')} />}
      <Button className={`mt-3${studio ? ' cn-video-download' : ''}`} variant={studio ? 'primary' : 'outline-primary'} onClick={() => downloadOutput({ name: output.name, blob: output.blob })}>{studio ? <Icon name="download" className="me-2" /> : null}{t('workspace.download')}</Button>
    </> : null}
  </div>}>
    {studio ? <ToolPanel title={studioCopy('inputTitle')} actions={<span className="cn-studio-small-icon"><Icon name="film" /></span>}>{picker}</ToolPanel> : picker}
    <ToolPanel title={t('workspace.settingsLegend')} actions={studio ? <span className="cn-studio-small-icon"><Icon name="sliders2" /></span> : undefined}>

      {supported === false ? <FlowAlert>{t('workspace.unsupported')}</FlowAlert> : null}
      {file ? <p className={`${styles.name} mt-3`}>{file.name} · {sizeLabel(file.size)}{duration !== null ? ` · ${t('workspace.seconds', { seconds: formatSeconds(duration) })}` : ''}</p> : null}
      {file && inputUrl ? <>
        <video key={inputUrl} className={styles.preview} src={inputUrl} controls playsInline preload="metadata" aria-label={t('workspace.sourceVideo')} onLoadedMetadata={(event) => { const value = event.currentTarget.duration; setDuration(Number.isFinite(value) ? value : null) }} />
        <p className={styles.note}>{t('workspace.playbackHint')}</p></> : null}
      {options.action === 'trim' || options.action === 'gif' ? <p className="cn-studio-form-hint cn-video-trim-hint"><Icon name={options.action === 'gif' ? 'images' : 'scissors'} />{studioCopy('rangeHint')}</p> : null}
      <fieldset disabled={task.busy} className={styles.settings}><legend className="visually-hidden">{t('workspace.settingsLegend')}</legend>{children}</fieldset>
      {actions(styles.mainActions)}

      <p className={`${styles.note} mt-3`}>{note}</p>
      <p className={styles.note}>{t('workspace.engineNote')}</p>
      <a className={styles.note} href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('workspace.license')}</a>
    </ToolPanel>
  </ToolBoard>
}
