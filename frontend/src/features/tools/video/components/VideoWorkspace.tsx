import { useEffect, useState, type ReactNode } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useVideoTask } from '../hooks/useVideoTask'
import { videoEngineSupported } from '../services/video-engine'
import { validateVideoFile, VIDEO_ACCEPT } from '../services/video-validation'
import type { VideoOptions } from '../types/video.types'
import styles from './VideoWorkspace.module.css'

const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

export function VideoWorkspace({ options, children, actionLabel, note }: { options: VideoOptions; children: ReactNode; actionLabel: string; note: string }) {
  const { t } = useTranslation('video')
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
  const saving = output && file ? Math.round((1 - output.blob.size / file.size) * 100) : 0
  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('workspace.result')}</p>
    <p className={`erp-tool-result__value ${styles.name}`}>{output ? sizeLabel(output.blob.size) : t('workspace.noOutput')}</p>
    <div role="status" aria-live="polite" className="erp-tool-result__note">{fileError || task.message || (progress ? t(`workspace.phase.${progress.phase}`) : t('workspace.idle'))}</div>
    {progress ? <><progress className={styles.progress} aria-label={t('workspace.progressLabel')} max={100} value={progress.percent ?? undefined} /><p className={styles.note}>{progress.percent === null ? t(`workspace.phase.${progress.phase}`) : t('workspace.progressEstimate', { percent: progress.percent })}</p></> : null}
    <div className={styles.actions}>
      <Button disabled={!file || task.busy || supported === false} onClick={() => { if (file) void task.run(file, options) }}>{task.busy ? t('workspace.processing') : actionLabel}</Button>
      {task.busy ? <Button variant="outline-secondary" onClick={task.cancel}>{t('workspace.cancel')}</Button> : null}
    </div>
    {output ? <>
      <p className={`${styles.name} mt-3`}>{output.name}</p>
      {options.action === 'compress' ? <p className={styles.note}>{saving > 0 ? t('workspace.smaller', { percent: saving }) : t('workspace.notSmaller')}</p> : null}
      {output.blob.type.startsWith('video/') ? <video className={styles.preview} src={outputUrl} controls playsInline preload="metadata" aria-label={t('workspace.outputVideo')} /> : output.blob.type.startsWith('audio/') ? <audio className={styles.audio} src={outputUrl} controls preload="metadata" aria-label={t('workspace.outputAudio')} /> : <img className={styles.preview} src={outputUrl} alt={t('workspace.outputGif')} />}
      <Button className="mt-3" variant="outline-primary" onClick={() => downloadOutput({ name: output.name, blob: output.blob })}>{t('workspace.download')}</Button>
    </> : null}
  </div>}>
    <ToolPanel title={t('workspace.panelTitle')}>
      <label className="erp-flow-field__label">{t('workspace.chooseVideo')}<Form.Control disabled={task.busy} type="file" accept={VIDEO_ACCEPT} onChange={(event) => chooseFile((event.target as HTMLInputElement).files?.[0] ?? null)} /></label>
      <p className={`${styles.note} mt-2`}>{t('workspace.limits')}</p>
      {supported === false ? <p role="alert">{t('workspace.unsupported')}</p> : null}
      {file ? <><p className={`${styles.name} mt-3`}>{file.name} · {sizeLabel(file.size)}{duration !== null ? ` · ${t('workspace.seconds', { seconds: duration.toFixed(2) })}` : ''}</p>
        <video key={inputUrl} className={styles.preview} src={inputUrl} controls playsInline preload="metadata" aria-label={t('workspace.sourceVideo')} onLoadedMetadata={(event) => { const value = event.currentTarget.duration; setDuration(Number.isFinite(value) ? value : null) }} />
        <p className={styles.note}>{t('workspace.playbackHint')}</p></> : null}
      <fieldset disabled={task.busy} className={styles.settings}><legend className="visually-hidden">{t('workspace.settingsLegend')}</legend>{children}</fieldset>
      <p className={`${styles.note} mt-3`}>{note}</p>
      <p className={styles.note}>{t('workspace.engineNote')}</p>
      <a className={styles.note} href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('workspace.license')}</a>
    </ToolPanel>
  </ToolBoard>
}
