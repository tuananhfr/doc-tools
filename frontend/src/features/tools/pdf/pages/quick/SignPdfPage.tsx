import { Fragment, useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FlowChoice, ToolLeaveGuard, type FlowChoiceOption } from '@/features/tools/hub'
import { RangeField } from '../../components/decoration-fields'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { SignaturePad } from '../../components/quick/SignaturePad'
import { SignStage } from '../../components/quick/SignStage'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { useStampImage } from '../../hooks/useStampImage'
import { signTask } from '../../services/page-tasks'
import { renderSignature } from '../../services/signature-image'
import type { Point } from '../../utils/page-geometry'
import { SIGNATURE_INK, type SignatureInk, type Stroke } from '../../utils/signature'

const ACCEPT: readonly QuickKind[] = ['pdf']

type SignSource = 'draw' | 'image'

const SOURCES: FlowChoiceOption<SignSource>[] = [
  { value: 'draw', label: 'Vẽ tay', hint: 'Ký bằng chuột, ngón tay hoặc bút ngay trên màn hình.' },
  { value: 'image', label: 'Ảnh có sẵn', hint: 'Ảnh chụp / scan chữ ký. PNG nền trong suốt cho kết quả đẹp nhất.' },
]

const INK_LABEL: Record<SignatureInk, string> = { black: 'Đen', blue: 'Xanh' }

interface Placed {
  sourceId: string
  spots: Record<string, Point[]>
}

/** CHÈN CHỮ KÝ — vẽ tay hoặc chọn ảnh chữ ký rồi đặt lên trang. Là HÌNH chữ ký, không phải chữ ký số. */
export default function SignPdfPage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const stamp = useStampImage()
  const [source, setSource] = useState<SignSource>('draw')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [ink, setInk] = useState<SignatureInk>('blue')
  const [widthRatio, setWidthRatio] = useState(0.25)
  const [placed, setPlaced] = useState<Placed>({ sourceId: '', spots: {} })

  const [item] = quick.items
  const sourceId = item?.source.id ?? ''
  // Chỗ đặt thuộc về tệp đang mở: đổi tệp là bỏ, không để chữ ký của tệp cũ rơi vào trang của tệp mới.
  const spots = placed.sourceId === sourceId ? placed.spots : {}
  const pages = item ? item.pages.filter((page) => (spots[page.id]?.length ?? 0) > 0).length : 0
  const { image } = stamp

  const draw = (next: Stroke[], color: SignatureInk) => {
    setStrokes(next)
    setInk(color)
    if (next.length === 0) stamp.clear()
    else void stamp.load(() => renderSignature(next, color))
  }

  const pickSource = (next: SignSource) => {
    setSource(next)
    // Ảnh của nguồn kia không được ở lại: đang "Vẽ tay" mà trang vẫn hiện ảnh scan là ký nhầm.
    if (next === 'draw' && strokes.length > 0) void stamp.load(() => renderSignature(strokes, ink))
    else stamp.clear()
  }

  const blocked = !image
    ? source === 'draw'
      ? 'Chưa có chữ ký — vẽ vào ô ký trước.'
      : 'Chưa chọn ảnh chữ ký.'
    : pages === 0
      ? 'Chưa đặt chữ ký — bấm lên trang ở chỗ cần ký.'
      : null

  return (
    <>
      {/* Nét ký và chỗ đặt chỉ nằm trong RAM: rời màn là phải ký lại từ đầu. */}
      <ToolLeaveGuard active={strokes.length > 0 || pages > 0} />
      <QuickToolShell
        quick={quick}
        accept={ACCEPT}
        multiple={false}
        pickerTitle="Chọn tệp PDF cần chèn chữ ký"
        stage={(running) =>
          item ? (
            <SignStage
              key={sourceId}
              item={item}
              spots={spots}
              stamp={image ? { aspect: image.aspect, widthRatio } : null}
              url={image?.url}
              disabled={running}
              onChange={(pageId, next) => setPlaced({ sourceId, spots: { ...spots, [pageId]: next } })}
              onClear={quick.clear}
            />
          ) : null
        }
        runLabel={pages > 0 ? `Chèn chữ ký vào ${pages} trang` : 'Chèn chữ ký'}
        runIcon="pen"
        blocked={blocked}
        task={() => {
          if (!image) throw new Error('chưa có chữ ký.')
          return signTask(item, { bytes: image.bytes, mime: image.mime, aspect: image.aspect, widthRatio }, spots)
        }}
        options={
          <>
            <FlowChoice legend="Chữ ký" value={source} options={SOURCES} onChange={pickSource} />

            {/* Khoá riêng cho từng nhánh: không có thì React tái dùng ô chọn màu làm ô chọn tệp. */}
            {source === 'draw' ? (
              <Fragment key="draw">
                <div className="erp-flow-field">
                  <span className="erp-flow-field__label">Ô ký</span>
                  <SignaturePad strokes={strokes} ink={ink} disabled={false} onChange={(next) => draw(next, ink)} />
                  <div className="erp-sign-pad__actions">
                    <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={strokes.length === 0} onClick={() => draw(strokes.slice(0, -1), ink)}>
                      Bỏ nét cuối
                    </button>
                    <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={strokes.length === 0} onClick={() => draw([], ink)}>
                      Ký lại
                    </button>
                  </div>
                  {stamp.error ? (
                    <p className="erp-tool-form__error" role="alert" data-code={stamp.error.code}>
                      {stamp.error.message}
                    </p>
                  ) : null}
                </div>
                <Form.Group controlId={`${ids}-ink`} className="erp-flow-field">
                  <Form.Label className="erp-flow-field__label">Màu mực</Form.Label>
                  <Form.Select value={ink} onChange={(event) => draw(strokes, event.target.value as SignatureInk)}>
                    {Object.values(SIGNATURE_INK).map((value) => (
                      <option key={value} value={value}>
                        {INK_LABEL[value]}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Fragment>
            ) : (
              <Form.Group key="image" controlId={`${ids}-image`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">Ảnh chữ ký</Form.Label>
                <Form.Control
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  isInvalid={!!stamp.error}
                  aria-describedby={`${ids}-image-help`}
                  onChange={(event) => {
                    const file = (event.target as HTMLInputElement).files?.[0]
                    if (file) void stamp.pick(file)
                  }}
                />
                {stamp.error ? (
                  <Form.Control.Feedback type="invalid" data-code={stamp.error.code}>
                    {stamp.error.message}
                  </Form.Control.Feedback>
                ) : null}
                <Form.Text id={`${ids}-image-help`} className="erp-flow-field__hint">
                  {stamp.loading ? 'Đang mở ảnh…' : image ? `Đang dùng: ${image.name}` : 'PNG hoặc JPG. Ảnh chỉ nằm trên máy bạn. Ảnh JPG nền trắng sẽ che mất chữ bên dưới.'}
                </Form.Text>
              </Form.Group>
            )}

            <RangeField label="Bề rộng chữ ký" value={Math.round(widthRatio * 100)} min={5} max={60} step={1} format={(percent) => `${percent}% trang`} onChange={(percent) => setWidthRatio(percent / 100)} />
            <p className="erp-flow-field__hint">
              Đây là HÌNH chữ ký vẽ đè lên trang, không phải chữ ký số: không có chứng thư, không xác thực được người ký và không chứng minh tệp chưa bị sửa. Chữ ký không được lưu lại sau khi rời màn này.
            </p>
          </>
        }
      />
    </>
  )
}
