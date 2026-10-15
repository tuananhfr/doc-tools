import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, NumberField, readNumber, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { CollageFileError, makeImageCollage } from '../services/collage'
import { COLLAGE_GAP_RULE, collageBlock, collageFileProblem } from '../utils/collage-input'

import {GraphicWorkspace} from '@/features/tools/design/components/GraphicWorkspace'
import {SHOP_LAYOUTS} from '@/features/tools/design/config/graphic-templates'

function CollagePreview({ files, columns, gap }: { files: File[]; columns: number; gap: number }) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const next = files.slice(0, 9).map(file => URL.createObjectURL(file))
    setUrls(next)
    return () => next.forEach(url => URL.revokeObjectURL(url))
  }, [files])
  const width = columns * 900 + (columns + 1) * gap
  const rows = Math.ceil(urls.length / columns)
  return urls.length ? <div className="cn-collage-canvas"><div className="cn-collage-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, aspectRatio: `${width} / ${rows * 900 + (rows + 1) * gap}`, gap: `${gap / width * 100}cqw`, padding: `${gap / width * 100}cqw` }}>{urls.map((url, index) => <img key={url} src={url} alt={files[index]?.name ?? ''} />)}</div></div> : <div className="cn-collage-placeholder" aria-hidden="true">{['image', 'flower1', 'sun', 'tree'].map(icon => <span key={icon}><Icon name={icon} /></span>)}</div>
}

export default function CollagePage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.collage' })
  const ids = useId()
  const [files, setFiles] = useState<File[]>([])
  const [shop, setShop] = useState(false)
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

  return <>
    <div hidden={!shop}><GraphicWorkspace files={files} onFiles={setFiles} templates={SHOP_LAYOUTS} visible={shop} onBack={()=>setShop(false)}/></div>
    <div hidden={shop}><ToolBoard className="cn-collage-workspace" layout="wide-result" side={<>
      <section className="cn-studio-card cn-collage-preview">
        <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="grid-1x2" /></span><div><h2>{studio('previewTitle')}</h2><p>{studio('previewHint')}</p></div></div>
        <CollagePreview files={files} columns={columns} gap={gap ?? 0} />
        <p className="cn-collage-caption">{files.length ? t('shared.imageCount', { count: files.length }) : studio('empty')}</p>
        <p className="erp-tool-result__note">{t('collage.idle')}</p>
      </section>
      <WorkspaceGuide steps={[studio('stepChoose'), studio('stepLayout'), studio('stepSave')]} tip={studio('tip')} />
    </>}>
    <ToolPanel title={t('collage.panel')} actions={<span className="cn-studio-small-icon"><Icon name="images" /></span>}>
      <FilePicker multiple accept="image/jpeg,image/png,image/webp" title={t('collage.choose')} hint={studio('formats')} compact={files.length > 0} loading={null} disabled={busy} onFiles={(added) => { setFiles(current => [...current, ...added]); setFileError(''); setMessage('') }} />
      {fileText ? <p className="erp-tool-form__error mt-3" role="alert">{fileText}</p> : null}
      {files.length ? <div className="cn-collage-files"><ol>{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" disabled={busy} aria-label={studio('remove', { name: file.name })} onClick={() => { setFiles(current => current.filter((_, position) => position !== index)); setFileError(''); setMessage('') }}><Icon name="x-lg" /></button></li>)}</ol></div> : null}
    </ToolPanel>
    <ToolPanel title={studio('layoutTitle')}>
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">{t('collage.columns')}
          <Form.Select value={columns} onChange={(event) => setColumns(Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></Form.Select>
        </label>
        <NumberField label={t('collage.gap')} value={gapText} onChange={setGapText} rule={COLLAGE_GAP_RULE} unit="px" />
      </div>
      <Button disabled={busy || block !== null} aria-describedby={block ? `${ids}-block` : undefined} onClick={() => void process()} className="cn-collage-run mt-4"><Icon name="download" className="me-2" />{busy ? t('collage.busy') : t('collage.run')}</Button>
      {block ? <p id={`${ids}-block`} className="erp-flow-field__hint mt-2">{blockText}</p> : null}
      <p role="status" className="cn-collage-status">{message}</p>
    </ToolPanel>
    <Button variant="outline-secondary" className="cn-collage-shop" disabled={busy} onClick={()=>setShop(true)}><Icon name="palette" className="me-2" />{t('shop.open')}<Icon name="arrow-right" className="ms-auto" /></Button>
  </ToolBoard></div>
  </>
}
