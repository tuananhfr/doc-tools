import { useEffect, useId, useState, type CSSProperties } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput, FileInput, parseDecimal, PrintPortal, useDownloadNudge, useFlowRun } from '@/features/tools/hub'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { withBase } from '@/utils/url'
import { formatFileSize } from '@/utils/format'
import { takeHandoff } from '@/features/tools/shared'
import { CameraCapture } from '../components/CameraCapture'
import { CropStage } from '../components/CropStage'
import { HandoffButton } from '../components/HandoffButton'
import { IdPhotoStudio } from '../components/IdPhotoStudio'
import { ImageStudioUpload } from '../components/ImageStudioUpload'
import { PhotoSheetPreview } from '../components/PhotoSheetPreview'
import { GAP_LIMIT, PAPER_SIZES, PHOTO_SIZES, PRINT_DPI, SHEET_MARGIN } from '../config/photo-presets'
import { useIdPhotoPreview } from '../hooks/useIdPhotoPreview'
import { useSamplePhoto } from '../hooks/useSamplePhoto'
import { useImageFiles } from '../hooks/useImageFiles'
import { usePhotoCrop } from '../hooks/usePhotoCrop'
import { idPhotoTask, type PhotoOutput } from '../services/edit-tasks'
import { ORIGINAL_PORTRAIT, portraitIsOriginal, styledPortrait } from '../services/portrait-appearance'
import { fullRect, rectForAspect } from '../utils/crop-rect'
import { initialCrop } from '../utils/crop-state'
import { outputFile } from '../utils/handoff-file'
import { LOW_DPI, mmToPx, layoutSheet, printDpi } from '../utils/photo-layout'
import MixedPhotoPage from './MixedPhotoPage'

const SIZES = [...PHOTO_SIZES, { id: '6x9', label: '6 × 9 cm', width: 60, height: 90 }]
const QUICK_SIZES = ['2x3', '3x4', '4x6', '6x9', 'custom']
const BACKGROUNDS = [{ id: 'original', color: null }, { id: 'white', color: '#ffffff' }, { id: 'blue', color: '#65a9e8' }] as const
const TABS = ['size', 'beauty', 'align', 'advanced'] as const
const SAMPLE = '/assets/id-photo/portrait-demo-v2.png'

