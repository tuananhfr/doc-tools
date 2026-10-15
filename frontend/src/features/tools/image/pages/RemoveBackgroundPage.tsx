import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FilePicker, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { BackgroundRemovalControls } from '../components/BackgroundRemovalControls'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { HandoffButton } from '../components/HandoffButton'
import { idPhotoFill } from '../utils/handoff-file'

export default function RemoveBackgroundPage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.background' })
  const tool = useBackgroundRemoval()
  return <ToolBoard className="cn-background-workspace" layout="compact" side={<>
    <section className="cn-studio-card cn-background-settings">
      <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="sliders2" /></span><div><h2>{studio('settings')}</h2><p>{studio('settingsHint')}</p></div></div>
      <div className="cn-background-status" role="status" aria-live="polite"><strong>{tool.name || t('removeBg.noImage')}</strong><p>{tool.busy ? <Spinner as="span" size="sm" aria-hidden="true" className="me-2" /> : null}{tool.message || t('removeBg.idle')}</p></div>
      <BackgroundRemovalControls {...tool} showPicker={false} ready={tool.phase === 'ready'} />
      <div className="cn-background-download"><Button disabled={tool.phase !== 'ready'} onClick={tool.save}><Icon name="download" className="me-2" />{t('removeBg.download')}</Button><HandoffButton target="id-photo" label={t('handoff.toIdPhoto')} disabled={tool.phase !== 'ready'} file={() => tool.toFile(idPhotoFill(tool.background))} /></div>
    </section>
    <WorkspaceGuide steps={[studio('stepChoose'), studio('stepRefine'), studio('stepSave')]} tip={studio('tip')} />
  </>}>
    <ToolPanel title={t('removeBg.panel')} actions={<span className="cn-studio-small-icon"><Icon name="eraser" /></span>}>
      <FilePicker accept="image/jpeg,image/png,image/webp" multiple={false} title={t('removeBg.choose')} hint={studio('formats')} compact={Boolean(tool.name)} loading={null} disabled={false} onFiles={files => { if (files[0]) void tool.open(files[0]) }} />
      {!tool.name ? <figure className="cn-background-demo"><div aria-hidden="true"><span><Icon name="person-fill" /></span><Icon name="arrow-right" /><span><Icon name="person-fill" /></span></div><figcaption>{studio('demoLabel')}</figcaption></figure> : null}
      <div className="cn-background-stage mt-3" hidden={!tool.name || tool.phase === 'error' || tool.phase === 'cancelled'} aria-busy={tool.busy}>
        <canvas ref={tool.canvas} aria-label={t('removeBg.preview')} style={{ width: '100%', display: 'block', touchAction: tool.brush === 'off' ? 'auto' : 'none', cursor: tool.brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={tool.startStroke} onPointerMove={tool.brushAt} onPointerUp={tool.endStroke} onPointerCancel={tool.endStroke} onLostPointerCapture={tool.endStroke} />
      </div>
      <p className="cn-background-note"><Icon name="shield-check" />{t('removeBg.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
