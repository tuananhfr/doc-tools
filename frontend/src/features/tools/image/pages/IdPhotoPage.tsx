import { useId, useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
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

const OUTPUTS: FlowChoiceOption<PhotoOutput>[] = [
  { value: 'pdf', label: 'Tờ in PDF', hint: 'In ở "Kích thước thật / 100%" là ra đúng milimét.' },
  { value: 'sheet', label: 'Tờ in JPG', hint: '300 DPI — cho máy in ảnh hoặc tiệm in chỉ nhận tệp ảnh.' },
  { value: 'single', label: 'Một ảnh thẻ', hint: 'Chỉ ảnh đã cắt đúng tỉ lệ — để nộp trực tuyến.' },
]

/** ẢNH THẺ & IN ẢNH — cắt một ảnh về đúng cỡ ảnh thẻ rồi xếp nhiều bản lên một tờ giấy in. */
export default function IdPhotoPage() {
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

  const blocked = !sheet
    ? null
    : !gapOk
      ? `Khoảng cách phải từ ${GAP_LIMIT.min} đến ${GAP_LIMIT.max} mm.`
      : !copiesOk
        ? 'Số bản phải là số nguyên từ 1.'
        : layout.capacity === 0
          ? 'Ảnh thẻ cỡ này không vừa khổ giấy đã chọn.'
          : !fill && copies !== null && copies > layout.capacity
            ? `Một tờ ${paper.label.split(' (')[0]} chỉ chứa được ${layout.capacity} ảnh cỡ này.`
            : null

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple={false}
      pickerTitle="Chọn ảnh chân dung"
      stage={
        ready && crop.rect ? (
          <CropStage item={item} state={{ ...initialCrop(item), rect: crop.rect }} aspect={photo.width / photo.height} disabled={run.state.phase === 'running'} onRectChange={crop.setRect} />
        ) : undefined
      }
      runLabel={output === 'single' ? 'Tạo ảnh thẻ' : `Tạo tờ in ${layout.cells.length} ảnh`}
      runIcon="person-badge"
      blocked={blocked}
      task={() => {
        if (!ready || !crop.rect) throw new Error('chưa chọn ảnh.')
        return idPhotoTask(item, crop.rect, { output, photo, layout, guides, paperLabel: paper.label.split(' (')[0] })
      }}
      options={
        ready ? (
          <>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-photo`}>
                Cỡ ảnh thẻ
              </label>
              <Form.Select id={`${ids}-photo`} value={photo.id} onChange={(event) => setPhotoId(event.target.value)}>
                {PHOTO_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label}
                  </option>
                ))}
              </Form.Select>
              <p className="erp-flow-field__hint">Chọn theo yêu cầu của nơi nhận hồ sơ — công cụ không biết quy định ảnh của từng loại giấy tờ, và không kiểm nền hay vị trí khuôn mặt.</p>
              {dpi !== null && dpi < LOW_DPI ? (
                <p className="erp-tool-form__error" role="alert">
                  Vùng đã chọn chỉ đạt {dpi} DPI ở cỡ này (nên từ {LOW_DPI}) — in ra sẽ nhoè. Kéo khung rộng hơn hoặc dùng ảnh nét hơn.
                </p>
              ) : null}
            </div>

            <FlowChoice legend="Tệp ra" value={output} options={OUTPUTS} onChange={setOutput} />

            {sheet ? (
              <>
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-paper`}>
                    Khổ giấy
                  </label>
                  <Form.Select id={`${ids}-paper`} value={paper.id} onChange={(event) => setPaperId(event.target.value)}>
                    {PAPER_SIZES.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <Form.Check id={`${ids}-fill`} type="checkbox" label={`Xếp kín tờ (${layout.capacity} ảnh)`} checked={fill} onChange={(event) => setFill(event.target.checked)} />

                <div className="erp-flow-pair">
                  {fill ? null : (
                    <div className="erp-flow-field">
                      <label className="erp-flow-field__label" htmlFor={`${ids}-copies`}>
                        Số bản
                      </label>
                      <Form.Control id={`${ids}-copies`} type="text" inputMode="numeric" autoComplete="off" value={copiesText} isInvalid={!copiesOk || blocked?.includes('chỉ chứa') === true} onChange={(event) => setCopiesText(event.target.value)} />
                    </div>
                  )}
                  <div className="erp-flow-field">
                    <label className="erp-flow-field__label" htmlFor={`${ids}-gap`}>
                      Khoảng cách
                    </label>
                    <InputGroup hasValidation={false}>
                      <Form.Control id={`${ids}-gap`} type="text" inputMode="decimal" autoComplete="off" value={gapText} isInvalid={!gapOk} onChange={(event) => setGapText(event.target.value)} />
                      <InputGroup.Text>mm</InputGroup.Text>
                    </InputGroup>
                  </div>
                </div>

                <Form.Check id={`${ids}-guides`} type="checkbox" label="Vẽ viền cắt quanh từng ảnh" checked={guides} onChange={(event) => setGuides(event.target.checked)} />

                {layout.capacity > 0 ? <PhotoSheetPreview layout={layout} /> : null}
                <p className="erp-flow-field__hint">
                  {layout.columns} cột × {layout.rows} hàng, lề giấy {SHEET_MARGIN} mm. Khi in chọn "Kích thước thật" (Actual size / 100%), không chọn "Vừa trang giấy" — không thì ảnh ra sai cỡ.
                </p>
              </>
            ) : null}
          </>
        ) : undefined
      }
    />
  )
}
