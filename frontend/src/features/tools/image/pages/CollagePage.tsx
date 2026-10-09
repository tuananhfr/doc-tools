import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, NumberField, readNumber, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { CollageFileError, makeImageCollage } from '../services/collage'
import { COLLAGE_GAP_RULE, collageBlock, collageFileProblem } from '../utils/collage-input'

export default function CollagePage() {
  const { t } = useTranslation('image')
  const ids = useId()
  const [files, setFiles] = useState<File[]>([])
  const [columns, setColumns] = useState(2)
  const [gapText, setGapText] = useState('12')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  // Lỗi của một ảnh cụ thể (hỏng, quá lớn) — chỉ biết được khi ghép, nên giữ riêng khỏi lỗi đếm số ảnh.
  const [fileError, setFileError] = useState('')
  const gap = readNumber(gapText, COLLAGE_GAP_RULE)
  const block = collageBlock(files.length, gap)
  const fileProblem = collageFileProblem(files.length)
  const countText = fileProblem === 'tooFew' ? t('collage.tooFew', { total: files.length })
    : fileProblem === 'tooMany' ? t('collage.tooMany', { total: files.length }) : ''
  const fileText = countText || fileError
  const blockText = block === 'none' ? t('collage.blockNone') : block === 'gap' ? t('collage.blockGap') : countText
  const process = async () => {
    if (busy || block || gap === null) return
    setBusy(true)
    setFileError('')
    try {
      const blob = await makeImageCollage(files, columns, gap)
      downloadOutput({ name: `${t('file.collage')}.png`, blob })
      setMessage(t('collage.done'))
    } catch (error) {
      const text = error instanceof Error ? error.message : t('collage.failed')
      if (error instanceof CollageFileError) setFileError(text)
      setMessage(text)
    } finally {
      setBusy(false)
    }
  }

  return <ToolBoard side={<div className="erp-tool-result" role="status">
    <p className="erp-tool-result__label">{t('collage.resultLabel')}</p>
    <p className="erp-tool-result__value">{files.length ? t('shared.imageCount', { count: files.length }) : '—'}</p>
    <p className="erp-tool-result__note">{message || t('collage.idle')}</p>
    <Button disabled={busy || block !== null} aria-describedby={block ? `${ids}-block` : undefined} onClick={() => void process()} className="mt-3">{busy ? t('collage.busy') : t('collage.run')}</Button>
    {block ? <p id={`${ids}-block`} className="erp-flow-field__hint mt-2">{blockText}</p> : null}
  </div>}>
    <ToolPanel title={t('collage.panel')}>
      <label className="erp-flow-field__label" htmlFor={`${ids}-files`}>{t('collage.choose')}
        <Form.Control id={`${ids}-files`} type="file" multiple accept="image/jpeg,image/png,image/webp" isInvalid={fileText !== ''} aria-describedby={fileText ? `${ids}-files-error` : undefined} onChange={(event) => { setFiles([...(event.target as HTMLInputElement).files ?? []]); setFileError(''); setMessage('') }} />
        {fileText ? <span id={`${ids}-files-error`} className="erp-tool-form__error" role="alert">{fileText}</span> : null}
      </label>
      {files.length ? <ol className="mt-3">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ol> : null}
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">{t('collage.columns')}
          <Form.Select value={columns} onChange={(event) => setColumns(Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></Form.Select>
        </label>
        <NumberField label={t('collage.gap')} value={gapText} onChange={setGapText} rule={COLLAGE_GAP_RULE} unit="px" />
      </div>
    </ToolPanel>
  </ToolBoard>
}
