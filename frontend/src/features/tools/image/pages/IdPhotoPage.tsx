import { useId, useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, parseDecimal, useFlowRun, type FlowChoiceOption } from '@/features/tools/hub'
import { CropStage } from '../components/CropStage'
import { ImageToolShell } from '../components/ImageToolShell'
import { PhotoSheetPreview } from '../components/PhotoSheetPreview'
import { GAP_LIMIT, PAPER_SIZES, PHOTO_SIZES, SHEET_MARGIN } from '../config/photo-presets'
import { useImageFiles } from '../hooks/useImageFiles'
import { usePhotoCrop } from '../hooks/usePhotoCrop'
import { idPhotoTask, type PhotoOutput } from '../services/edit-tasks'
import { initialCrop } from '../utils/crop-state'
import { layoutSheet, LOW_DPI, printDpi } from '../utils/photo-layout'

const OUTPUT_IDS: PhotoOutput[] = ['pdf', 'sheet', 'single']

/** ẢNH THẺ & IN ẢNH — cắt một ảnh về đúng cỡ ảnh thẻ rồi xếp nhiều bản lên một tờ giấy in. */
export default function IdPhotoPage() {
  const { t } = useTranslation('image')
  const outputs: FlowChoiceOption<PhotoOutput>[] = OUTPUT_IDS.map((value) => ({ value, label: t(`idPhoto.output.${value}.label`), hint: t(`idPhoto.output.${value}.hint`) }))
  const ids = useId()
  const images = useImageFiles({ multiple: false })
  const run = useFlowRun()
  const [photoId, setPhotoId] = useState('3x4')
  const [paperId, setPaperId] = useState('a4')
  const [output, setOutput] = useState<PhotoOutput>('pdf')
  const [fill, setFill] = useState(true)
  const [copiesText, setCopiesText] = useState('8')
  const [gapText, setGapText] = useState('2')
  const [guides, setGuides] = useState(true)

  const photo = PHOTO_SIZES.find((size) => size.id === photoId) ?? PHOTO_SIZES[0]
  const paper = PAPER_SIZES.find((size) => size.id === paperId) ?? PAPER_SIZES[0]
  const item = images.items[0] ?? null
  const crop = usePhotoCrop(item, photo.width / photo.height)
  const ready = item !== null && crop.rect !== null

  const gap = parseDecimal(gapText)
  const gapOk = gap !== null && gap >= GAP_LIMIT.min && gap <= GAP_LIMIT.max
  const copies = parseDecimal(copiesText)
  const copiesOk = fill || (copies !== null && Number.isInteger(copies) && copies >= 1)
  const layout = layoutSheet(paper, photo, gapOk ? gap : 0, SHEET_MARGIN, fill || !copiesOk ? null : copies)
  const sheet = output !== 'single'
  const dpi = crop.rect ? printDpi(crop.rect.width, photo.width) : null
  const paperLabel = t(`idPhoto.paperName.${paper.id}`)
  const overCapacity = !fill && copies !== null && copies > layout.capacity

  const blocked = !sheet
    ? null
    : !gapOk
      ? t('idPhoto.gapRange', { min: GAP_LIMIT.min, max: GAP_LIMIT.max })
      : !copiesOk
        ? t('idPhoto.copiesInvalid')
        : layout.capacity === 0
          ? t('idPhoto.tooBig')
          : overCapacity
            ? t('idPhoto.overCapacity', { paper: paperLabel, count: layout.capacity })
            : null
  // Trước đây dò chữ "chỉ chứa" trong thông báo — đổi ngôn ngữ là mất viền đỏ, nên tính thẳng điều kiện.
  const capacityBlocked = sheet && gapOk && copiesOk && layout.capacity > 0 && overCapacity

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple={false}
      pickerTitle={t('idPhoto.pickerTitle')}
      stage={
        ready && crop.rect ? (
          <CropStage item={item} state={{ ...initialCrop(item), rect: crop.rect }} aspect={photo.width / photo.height} disabled={run.state.phase === 'running'} onRectChange={crop.setRect} />
        ) : undefined
      }
      runLabel={output === 'single' ? t('idPhoto.runSingle') : t('idPhoto.runSheet', { count: layout.cells.length })}
      runIcon="person-badge"
      blocked={blocked}
      task={() => {
        if (!ready || !crop.rect) throw new Error(t('shared.noImageSelected'))
        return idPhotoTask(item, crop.rect, { output, photo, layout, guides, paperLabel })
      }}
      options={
        ready ? (
          <>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-photo`}>
                {t('idPhoto.photoSize')}
              </label>
              <Form.Select id={`${ids}-photo`} value={photo.id} onChange={(event) => setPhotoId(event.target.value)}>
                {PHOTO_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label}
                  </option>
                ))}
              </Form.Select>
              <p className="erp-flow-field__hint">{t('idPhoto.photoHint')}</p>
              {dpi !== null && dpi < LOW_DPI ? (
                <p className="erp-tool-form__error" role="alert">
                  {t('idPhoto.lowDpi', { dpi, min: LOW_DPI })}
                </p>
              ) : null}
            </div>

            <FlowChoice legend={t('idPhoto.outputLegend')} value={output} options={outputs} onChange={setOutput} />

            {sheet ? (
              <>
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-paper`}>
                    {t('idPhoto.paperLabel')}
                  </label>
                  <Form.Select id={`${ids}-paper`} value={paper.id} onChange={(event) => setPaperId(event.target.value)}>
                    {PAPER_SIZES.map((size) => (
                      <option key={size.id} value={size.id}>
                        {t(`idPhoto.paper.${size.id}`)}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <Form.Check id={`${ids}-fill`} type="checkbox" label={t('idPhoto.fill', { count: layout.capacity })} checked={fill} onChange={(event) => setFill(event.target.checked)} />

                <div className="erp-flow-pair">
                  {fill ? null : (
                    <div className="erp-flow-field">
                      <label className="erp-flow-field__label" htmlFor={`${ids}-copies`}>
                        {t('idPhoto.copies')}
                      </label>
                      <Form.Control id={`${ids}-copies`} type="text" inputMode="numeric" autoComplete="off" value={copiesText} isInvalid={!copiesOk || capacityBlocked} onChange={(event) => setCopiesText(event.target.value)} />
                    </div>
                  )}
                  <div className="erp-flow-field">
                    <label className="erp-flow-field__label" htmlFor={`${ids}-gap`}>
                      {t('idPhoto.gap')}
                    </label>
                    <InputGroup hasValidation={false}>
                      <Form.Control id={`${ids}-gap`} type="text" inputMode="decimal" autoComplete="off" value={gapText} isInvalid={!gapOk} onChange={(event) => setGapText(event.target.value)} />
                      <InputGroup.Text>mm</InputGroup.Text>
                    </InputGroup>
                  </div>
                </div>

                <Form.Check id={`${ids}-guides`} type="checkbox" label={t('idPhoto.guides')} checked={guides} onChange={(event) => setGuides(event.target.checked)} />

                {layout.capacity > 0 ? <PhotoSheetPreview layout={layout} /> : null}
                <p className="erp-flow-field__hint">
                  {t('idPhoto.layoutHint', { columns: layout.columns, rows: layout.rows, margin: SHEET_MARGIN })}
                </p>
              </>
            ) : null}
          </>
        ) : undefined
      }
    />
  )
}
