import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

interface Props {
  busy: boolean
  ready: boolean
  background: string
  changeBackground: (value: string) => void
  brush: 'off' | 'erase' | 'keep'
  setBrush: (value: 'off' | 'erase' | 'keep') => void
  radius: number
  setRadius: (value: number) => void
  undoSteps: number
  undo: () => void
  open: (file: File) => Promise<void>
  cancel: () => void
  retry: () => void
  canRetry: boolean
}

export function BackgroundRemovalControls(props: Props) {
  const { t } = useTranslation('image')
  return <>
    <label className="erp-flow-field__label">{t('removeBg.choose')}<FileInput accept="image/jpeg,image/png,image/webp" onClick={event => { event.currentTarget.value = '' }} onChange={event => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void props.open(file) }} /></label>
    {props.busy ? <Button variant="outline-secondary" className="mt-3" onClick={props.cancel}>{t('removeBg.cancel')}</Button> : null}
    {props.canRetry ? <Button variant="outline-secondary" className="mt-3" onClick={props.retry}>{t('removeBg.retry')}</Button> : null}
    {props.ready ? <>
    <label className="erp-flow-field__label mt-3">{t('removeBg.background')}<Form.Select disabled={!props.ready} value={props.background} onChange={event => props.changeBackground(event.target.value)}><option value="transparent">{t('removeBg.backgroundTransparent')}</option><option value="#ffffff">{t('removeBg.backgroundWhite')}</option><option value="#4a90d9">{t('removeBg.backgroundIdBlue')}</option></Form.Select></label>
    <label className="erp-flow-field__label mt-3">{t('removeBg.brush')}<Form.Select disabled={!props.ready} value={props.brush} onChange={event => props.setBrush(event.target.value as Props['brush'])}><option value="off">{t('removeBg.brushOff')}</option><option value="erase">{t('removeBg.brushErase')}</option><option value="keep">{t('removeBg.brushKeep')}</option></Form.Select></label>
    {props.brush !== 'off' ? <label className="erp-flow-field__label mt-3">{t('removeBg.brushSize', { value: props.radius })}<Form.Range disabled={!props.ready} min={4} max={100} value={props.radius} onChange={event => props.setRadius(Number(event.target.value))} /></label> : null}
    <Button variant="outline-secondary" className="mt-3" disabled={!props.ready || !props.undoSteps} onClick={props.undo}>{props.undoSteps ? t('removeBg.undoBrushSteps', { steps: props.undoSteps }) : t('removeBg.undoBrush')}</Button>
    </> : null}
  </>
}