/** Photo studio: the preview and exports share the same renderer. */
export default function IdPhotoPage() {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const ids = useId()
  const images = useImageFiles({ multiple: false, revealTarget: '.cn-idstudio-preview' })
  const samplePhoto = useSamplePhoto(SAMPLE)
  const run = useFlowRun()
  const nudge = useDownloadNudge()
  const [mixed, setMixed] = useState(false)
  const [camera, setCamera] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const [tab, setTab] = useState<typeof TABS[number]>('size')
  const [original, setOriginal] = useState(false)
  const [appearance, setAppearance] = useState(ORIGINAL_PORTRAIT)
  const [photoId, setPhotoId] = useState('3x4')
  const [customWidth, setCustomWidth] = useState('3')
  const [customHeight, setCustomHeight] = useState('4')
  const [paperId, setPaperId] = useState('10x15-exact')
  const [sheetOutput, setSheetOutput] = useState<'pdf' | 'sheet'>('pdf')
  const [fill, setFill] = useState(false)
  const [copiesText, setCopiesText] = useState('4')
  const [gapText, setGapText] = useState('2')
  const [guides, setGuides] = useState(true)
  const [lastOutput, setLastOutput] = useState<PhotoOutput>('single')
  const [printJob, setPrintJob] = useState<{ url: string; width: number; height: number } | null>(null)

  useEffect(() => { const files = takeHandoff('id-photo'); if (files.length) void images.addFiles(files) }, [images.addFiles])
  useEffect(() => {
    if (!printJob) return
    const done = () => setPrintJob(null)
    window.addEventListener('afterprint', done)
    return () => { window.removeEventListener('afterprint', done); URL.revokeObjectURL(printJob.url) }
  }, [printJob])

  const width = parseDecimal(customWidth), height = parseDecimal(customHeight)
  const customOk = width !== null && height !== null && width >= 1 && width <= 10 && height >= 1 && height <= 15
  const photo = photoId === 'custom'
    ? { id: 'custom', label: s('customLabel', { width: customWidth, height: customHeight }), width: customOk ? width * 10 : 30, height: customOk ? height * 10 : 40 }
    : SIZES.find(size => size.id === photoId) ?? SIZES[1]
  const paper = PAPER_SIZES.find(size => size.id === paperId) ?? PAPER_SIZES[0]
  const uploadedItem = images.items[0] ?? null
  const item = uploadedItem ?? samplePhoto
  const crop = usePhotoCrop(item, photo.width / photo.height)
  const preview = useIdPhotoPreview(item, crop.rect, photo, appearance)
  const ready = !!item && !!crop.rect
  const busy = run.state.phase === 'running'
  const locked = busy || !!images.loading || sampleBusy
  const gap = parseDecimal(gapText), copies = parseDecimal(copiesText)
  const gapOk = gap !== null && gap >= GAP_LIMIT.min && gap <= GAP_LIMIT.max
  const copiesOk = fill || (copies !== null && Number.isInteger(copies) && copies >= 1)
  const layout = layoutSheet(paper, photo, gapOk ? gap : 0, SHEET_MARGIN, fill || !copiesOk ? null : copies)
  const paperLabel = t(`idPhoto.paperName.${paper.id}`)
  const sheetBlocked = !gapOk ? t('idPhoto.gapRange', GAP_LIMIT) : !copiesOk ? t('idPhoto.copiesInvalid') : !layout.capacity ? t('idPhoto.tooBig') : !fill && copies! > layout.capacity ? t('idPhoto.overCapacity', { paper: paperLabel, count: layout.capacity }) : null
  const previewError = preview.error ? t(({ MODEL_LOAD: 'removeBg.modelFailed', PROCESSING_FAILED: 'removeBg.processingFailed', UNSUPPORTED: 'removeBg.unsupported', TIMEOUT: 'removeBg.timeout' } as const)[preview.error]) : t('portrait.failed')
  const photoBlocked = photoId === 'custom' && !customOk ? s('customInvalid') : preview.failed ? previewError : appearance.shirt === 'custom' && !appearance.shirtBlob ? s('shirtRequired') : null
  const dpi = crop.rect ? Math.min(PRINT_DPI, printDpi(crop.rect.width, photo.width)) : null
  const outputWidth = crop.rect ? Math.min(mmToPx(photo.width, PRINT_DPI), Math.round(crop.rect.width)) : null
  const result = run.state.phase === 'done' ? run.state.result : null
  useEffect(() => { run.reset() }, [item?.id, photoId, customWidth, customHeight, appearance, crop.rect?.x, crop.rect?.y, crop.rect?.width, crop.rect?.height, paperId, sheetOutput, fill, copiesText, gapText, guides, run.reset])

  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void images.addFiles(files) } }
  const trySample = async () => {
    if (locked) return
    setSampleBusy(true); setSampleFailed(false)
    try {
      const response = await fetch(withBase(SAMPLE))
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      const blob = await response.blob()
      await images.addFiles([new File([blob], 'portrait-demo.png', { type: 'image/png' })])
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const exportPhoto = (output: PhotoOutput, print = false) => {
    if (!item || !crop.rect || locked || photoBlocked || (output !== 'single' && sheetBlocked)) return
    const selected = item, rect = crop.rect
    setLastOutput(output)
    void run.start(async step => {
      let source = selected, area = rect
      if (!portraitIsOriginal(appearance)) {
        const edited = await styledPortrait(selected.file, rect, photo, appearance, 2400, step.signal)
        step.signal.throwIfAborted()
        const file = new File([edited.blob], selected.name, { type: 'image/jpeg' })
        source = { ...selected, ...edited.size, file, size: file.size, format: 'jpeg' }; area = fullRect(edited.size)
      }
      const exported = await idPhotoTask(source, area, { output, photo, layout, guides, paperLabel })(step)
      step.signal.throwIfAborted()
      if (print) setPrintJob({ url: URL.createObjectURL(exported.output.blob), width: paper.width, height: paper.height })
      else { downloadOutput(exported.output); recordQualityEvent('download', 'id-photo'); nudge.onDownloaded() }
      return exported
    })
  }

  return <IdPhotoStudio>
    <div hidden={mixed} className="cn-idstudio-editor">
      <ImageStudioUpload images={images} disabled={locked} sampleBusy={sampleBusy} sampleFailed={sampleFailed} sampleUrl={SAMPLE} sampleLabel={s('sampleLabel')} onFiles={addFiles} onCamera={() => setCamera(true)} onSample={() => void trySample()} onClear={() => { run.reset(); images.clear() }}>
        <Button variant="outline-secondary" className="cn-idstudio-mixed" disabled={locked} onClick={() => setMixed(true)}><Icon name="grid-3x3-gap" />{t('mixedPhoto.open')}</Button>
      </ImageStudioUpload>
      <section className="cn-idstudio-panel cn-idstudio-customize" aria-labelledby={`${ids}-settings-title`}>
        <h2 id={`${ids}-settings-title`}><span>2.</span> {s('customize')}</h2>
        <div className="cn-idstudio-tabs" aria-label={s('customize')}>{TABS.map(value => <button type="button" key={value} aria-pressed={tab === value} aria-controls={`${ids}-settings`} onClick={() => setTab(value)}>{s(`tabs.${value}`)}</button>)}</div>
        <fieldset id={`${ids}-settings`} className="cn-idstudio-settings" disabled={locked}>
          {tab === 'size' ? <>
            <label className="cn-idstudio-label" htmlFor={`${ids}-size`}>{s('photoSize')}</label>
            <Form.Select id={`${ids}-size`} value={photoId} onChange={e => setPhotoId(e.target.value)}>{SIZES.map(size => <option key={size.id} value={size.id}>{size.label}{size.id === '3x4' ? ` · ${s('popular')}` : ''}</option>)}<option value="custom">{s('custom')}</option></Form.Select>
            <div className="cn-idstudio-sizes">{QUICK_SIZES.map(size => <button type="button" key={size} aria-pressed={photoId === size} onClick={() => setPhotoId(size)}><span style={{ '--photo-ratio': size === '2x3' || size === '4x6' || size === '6x9' ? '2 / 3' : '3 / 4' } as CSSProperties}><Icon name={size === 'custom' ? 'plus-lg' : 'person-fill'} /></span><small>{size === 'custom' ? s('custom') : SIZES.find(entry => entry.id === size)?.label}</small></button>)}</div>
            {photoId === 'custom' ? <div className="cn-idstudio-pair">{([['width', customWidth, setCustomWidth], ['height', customHeight, setCustomHeight]] as const).map(([key, value, setter]) => <label key={key}>{s(key)}<InputGroup><Form.Control aria-label={s(key)} type="text" inputMode="decimal" value={value} isInvalid={!customOk} onChange={e => setter(e.target.value)} /><InputGroup.Text>cm</InputGroup.Text></InputGroup></label>)}</div> : null}
            <fieldset className="cn-idstudio-backgrounds"><legend>{s('backgroundTitle')}</legend><div>{BACKGROUNDS.map(bg => <button type="button" key={bg.id} aria-pressed={appearance.background === bg.color} onClick={() => setAppearance(current => ({ ...current, background: bg.color }))}><span className={bg.color ? '' : 'is-original'} style={{ backgroundColor: bg.color ?? undefined }}>{appearance.background === bg.color ? <Icon name="check-lg" /> : null}</span><small>{s(`backgrounds.${bg.id}`)}</small></button>)}<label className="cn-idstudio-color"><span style={{ backgroundColor: appearance.background ?? '#ffffff' }} /><input type="color" value={appearance.background ?? '#ffffff'} aria-label={s('customBackground')} onChange={e => setAppearance(current => ({ ...current, background: e.target.value }))} /><small>{s('custom')}</small></label></div></fieldset>
            <div className="cn-idstudio-quality"><button type="button" onClick={() => setTab('align')}><Icon name="crop" />{s('adjustCrop')}<Icon name="arrow-right" /></button></div>
          </> : null}
          {tab === 'beauty' ? <><h3>{s('beautyTitle')}</h3><p className="cn-idstudio-note">{s('beautyHint')}</p>{(['brightness', 'contrast'] as const).map(key => <label key={key} className="cn-idstudio-range"><span>{s(key)}<output>{appearance[key] ?? 0}%</output></span><Form.Range min={-30} max={30} value={appearance[key] ?? 0} onChange={e => setAppearance(current => ({ ...current, [key]: Number(e.target.value) }))} /></label>)}<Button variant="outline-secondary" onClick={() => setAppearance(current => ({ ...current, brightness: 0, contrast: 0 }))}><Icon name="arrow-counterclockwise" />{s('resetBeauty')}</Button></> : null}
          {tab === 'align' ? <><h3>{s('alignTitle')}</h3><p className="cn-idstudio-note">{s('alignHint')}</p>{item && crop.rect ? <><CropStage item={item} state={{ ...initialCrop(item), rect: crop.rect }} aspect={photo.width / photo.height} disabled={locked} onRectChange={crop.setRect} /><Button variant="outline-secondary" onClick={() => crop.setRect(rectForAspect(item, photo.width / photo.height))}><Icon name="arrow-counterclockwise" />{s('resetCrop')}</Button></> : <p className="cn-idstudio-empty-crop"><Icon name="person-bounding-box" />{s('alignEmpty')}</p>}</> : null}
          {tab === 'advanced' ? <>
            <h3>{s('printSettings')}</h3><label className="cn-idstudio-label" htmlFor={`${ids}-paper`}>{t('idPhoto.paperLabel')}</label><Form.Select id={`${ids}-paper`} value={paperId} onChange={e => setPaperId(e.target.value)}>{PAPER_SIZES.map(size => <option key={size.id} value={size.id}>{t(`idPhoto.paper.${size.id}`)}</option>)}</Form.Select>
            <Form.Check id={`${ids}-fill`} label={t('idPhoto.fill', { count: layout.capacity })} checked={fill} onChange={e => setFill(e.target.checked)} />
            <div className="cn-idstudio-pair">{!fill ? <label>{t('idPhoto.copies')}<Form.Control type="text" inputMode="numeric" value={copiesText} isInvalid={!copiesOk || (copies ?? 0) > layout.capacity} onChange={e => setCopiesText(e.target.value)} /></label> : null}<label>{t('idPhoto.gap')}<InputGroup><Form.Control type="text" inputMode="decimal" value={gapText} isInvalid={!gapOk} onChange={e => setGapText(e.target.value)} /><InputGroup.Text>mm</InputGroup.Text></InputGroup></label></div>
            <Form.Check id={`${ids}-guides`} label={t('idPhoto.guides')} checked={guides} onChange={e => setGuides(e.target.checked)} />
            <label className="cn-idstudio-label" htmlFor={`${ids}-format`}>{t('idPhoto.outputLegend')}</label><Form.Select id={`${ids}-format`} value={sheetOutput} onChange={e => setSheetOutput(e.target.value as 'pdf' | 'sheet')}><option value="pdf">{t('idPhoto.output.pdf.label')}</option><option value="sheet">{t('idPhoto.output.sheet.label')}</option></Form.Select>
            {layout.capacity > 0 ? <PhotoSheetPreview layout={layout} /> : null}<p className="cn-idstudio-note">{t('idPhoto.layoutHint', { columns: layout.columns, rows: layout.rows, margin: SHEET_MARGIN })}</p>
            <details className="cn-idstudio-shirt"><summary>{t('portrait.shirt')}</summary><label className="cn-idstudio-label" htmlFor={`${ids}-shirt`}>{t('portrait.shirt')}</label><Form.Select id={`${ids}-shirt`} value={appearance.shirt} onChange={e => setAppearance(current => ({ ...current, shirt: e.target.value as typeof appearance.shirt }))}><option value="none">{t('portrait.keepShirt')}</option><option value="blazer">{t('portrait.blazer')}</option><option value="custom">{t('portrait.customShirt')}</option></Form.Select>{appearance.shirt === 'custom' ? <label className="cn-idstudio-label">{t('portrait.uploadShirt')}<FileInput accept="image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) setAppearance(current => ({ ...current, shirtBlob: file })) }} /></label> : null}{appearance.shirt !== 'none' ? <><p className="cn-idstudio-note">{t('portrait.shirtHint')}</p>{(['scale', 'x', 'y'] as const).map(key => <label key={key} className="cn-idstudio-range"><span>{t(`portrait.${key}`)}<output>{appearance[key]}%</output></span><Form.Range min={key === 'scale' ? 50 : key === 'x' ? -50 : -20} max={key === 'scale' ? 200 : key === 'x' ? 50 : 90} value={appearance[key]} onChange={e => setAppearance(current => ({ ...current, [key]: Number(e.target.value) }))} /></label>)}</> : null}</details>
          </> : null}
        </fieldset>
        {photoBlocked ? <p className="erp-tool-form__error" role="alert">{photoBlocked}</p> : null}
        {preview.failed ? <Button variant="outline-primary" disabled={locked} onClick={() => { run.reset(); preview.retry() }}><Icon name="arrow-clockwise" />{t('removeBg.retry')}</Button> : null}
      </section>
      <section className="cn-idstudio-panel cn-idstudio-preview" aria-labelledby={`${ids}-preview-title`}>
        <h2 id={`${ids}-preview-title`}><span>3.</span> {s('previewDownload')}</h2>
        <div className="cn-idstudio-tabs cn-idstudio-preview-tabs"><button type="button" aria-pressed={!original} onClick={() => setOriginal(false)}>{s('preview')}</button><button type="button" aria-pressed={original} onClick={() => setOriginal(true)}>{s('original')}</button></div>
        <div className="cn-idstudio-photo-area"><div className="cn-idstudio-photo" style={{ aspectRatio: original && item ? `${item.width} / ${item.height}` : `${photo.width} / ${photo.height}` }}><img src={item ? original ? item.url : preview.url ?? item.url : withBase(SAMPLE)} alt={item ? original ? s('originalPhoto') : s('previewPhoto') : s('samplePreview')} />{preview.busy && !original ? <span role="status"><Spinner as="span" size="sm" />{appearance.background ? t('removeBg.processing') : s('updating')}</span> : null}</div><div className="cn-idstudio-photo-strip" aria-hidden="true">{[0, 1, 2, 3].map(index => <img key={index} src={item ? preview.url ?? item.url : withBase(SAMPLE)} alt="" style={{ aspectRatio: `${photo.width} / ${photo.height}` }} />)}</div></div>
        {!uploadedItem ? <p className="cn-idstudio-demo-note">{s('sampleDisclosure')}</p> : null}
        <dl className="cn-idstudio-output-meta"><div><dt>{s('dimensions')}</dt><dd>{photo.label}</dd></div><div><dt>{s('resolution')}</dt><dd>{dpi !== null ? `${dpi} DPI` : '—'}</dd></div><div><dt>{s('file')}</dt><dd>{outputWidth ? `${outputWidth} × ${Math.round(outputWidth * photo.height / photo.width)} px · JPG` : 'JPG · 300 DPI'}</dd></div></dl>
        {dpi !== null && dpi < LOW_DPI ? <p className="cn-idstudio-note cn-idstudio-warning" role="status">{t('idPhoto.lowDpi', { dpi, min: LOW_DPI })}</p> : null}
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!ready || locked || !!photoBlocked} onClick={() => exportPhoto('single')}><Icon name="download" />{s('download')}</Button><Button variant="outline-primary" disabled={!ready || locked || !!photoBlocked || !!sheetBlocked} onClick={() => exportPhoto(sheetOutput)}><Icon name="collection" />{s('downloadSheet', { count: layout.cells.length })}</Button><Button variant="outline-primary" disabled={!ready || locked || !!photoBlocked || !!sheetBlocked} onClick={() => exportPhoto('sheet', true)}><Icon name="printer" />{s('print')}</Button></div>
        {sheetBlocked ? <p className="erp-tool-form__error" role="alert">{sheetBlocked}</p> : null}
        {busy ? <div className="cn-idstudio-run" role="status"><Spinner as="span" size="sm" />{s('exporting')}<Button variant="link" onClick={run.cancel}>{s('cancel')}</Button></div> : null}
        {run.state.phase === 'idle' && run.state.error ? <p className="erp-tool-form__error" role="alert">{run.state.error.message}</p> : null}
        {result ? <div className="cn-idstudio-result" role="status"><p><Icon name="check-circle-fill" /><strong>{result.title}</strong></p><small>{result.output.name} · {formatFileSize(result.output.blob.size)}</small><Button variant="link" onClick={() => { downloadOutput(result.output); nudge.onDownloaded() }}>{s('downloadAgain')}</Button>{lastOutput === 'single' ? <HandoffButton target="cv" label={t('handoff.toCv')} file={() => outputFile(result.output)} /> : null}{result.notes.filter(note => note.tone === 'warning').map(note => <p key={note.text}>{note.text}</p>)}</div> : null}
        {nudge.extra}
      </section>
    </div>
    <MixedPhotoPage visible={mixed} initialFiles={images.items.map(image => image.file)} onBack={() => setMixed(false)} />
    {camera ? <CameraCapture show maxShots={1} onClose={() => setCamera(false)} onDone={files => { setCamera(false); addFiles(files) }} /> : null}
    {printJob ? <PrintPortal><style>{`@page { size: ${printJob.width}mm ${printJob.height}mm; margin: 0; }`}</style><img className="cn-idstudio-print" src={printJob.url} alt={s('print')} style={{ width: `${printJob.width}mm`, height: `${printJob.height}mm` }} onLoad={() => window.print()} /></PrintPortal> : null}
  </IdPhotoStudio>
}
