import { Fragment, useId, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { RangeField, ScopeField } from '../../components/decoration-fields'
import { DecorationStage } from '../../components/quick/DecorationStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { useStampImage } from '../../hooks/useStampImage'
import { decorateTask } from '../../services/page-tasks'
import { WATERMARK_COLOR, type Decorations, type PageScope, type StampAnchor, type WatermarkColor } from '../../types/decorations.types'
import { DEFAULT_WATERMARK, resolveScope } from '../../utils/decorations'

const ACCEPT: readonly QuickKind[] = ['pdf']

type StampKind = 'text' | 'image'

const KINDS: FlowChoiceOption<StampKind>[] = [
  { value: 'text', label: 'Dấu chữ', hint: '"BẢN SAO", "NHÁP", "MẬT"… chéo giữa trang.' },
  { value: 'image', label: 'Dấu ảnh / logo', hint: 'PNG nền trong suốt cho kết quả đẹp nhất.' },
]

const COLOR_LABEL: Record<WatermarkColor, string> = { gray: 'Xám', red: 'Đỏ', blue: 'Xanh' }

const ANCHORS: { value: StampAnchor; label: string }[] = [
  { value: 'bottomRight', label: 'Góc dưới — phải' },
  { value: 'bottomLeft', label: 'Góc dưới — trái' },
  { value: 'bottomCenter', label: 'Dưới — giữa' },
  { value: 'topRight', label: 'Góc trên — phải' },
  { value: 'topLeft', label: 'Góc trên — trái' },
  { value: 'topCenter', label: 'Trên — giữa' },
  { value: 'center', label: 'Giữa trang' },
  { value: 'middleLeft', label: 'Giữa — trái' },
  { value: 'middleRight', label: 'Giữa — phải' },
]

const IMAGE_MARGIN = 28

/** ĐÓNG DẤU PDF — dấu chữ (watermark) hoặc dấu ảnh / logo lên các trang của một tệp. */
export default function StampPdfPage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const stamp = useStampImage()
  const [kind, setKind] = useState<StampKind>('text')
  const [text, setText] = useState(DEFAULT_WATERMARK.text)
  const [color, setColor] = useState<WatermarkColor>(DEFAULT_WATERMARK.color)
  const [fontSize, setFontSize] = useState(DEFAULT_WATERMARK.fontSize)
  const [angle, setAngle] = useState(DEFAULT_WATERMARK.angle)
  const [textOpacity, setTextOpacity] = useState(DEFAULT_WATERMARK.opacity)
  const [anchor, setAnchor] = useState<StampAnchor>('bottomRight')
  const [widthRatio, setWidthRatio] = useState(0.25)
  const [imageOpacity, setImageOpacity] = useState(1)
  const [scope, setScope] = useState<PageScope>(DEFAULT_WATERMARK.scope)

  const [item] = quick.items
  const { image } = stamp
  const decorations = useMemo<Decorations>(
    () =>
      kind === 'text'
        ? { headerFooter: null, watermark: { text, fontSize, color, opacity: textOpacity, angle, scope } }
        : {
            headerFooter: null,
            watermark: null,
            imageStamp: image ? { bytes: image.bytes, mime: image.mime, aspect: image.aspect, anchor, widthRatio, margin: IMAGE_MARGIN, opacity: imageOpacity, scope } : null,
          },
    [kind, text, fontSize, color, textOpacity, angle, image, anchor, widthRatio, imageOpacity, scope],
  )

  const resolved = item
    ? resolveScope(
        scope,
        item.pages.map((page) => page.id),
      )
    : null
  const scopeError = resolved && !resolved.ok ? resolved.message : undefined
  const blocked =
    kind === 'text' && text.trim() === ''
      ? 'Nhập chữ cho dấu.'
      : kind === 'image' && !image
        ? 'Chưa chọn ảnh dấu.'
        : (scopeError ?? (resolved?.ok && resolved.ids.size === 0 ? 'Phạm vi đã chọn không có trang nào.' : null))

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple={false}
      pickerTitle="Chọn tệp PDF cần đóng dấu"
      stage={(running) => (item ? <DecorationStage item={item} decorations={decorations} stampUrl={image?.url} disabled={running} onClear={quick.clear} /> : null)}
      runLabel="Đóng dấu"
      runIcon="droplet-half"
      blocked={blocked}
      task={() => decorateTask(item, decorations, { suffix: 'đã đóng dấu', title: 'Đã đóng dấu lên tệp' })}
      options={
        <>
          <FlowChoice legend="Loại dấu" value={kind} options={KINDS} onChange={setKind} />

          {/* Khoá riêng cho từng nhánh: không có thì React tái dùng ô chữ làm ô chọn tệp (controlled -> uncontrolled). */}
          {kind === 'text' ? (
            <Fragment key="text">
              <Form.Group controlId={`${ids}-text`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">Nội dung</Form.Label>
                <Form.Control value={text} maxLength={60} autoComplete="off" isInvalid={text.trim() === ''} onChange={(event) => setText(event.target.value)} />
              </Form.Group>
              <Form.Group controlId={`${ids}-color`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">Màu</Form.Label>
                <Form.Select value={color} onChange={(event) => setColor(event.target.value as WatermarkColor)}>
                  {Object.values(WATERMARK_COLOR).map((value) => (
                    <option key={value} value={value}>
                      {COLOR_LABEL[value]}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <RangeField label="Cỡ chữ" value={fontSize} min={16} max={160} step={4} format={(size) => `${size} pt`} onChange={setFontSize} />
              <RangeField label="Độ đậm" value={Math.round(textOpacity * 100)} min={5} max={100} step={5} format={(percent) => `${percent}%`} onChange={(percent) => setTextOpacity(percent / 100)} />
              <RangeField label="Góc nghiêng" value={angle} min={-90} max={90} step={15} format={(degrees) => `${degrees}°`} onChange={setAngle} />
            </Fragment>
          ) : (
            <Fragment key="image">
              <Form.Group controlId={`${ids}-image`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">Ảnh dấu</Form.Label>
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
                  {stamp.loading ? 'Đang mở ảnh…' : image ? `Đang dùng: ${image.name}` : 'PNG hoặc JPG. Ảnh chỉ nằm trên máy bạn.'}
                </Form.Text>
              </Form.Group>
              <Form.Group controlId={`${ids}-anchor`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">Vị trí</Form.Label>
                <Form.Select value={anchor} onChange={(event) => setAnchor(event.target.value as StampAnchor)}>
                  {ANCHORS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <RangeField label="Bề rộng dấu" value={Math.round(widthRatio * 100)} min={5} max={100} step={5} format={(percent) => `${percent}% trang`} onChange={(percent) => setWidthRatio(percent / 100)} />
              <RangeField label="Độ đậm" value={Math.round(imageOpacity * 100)} min={10} max={100} step={5} format={(percent) => `${percent}%`} onChange={(percent) => setImageOpacity(percent / 100)} />
            </Fragment>
          )}

          <ScopeField value={scope} error={scopeError} mergeKey="scope" onChange={setScope} />
          <p className="erp-flow-field__hint">Dấu được vẽ đè lên trang trong tệp mới — đây không phải chữ ký số, không có giá trị xác thực.</p>
        </>
      }
    />
  )
}
