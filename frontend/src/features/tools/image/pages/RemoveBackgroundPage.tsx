import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { BackgroundRemovalControls } from '../components/BackgroundRemovalControls'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { HandoffButton } from '../components/HandoffButton'
import { idPhotoFill } from '../utils/handoff-file'

export default function RemoveBackgroundPage() {
  const { t } = useTranslation('image')
  const tool = useBackgroundRemoval()
  return <ToolBoard layout="compact" side={<div className="erp-tool-result" role="status" aria-live="polite"><p className="erp-tool-result__label">{t('shared.result')}</p><p className="erp-tool-result__value" style={{ overflowWrap: 'anywhere' }}>{tool.name || t('removeBg.noImage')}</p><p className="erp-tool-result__note">{tool.busy ? <Spinner as="span" size="sm" aria-hidden="true" className="me-2" /> : null}{tool.message || t('removeBg.idle')}</p><Button disabled={tool.phase !== 'ready'} onClick={tool.save}>{t('removeBg.download')}</Button><div className="mt-2"><HandoffButton target="id-photo" label={t('handoff.toIdPhoto')} disabled={tool.phase !== 'ready'} file={() => tool.toFile(idPhotoFill(tool.background))} /></div></div>}>
    <ToolPanel title={t('removeBg.panel')}>
      <BackgroundRemovalControls {...tool} ready={tool.phase === 'ready'} />
      <div className="cn-background-stage mt-3" hidden={!tool.name} aria-busy={tool.busy} style={{ background: 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 20px 20px' }}>
        <canvas ref={tool.canvas} aria-label={t('removeBg.preview')} style={{ width: '100%', display: 'block', touchAction: tool.brush === 'off' ? 'auto' : 'none', cursor: tool.brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={tool.startStroke} onPointerMove={tool.brushAt} onPointerUp={tool.endStroke} onPointerCancel={tool.endStroke} onLostPointerCapture={tool.endStroke} />
      </div>
      <p className="mt-3">{t('removeBg.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
