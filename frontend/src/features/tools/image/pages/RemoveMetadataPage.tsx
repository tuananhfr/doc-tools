import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { removeImageMetadata } from '../services/remove-metadata'

export default function RemoveMetadataPage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.metadata' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const process = async () => {
    if (!file || busy) return
    setBusy(true)
    setMessage('')
    try {
      const output = await removeImageMetadata(file)
      downloadOutput({ name: `${file.name.replace(/\.[^.]+$/, '')}-khong-exif.${output.extension}`, blob: output.blob })
      setMessage(t('removeMeta.done', { width: output.width, height: output.height }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('shared.processFailed'))
    } finally {
      setBusy(false)
    }
  }

  return <ToolBoard className="cn-metadata-workspace" layout="compact" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>} side={<div className="erp-tool-result" role="status">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="shield-check" /></span><div><h2>{t('removeMeta.outputLabel')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className="cn-metadata-file"><Icon name={file ? 'file-earmark-image' : 'image'} /><p className="erp-tool-result__value">{file ? file.name : '—'}</p></div>
    <p className="erp-tool-result__note">{message || t('removeMeta.idle')}</p>
    <Button disabled={!file || busy} onClick={() => void process()} className="mt-3 cn-metadata-run"><Icon name={busy ? 'hourglass-split' : 'shield-check'} className="me-2" />{busy ? t('shared.processing') : t('removeMeta.run')}</Button>
  </div>}>
    <ToolPanel title={t('removeMeta.panel')} actions={<span className="cn-studio-small-icon"><Icon name="image" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      <FilePicker title={t('removeMeta.choose')} hint={studio('pickerHint')} accept="image/jpeg,image/png,image/webp" multiple={false} compact={Boolean(file)} loading={null} disabled={busy} onFiles={files => { setFile(files[0] ?? null); setMessage('') }} />
      <p className="erp-tool-result__note mt-3">{t('removeMeta.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
