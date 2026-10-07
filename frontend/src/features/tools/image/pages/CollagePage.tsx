import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { makeImageCollage } from '../services/collage'

export default function CollagePage() {
  const { t } = useTranslation('image')
  const [files, setFiles] = useState<File[]>([])
  const [columns, setColumns] = useState(2)
  const [gap, setGap] = useState(12)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const process = async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await makeImageCollage(files, columns, gap)
      downloadOutput({ name: `${t('file.collage')}.png`, blob })
      setMessage(t('collage.done'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('collage.failed'))
    } finally {
      setBusy(false)
    }
  }

  return <ToolBoard side={<div className="erp-tool-result" role="status">
    <p className="erp-tool-result__label">{t('collage.resultLabel')}</p>
    <p className="erp-tool-result__value">{files.length ? t('shared.imageCount', { count: files.length }) : '—'}</p>
    <p className="erp-tool-result__note">{message || t('collage.idle')}</p>
    <Button disabled={busy || files.length < 2 || files.length > 9} onClick={() => void process()} className="mt-3">{busy ? t('collage.busy') : t('collage.run')}</Button>
  </div>}>
    <ToolPanel title={t('collage.panel')}>
      <label className="erp-flow-field__label">{t('collage.choose')}
        <Form.Control type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFiles([...(event.target as HTMLInputElement).files ?? []]); setMessage('') }} />
      </label>
      {files.length ? <ol className="mt-3">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ol> : null}
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">{t('collage.columns')}
          <Form.Select value={columns} onChange={(event) => setColumns(Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></Form.Select>
        </label>
        <label className="erp-flow-field__label">{t('collage.gap')}
          <Form.Control type="number" min="0" max="100" value={gap} onChange={(event) => setGap(Number(event.target.value))} />
        </label>
      </div>
    </ToolPanel>
  </ToolBoard>
}
