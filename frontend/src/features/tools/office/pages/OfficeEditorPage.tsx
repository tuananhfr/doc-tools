import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { ToolLeaveGuard } from '@/features/tools/hub/components/ToolLeaveGuard'
import { WorkspaceGuide } from '@/features/tools/hub'
import { OFFICE_APPS, type OfficeAppId } from '../config/office-apps'
import { OfficeCloseDialog } from '../components/OfficeCloseDialog'
import { useOfficeEditor } from '../hooks/useOfficeEditor'
import { useOfficeFullscreen } from '../hooks/useOfficeFullscreen'

export default function OfficeEditorPage({ app }: { app: OfficeAppId }) {
  const { t } = useTranslation('common')
  const { t: tc } = useTranslation('catalog')
  const engine = OFFICE_APPS[app]
  const studio = app === 'office-word' || app === 'office-sheet'
  const guideKey = app === 'office-sheet' ? 'studio.sheet' : 'studio.office'
  const editor = useOfficeEditor(app)
  const [confirmClose, setConfirmClose] = useState(false)
  const active = editor.state === 'open'
  const busy = editor.state === 'checking'
  const viewport = useOfficeFullscreen(active)
  const frameId = 'cn-office-editor-' + app
  const toolName = tc(`tools.${app}.name`)
  const fullscreenLabel = t(viewport.nativeFullscreen ? 'office.exitFullscreen' : 'office.fullscreen')

  return (
    <section ref={viewport.workspaceRef} className={'cn-office' + (studio ? ' cn-office--studio' : '') + (active ? ' cn-office--open' : '') + (viewport.expanded ? ' cn-office--expanded' : '')} data-office-state={editor.state} aria-label={toolName}>
      <ToolLeaveGuard active={active} message={t('office.leave')} />
      <div className="cn-office-toolbar">
        <div className="cn-office-identity">
          {active ? <><Icon name={app === 'office-word' ? 'file-earmark-word' : app === 'office-sheet' ? 'file-earmark-spreadsheet' : 'file-earmark-slides'} className="cn-office-tool-icon" /><strong className="cn-office-title">{toolName}</strong><span className="cn-office-engine">{engine.name} · {engine.extension}</span></> : null}
          <span className="cn-office-beta">{t('office.beta')}</span>
          {!active ? <><span>{engine.name} · {engine.vendor}</span><span className="cn-office-format">{engine.extension}</span></> : null}
        </div>
        {active ? (
          <div className="cn-office-actions">
            <Button variant="outline-secondary" data-office-expand aria-controls={frameId} aria-expanded={viewport.expanded} disabled={viewport.busy} onClick={() => viewport.expanded ? void viewport.minimize() : viewport.expand()}>
              <Icon name={viewport.expanded ? 'dash-lg' : 'arrows-angle-expand'} /> {t(viewport.expanded ? 'office.minimize' : 'office.expand')}
            </Button>
            <Button variant="primary" aria-label={fullscreenLabel} aria-pressed={viewport.nativeFullscreen} aria-controls={frameId} disabled={viewport.busy} aria-busy={viewport.busy} onClick={() => void viewport.toggleNative()}>
              <Icon name={viewport.nativeFullscreen ? 'fullscreen-exit' : 'arrows-fullscreen'} />
              <span className="cn-office-fullscreen-label">{fullscreenLabel}</span>
              <span className="cn-office-fullscreen-short">{t(viewport.nativeFullscreen ? 'office.exitFullscreenShort' : 'office.fullscreen')}</span>
            </Button>
            <Button variant="outline-secondary" aria-label={t('office.close')} disabled={viewport.busy} onClick={() => setConfirmClose(true)}><Icon name="x-lg" /> {t('office.closeShort')}</Button>
          </div>
        ) : null}
      </div>
      {active && viewport.unavailable ? <p className="cn-office-fullscreen-note" role="status">{t('office.fullscreenUnavailable')}</p> : null}
      {active ? (
        <iframe id={frameId} className="cn-office-frame" src={editor.src} title={toolName}
          allow="fullscreen; clipboard-read; clipboard-write" referrerPolicy="no-referrer" />
      ) : (
        <div className={studio ? 'cn-office-welcome-layout' : undefined}>
        <div className="cn-office-start">
          {app === 'office-word' ? <div className="cn-office-document" aria-hidden="true"><span><Icon name="file-earmark-word" /></span><i /><i /><i /><i /><i /><b><Icon name="pencil" /></b></div> : app === 'office-sheet' ? <div className="cn-office-sheet-art" aria-hidden="true"><span><Icon name="file-earmark-spreadsheet" /></span><div>{['', 'A', 'B', 'C', '1', '', '', '', '2', '', '', '', '3', '', '', ''].map((text, index) => <i key={index}>{text}</i>)}</div><b><Icon name="table" /></b></div> : <Icon name="file-earmark-richtext" className="cn-office-start-icon" />}
          <h2>{t(app === 'office-sheet' ? 'studio.sheet.heading' : 'office.heading')}</h2>
          <p>{t('office.languageNote')}</p>
          <p>{t('office.fileNote', { extension: engine.extension })}</p>
          <p className="cn-office-download">{t('office.download', { size: engine.downloadMegabytes })}</p>
          {editor.state === 'unsupported' ? <p className="cn-office-error" role="alert">{t('office.unsupported')}</p> : null}
          {editor.state === 'unavailable' ? <p className="cn-office-error" role="alert">{t('office.unavailable')}</p> : null}
          <Button variant="primary" data-office-open disabled={busy || editor.state === 'unsupported'} aria-busy={busy} onClick={() => { viewport.expand(); void editor.open() }}>
            <Icon name={busy ? 'hourglass-split' : 'box-arrow-up-right'} /> {busy ? t('office.opening') : t('office.open')}
          </Button>
          <p className="cn-office-limit">{t('office.limit')}</p>
        </div>
        {studio ? <aside className="cn-office-guide"><WorkspaceGuide steps={[t(`${guideKey}.stepOpen`), t(`${guideKey}.stepEdit`), t(`${guideKey}.stepSave`)]} tip={t(`${guideKey}.tip`)} note={t(`${guideKey}.note`)} /></aside> : null}
        </div>
      )}
      <OfficeCloseDialog show={confirmClose} onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); viewport.reset(); editor.close() }} />
    </section>
  )
}
