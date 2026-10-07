import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { removeImageMetadata } from '../services/remove-metadata'

export default function RemoveMetadataPage() {
  const { t } = useTranslation('image')
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

  return <ToolBoard side={<div className="erp-tool-result" role="status">
    <p className="erp-tool-result__label">{t('removeMeta.outputLabel')}</p>
    <p className="erp-tool-result__value">{file ? file.name : '—'}</p>
    <p className="erp-tool-result__note">{message || t('removeMeta.idle')}</p>
    <Button disabled={!file || busy} onClick={() => void process()} className="mt-3">{busy ? t('shared.processing') : t('removeMeta.run')}</Button>
  </div>}>
    <ToolPanel title={t('removeMeta.panel')}>
      <label className="erp-flow-field__label">{t('removeMeta.choose')}
        <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile((event.target as HTMLInputElement).files?.[0] ?? null); setMessage('') }} />
      </label>
      <p className="erp-tool-result__note mt-3">{t('removeMeta.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
