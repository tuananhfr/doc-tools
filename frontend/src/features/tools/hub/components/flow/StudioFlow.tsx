import { Button } from 'react-bootstrap'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { FilePicker } from './FilePicker'
import { FileList } from './FileList'
import { FlowProgress } from './FlowProgress'
import { FlowResult } from './FlowResult'
import type { FlowOutput } from '../../types/flow.types'
import type { ToolFlowProps } from './ToolFlow'

export interface StudioFlowConfig {
  mode: 'process' | 'canvas' | 'ocr'
  inputTitle: string
  optionsTitle: string
  previewTitle: string
  emptyTitle: string
  emptyHint: string
  previewUrl?: string
  preview?: ReactNode
  inlineResult?: { sourceLabel: string; resultLabel: string }
  resultPreview?: (output: FlowOutput) => ReactNode
}

/** Alternative presentation for the existing flow; all tasks and callbacks stay with its owner. */
export function StudioFlow({ config, ...props }: ToolFlowProps & { config: StudioFlowConfig }) {
  const { t } = useTranslation('common')
  const { run, files, stage, options } = props
  const result = run.state.phase === 'done' ? run.state.result : null
  const [showSource, setShowSource] = useState(false)
  useEffect(() => { setShowSource(false) }, [result])
  const running = run.state.phase === 'running', locked = running || props.loading !== null
  const canvas = config.mode === 'canvas'
  const actions = <>
    {run.state.phase === 'idle' && run.state.error ? <p className="erp-flow-error" role="alert" data-code={run.state.error.code}><Icon name="x-octagon" /><span>{t('flow.error', { message: run.state.error.message })}</span></p> : null}
    {run.state.phase === 'running' ? <FlowProgress progress={run.state.progress} onCancel={run.cancel} waitingLabel={props.waitingLabel} /> : <><Button className="erp-flow__run cn-flowstudio-run" disabled={props.blocked !== null || locked} onClick={props.onRun}><Icon name={props.runIcon} />{props.runLabel}</Button>{props.blocked ? <p className="cn-flowstudio-hint">{props.blocked}</p> : null}</>}
  </>
  return <div className={`cn-flowstudio cn-flowstudio--${config.mode}`}>
    {config.mode === 'ocr' && stage ? <div className="cn-flowstudio-review">{stage}</div> : null}
    <section className="cn-idstudio-panel cn-flowstudio-input"><h2>{config.inputTitle}</h2>
      <div className="cn-convertstudio-upload"><FilePicker {...props.picker} compact={files.length > 0} loading={props.loading} disabled={locked} onFiles={props.onAddFiles} extra={props.pickerExtra} /></div>
      {props.rejected.length ? <div className="cn-flowstudio-rejected" role="alert"><ul>{props.rejected.slice(0, 5).map((item, index) => <li key={index}><strong>{item.name}</strong> — {item.reason}</li>)}</ul><Button variant="link" onClick={props.onDismissRejected}>{t('flow.dismiss')}</Button></div> : null}
      {canvas && stage ? <div className="cn-flowstudio-canvas">{stage}</div> : files.length > 0 ? <FileList files={files} disabled={locked} onRemove={props.onRemove} onMove={props.onMove} onClear={props.onClear} /> : null}
      {canvas && !stage ? <div className="cn-flowstudio-empty"><Icon name="image" /><strong>{config.emptyTitle}</strong><p>{config.emptyHint}</p></div> : null}
    </section>
    <section className="cn-idstudio-panel cn-flowstudio-options"><h2>{config.optionsTitle}</h2>
      {props.sideIntro}
      <fieldset disabled={locked} className="cn-flowstudio-fields">{options}</fieldset>
      {actions}
    </section>
    {!canvas ? <section className="cn-idstudio-panel cn-flowstudio-preview"><h2>{config.previewTitle}</h2>
      {config.inlineResult ? <div className="cn-idstudio-tabs"><button type="button" disabled={!files.length} aria-pressed={files.length > 0 && (!result || showSource)} onClick={() => setShowSource(true)}>{config.inlineResult.sourceLabel}</button><button type="button" disabled={!result} aria-pressed={Boolean(result) && !showSource} onClick={() => setShowSource(false)}>{config.inlineResult.resultLabel}</button></div> : null}
      {config.inlineResult && result && !showSource ? <div className="cn-flowstudio-inline-result">{config.resultPreview?.(result.output)}<FlowResult result={result} onRestart={run.reset} onEdit={props.onEdit} onDownloaded={props.onDownloaded} extra={props.resultExtra} /></div> : <>{config.preview ?? <><div className="cn-flowstudio-source">{files[0] && (config.previewUrl || files[0].thumbnail) ? <img src={config.previewUrl || files[0].thumbnail} alt={files[0].name} /> : <div className="cn-flowstudio-empty"><Icon name={config.mode === 'ocr' ? 'card-text' : 'images'} /><strong>{config.emptyTitle}</strong><p>{config.emptyHint}</p></div>}</div>
      {files[0] ? <p className="cn-flowstudio-hint">{files[0].name}{files.length > 1 ? ` · ${t('flow.rejectedMore', { count: files.length - 1 })}` : ''}</p> : null}</>}
      <p className="cn-flowstudio-hint">{config.emptyHint}</p></>}
    </section> : null}
  </div>
}
