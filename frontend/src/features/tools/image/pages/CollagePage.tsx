import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, NumberField, readNumber, ToolLeaveGuard } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { withBase } from '@/utils/url'
import { ImageStudio } from '../components/ImageStudio'
import { useMobileImageReveal } from '../hooks/useMobileImageReveal'
import { CollageFileError, makeImageCollage } from '../services/collage'
import { COLLAGE_GAP_RULE, collageBlock, collageFileProblem } from '../utils/collage-input'
import { SHOP_LAYOUTS } from '@/features/tools/design/config/graphic-templates'

const GraphicWorkspace = lazy(() => import('@/features/tools/design/components/GraphicWorkspace').then(module => ({ default: module.GraphicWorkspace })))
const GAP_PRESETS = [0, 12, 24, 48]
const EMPTY_FILES: File[] = []

function useCollageUrls(files: File[]) {
  const [preview, setPreview] = useState<{ files: File[]; urls: string[] } | null>(null)
  useEffect(() => {
    const urls = files.slice(0, 9).map(file => URL.createObjectURL(file))
    setPreview({ files, urls })
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [files])
  return preview?.files === files ? preview.urls : []
}

function CollagePreview({ files, urls, columns, gap }: { files: File[]; urls: string[]; columns: number; gap: number }) {
  const width = columns * 900 + (columns + 1) * gap
  const rows = Math.ceil(Math.min(files.length, 9) / columns)
  return <div className="cn-collagestudio-canvas"><div className="cn-collagestudio-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, aspectRatio: `${width} / ${rows * 900 + (rows + 1) * gap}`, gap: `${gap / width * 100}cqw`, padding: `${gap / width * 100}cqw` }}>{urls.slice(0, 9).map((url, index) => <img key={url} src={url} alt={files[index]?.name ?? ''} />)}</div></div>
}

/** Shared photo-tool layout, preserving the existing square-tile PNG renderer and advanced workspace. */
export default function CollagePage() {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'collageStudio' })
  const ids = useId()
  const [files, setFiles] = useState<File[]>(EMPTY_FILES)
  const [shop, setShop] = useState(false)
  const [openedShop, setOpenedShop] = useState(false)
  const [columns, setColumns] = useState(2)
  const [gapText, setGapText] = useState('12')
  const [busy, setBusy] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [fileError, setFileError] = useState('')
  const [result, setResult] = useState<{ files: File[]; columns: number; gap: number; blob: Blob } | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const urls = useCollageUrls(files)
  useMobileImageReveal(files.map(file => `${file.name}:${file.lastModified}:${file.size}`), '.cn-collagestudio-preview')
  const gap = readNumber(gapText, COLLAGE_GAP_RULE)
  const block = collageBlock(files.length, gap)
  const fileProblem = collageFileProblem(files.length)
  const countText = fileProblem === 'tooFew' ? t('collage.tooFew', { total: files.length }) : fileProblem === 'tooMany' ? t('collage.tooMany', { total: files.length }) : ''
  const blockText = block === 'none' ? t('collage.blockNone') : block === 'gap' ? t('collage.blockGap') : countText
  const locked = busy || sampleBusy
  const rows = Math.ceil(files.length / columns)
  const width = columns * 900 + (columns + 1) * (gap ?? 0)
  const height = rows * 900 + (rows + 1) * (gap ?? 0)
  const currentResult = result?.files === files && result.columns === columns && result.gap === gap ? result : null
  const list = useMemo(() => files.map((file, index) => ({ id: String(index), name: file.name, size: file.size, icon: 'file-earmark-image', thumbnail: urls[index] })), [files, urls])
  useEffect(() => { setFileError(''); setMessage(''); setResult(null) }, [files, columns, gapText])
  useEffect(() => {
    if (!currentResult) { setResultUrl(null); return }
    const url = URL.createObjectURL(currentResult.blob)
    setResultUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [currentResult])
  const addFiles = (added: File[]) => { if (!locked) setFiles(current => [...current, ...added]) }
  const move = (id: string, delta: -1 | 1) => setFiles(current => {
    const index = Number(id), target = index + delta
    if (locked || target < 0 || target >= current.length) return current
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next
  })
  const sample = async () => {
    if (locked) return
    setSampleBusy(true); setSampleFailed(false)
    try {
      const next = await Promise.all(['/assets/id-photo/portrait-demo-v2.png', '/brand/skyline-hero-v1.png'].map(async (path, index) => {
        const response = await fetch(withBase(path))
        if (!response.ok) throw new Error('SAMPLE_LOAD')
        return new File([await response.blob()], `sample-${index + 1}.png`, { type: 'image/png' })
      }))
      setFiles(next)
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const process = async () => {
    if (locked || block || gap === null) return
    setBusy(true); setFileError(''); setMessage('')
    try {
      const blob = currentResult?.blob ?? await makeImageCollage(files, columns, gap)
      setResult({ files, columns, gap, blob })
      downloadOutput({ name: `${t('file.collage')}.png`, blob })
      recordQualityEvent('download', 'collage')
      setMessage(t('collage.done'))
    } catch (error) {
      const text = error instanceof Error ? error.message : t('collage.failed')
      if (error instanceof CollageFileError) setFileError(text)
      setMessage(text)
    } finally { setBusy(false) }
  }

  return <ImageStudio toolId="collage" icon="images" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={busy || files.length > 0} />
    <div hidden={shop} className="cn-collagestudio-modes" aria-label={s('modeLabel')}><button type="button" aria-pressed={!shop} onClick={() => setShop(false)} disabled={locked}><Icon name="grid" />{s('simple')}</button><button type="button" aria-pressed={shop} onClick={() => { setOpenedShop(true); setShop(true) }} disabled={locked}><Icon name="palette" />{s('advanced')}</button></div>
    {openedShop ? <div hidden={!shop} className="cn-collagestudio-advanced"><Suspense fallback={<p role="status"><Spinner as="span" size="sm" /> {s('loading')}</p>}><GraphicWorkspace files={files} onFiles={setFiles} templates={SHOP_LAYOUTS} visible={shop} onBack={() => setShop(false)} /></Suspense></div> : null}
    <div hidden={shop} className="cn-idstudio-editor cn-collagestudio-editor">
      <section className="cn-idstudio-panel cn-convertstudio-upload cn-collagestudio-upload" aria-labelledby={`${ids}-upload`}><h2 id={`${ids}-upload`}>1. {s('uploadTitle')}</h2>
        <FilePicker multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" title={t('collage.choose')} hint={s('formats')} compact={files.length > 0} loading={null} disabled={locked} onFiles={addFiles} />
        {!files.length ? <Button variant="outline-primary" className="cn-collagestudio-sample" disabled={locked} onClick={() => void sample()}>{sampleBusy ? <Spinner as="span" size="sm" /> : <Icon name="images" />}{s('sample')}</Button> : null}
        {sampleFailed ? <p className="erp-tool-form__error" role="alert">{s('sampleFailed')}</p> : null}
        {files.length ? <><p className="cn-idstudio-note">{s('orderHint')}</p><FileList files={list} disabled={locked} onRemove={id => setFiles(current => current.filter((_, index) => index !== Number(id)))} onMove={move} onClear={() => setFiles([])} /></> : null}
        {countText || fileError ? <p className="erp-tool-form__error" role="alert">{countText || fileError}</p> : null}
        <p className="cn-idstudio-local"><Icon name="shield-check" />{s('local')}</p>
      </section>
      <section className="cn-idstudio-panel cn-collagestudio-settings" aria-labelledby={`${ids}-settings`}><h2 id={`${ids}-settings`}>2. {s('settingsTitle')}</h2>
        <fieldset disabled={locked}><legend>{t('collage.columns')}</legend><div className="cn-collagestudio-layouts">{[1, 2, 3].map(value => <button type="button" key={value} aria-pressed={columns === value} onClick={() => setColumns(value)}><span aria-hidden="true" style={{ gridTemplateColumns: `repeat(${value}, 1fr)` }}>{Array.from({ length: value * 2 }, (_, i) => <i key={i} />)}</span><strong>{s('columnCount', { count: value })}</strong>{columns === value ? <Icon name="check-circle-fill" /> : null}</button>)}</div>
        <NumberField label={t('collage.gap')} value={gapText} onChange={setGapText} rule={COLLAGE_GAP_RULE} unit="px" />
        <div className="cn-collagestudio-gaps" aria-label={s('gapPresets')}>{GAP_PRESETS.map(value => <button type="button" key={value} aria-pressed={gap === value} onClick={() => setGapText(String(value))}>{value ? `${value} px` : s('noGap')}</button>)}</div>
        </fieldset>
        <div className="cn-collagestudio-info"><Icon name="bounding-box" /><div><strong>{s('squareTiles')}</strong><p>{s('cropHint')}</p></div></div>
        <div className="cn-collagestudio-info"><Icon name="file-earmark-image" /><div><strong>{s('pngOutput')}</strong><p>{s('whiteBackground')}</p></div></div>
        <Button variant="outline-primary" className="cn-collagestudio-more" disabled={locked} onClick={() => { setOpenedShop(true); setShop(true) }}><Icon name="palette" />{t('shop.open')}<Icon name="arrow-right" /></Button>
      </section>
      <section className="cn-idstudio-panel cn-collagestudio-preview" aria-labelledby={`${ids}-preview`}><h2 id={`${ids}-preview`}>3. {s('previewTitle')}</h2>
        <div className="cn-collagestudio-stage">{files.length ? currentResult && resultUrl ? <img className="cn-collagestudio-result-image" src={resultUrl} alt={s('resultAlt')} /> : <CollagePreview files={files} urls={urls} columns={columns} gap={gap ?? 0} /> : <div className="cn-collagestudio-empty"><div aria-hidden="true">{['image', 'flower1', 'sun', 'tree'].map(icon => <span key={icon}><Icon name={icon} /></span>)}</div><strong>{s('empty')}</strong><p>{s('emptyHint')}</p></div>}</div>
        <dl className="cn-idstudio-output-meta"><div><dt>{s('images')}</dt><dd>{t('shared.imageCount', { count: files.length })}</dd></div><div><dt>{s('outputSize')}</dt><dd>{files.length >= 2 && files.length <= 9 && gap !== null ? `${width} × ${height} px` : '—'}</dd></div><div><dt>{s('output')}</dt><dd>PNG{currentResult ? ` · ${formatFileSize(currentResult.blob.size)}` : ''}</dd></div></dl>
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={locked || block !== null} aria-describedby={block ? `${ids}-block` : undefined} onClick={() => void process()}>{busy ? <Spinner as="span" size="sm" /> : <Icon name="download" />}{busy ? t('collage.busy') : currentResult ? s('downloadAgain') : t('collage.run')}</Button></div>
        {block ? <p id={`${ids}-block`} className="cn-idstudio-note">{blockText}</p> : null}
        {message ? <p className={currentResult ? 'cn-collagestudio-status' : 'erp-tool-form__error'} role={currentResult ? 'status' : 'alert'}>{message}</p> : null}
        <p className="cn-idstudio-note">{s('exportHint')}</p>
      </section>
    </div>
  </ImageStudio>
}
