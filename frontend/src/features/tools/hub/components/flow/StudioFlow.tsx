import { Button } from 'react-bootstrap'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { FilePicker } from './FilePicker'
import { FileList } from './FileList'
import { FlowProgress } from './FlowProgress'
import { FlowResult } from './FlowResult'
import type { FlowOutput } from '../../types/flow.types'
import type { ToolFlowProps } from './ToolFlow'
import { downloadOutput } from '../../utils/flow-output'
import { recordQualityEvent } from '../../services/quality-events'
import { qualityToolForPath } from '../../services/quality-tool'
import { formatFileSize } from '@/utils/format'
import { SaveToHostButton } from '@/features/embed'

export interface StudioFlowConfig {
  mode: 'process' | 'canvas' | 'ocr'
  inputTitle: string
  optionsTitle: string
  previewTitle: string
  emptyTitle: string
  emptyHint: string
  previewUrl?: string
  preview?: ReactNode
  inlineResult?: boolean
  resultPreview?: (output: FlowOutput) => ReactNode
}

/** Alternative presentation for the existing flow; all tasks and callbacks stay with its owner. */
export function StudioFlow({ config, ...props }: ToolFlowProps & { config: StudioFlowConfig }) {
  const { t } = useTranslation('common')
  const { run, files, stage, options } = props
  const result = run.state.phase === 'done' ? run.state.result : null
  const running = run.state.phase === 'running', locked = running || Boolean(props.pending) || props.loading !== null
  const canvas = config.mode === 'canvas'
  const automaticResult = result && props.automatic ? <div className="cn-auto-result-actions"><Button className="cn-auto-result-download" onClick={() => { downloadOutput(result.output); recordQualityEvent('download', qualityToolForPath(window.location.pathname)) }}><Icon name="download" />{t('result.download')}</Button><SaveToHostButton output={result.output} /><small>{result.output.detail} · {formatFileSize(result.output.blob.size)}</small>{result.notes.filter(note => note.tone === 'warning').map((note, index) => <p className="cn-flowstudio-hint" key={index}>{note.text}</p>)}</div> : null
  const actions = <>
    {run.state.phase === 'idle' && run.state.error ? <p className="erp-flow-error" role="alert" data-code={run.state.error.code}><Icon name="x-octagon" /><span>{t('flow.error', { message: run.state.error.message })}</span></p> : null}
    {run.state.phase === 'running' ? <FlowProgress progress={run.state.progress} onCancel={run.cancel} waitingLabel={props.waitingLabel} /> : <>{!props.automatic || (!result && files.length > 0 && !locked && props.blocked === null) ? <Button className="erp-flow__run cn-flowstudio-run" disabled={props.blocked !== null || locked} onClick={props.onRun}><Icon name={props.runIcon} />{props.automatic ? t('result.restart') : props.runLabel}</Button> : null}{props.blocked && (!props.automatic || files.length > 0) ? <p className="cn-flowstudio-hint">{props.blocked}</p> : null}</>}
  </>
  return <div className={`cn-flowstudio cn-flowstudio--${config.mode}${props.automatic ? ' cn-flowstudio--automatic' : ''}`}>
    {config.mode === 'ocr' && stage ? <div className="cn-flowstudio-review">{stage}</div> : null}
    <section className="cn-idstudio-panel cn-flowstudio-input"><h2>{config.inputTitle}</h2>
      <div className="cn-convertstudio-upload"><FilePicker {...props.picker} compact={files.length > 0} loading={props.loading} disabled={locked} onFiles={props.onAddFiles} extra={props.pickerExtra} /></div>
      {props.rejected.length ? <div className="cn-flowstudio-rejected" role="alert"><ul>{props.rejected.slice(0, 5).map((item, index) => <li key={index}><strong>{item.name}</strong> — {item.reason}</li>)}</ul><Button variant="link" onClick={props.onDismissRejected}>{t('flow.dismiss')}</Button></div> : null}
      {canvas && stage ? <div className="cn-flowstudio-canvas">{stage}</div> : files.length > 0 ? <FileList compact={props.compactFiles || props.automatic} files={files} disabled={locked} onRemove={props.onRemove} onMove={props.onMove} onClear={props.onClear} /> : null}
      {canvas && !stage ? <div className="cn-flowstudio-empty"><Icon name="image" /><strong>{config.emptyTitle}</strong><p>{config.emptyHint}</p></div> : null}
      {props.automatic && !options ? actions : null}
    </section>
    {!props.automatic || options ? <section className="cn-idstudio-panel cn-flowstudio-options">
      {props.automatic ? <details className="cn-auto-settings"><summary>{config.optionsTitle}</summary><fieldset disabled={locked} className="cn-flowstudio-fields">{options}</fieldset></details> : <><h2>{config.optionsTitle}</h2>{props.sideIntro}<fieldset disabled={locked} className="cn-flowstudio-fields">{options}</fieldset></>}
      {actions}
    </section> : null}
    {!canvas ? <section className="cn-idstudio-panel cn-flowstudio-preview"><h2>{config.previewTitle}</h2>
      {config.inlineResult && result ? <div className="cn-flowstudio-inline-result">{automaticResult}{config.resultPreview?.(result.output)}{props.automatic ? null : <FlowResult result={result} onRestart={run.reset} onEdit={props.onEdit} onDownloaded={props.onDownloaded} extra={props.resultExtra} />}</div> : <>{config.preview ?? <><div className="cn-flowstudio-source">{files[0] && (config.previewUrl || files[0].thumbnail) ? <img src={config.previewUrl || files[0].thumbnail} alt={files[0].name} /> : <div className="cn-flowstudio-empty"><Icon name={config.mode === 'ocr' ? 'card-text' : 'images'} /><strong>{config.emptyTitle}</strong><p>{config.emptyHint}</p></div>}</div>
      {files[0] ? <p className="cn-flowstudio-hint">{files[0].name}{files.length > 1 ? ` · ${t('flow.rejectedMore', { count: files.length - 1 })}` : ''}</p> : null}</>}
      <p className="cn-flowstudio-hint">{config.emptyHint}</p></>}
      {props.automatic && !result ? <div className="cn-auto-result-actions"><Button disabled><Icon name="download" />{t('result.download')}</Button></div> : null}
    </section> : null}
  </div>
}
