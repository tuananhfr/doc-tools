import { useId, useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { parseDecimal, useFlowRun } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { useImageFiles } from '../hooks/useImageFiles'
import { batchImagesTask } from '../services/batch-tasks'
import { canEncodeWebp, writableFormat } from '../services/image-codec'
import type { ImageFormat } from '../types/image.types'
import { DEFAULT_PATTERN, isResizeValue, patternProblem, renameAll, RESIZE_LIMIT, type ResizeMode } from '../utils/batch'
import { IMAGE_FORMAT } from '../utils/image-format'

type Target = ImageFormat | 'keep'
type Quality = 'high' | 'medium' | 'small'

const QUALITY_VALUE: Record<Quality, number> = { high: 0.92, medium: 0.8, small: 0.6 }

const RESIZE_MODES: { value: ResizeMode; label: string; unit: string }[] = [
  { value: 'keep', label: 'Giữ kích thước', unit: '' },
  { value: 'edge', label: 'Cạnh dài tối đa', unit: 'px' },
  { value: 'width', label: 'Chiều rộng', unit: 'px' },
  { value: 'height', label: 'Chiều cao', unit: 'px' },
  { value: 'percent', label: 'Theo phần trăm', unit: '%' },
]

const FIRST_VALUE: Record<ResizeMode, string> = { keep: '', edge: '1920', width: '1280', height: '1080', percent: '50' }

/** ẢNH HÀNG LOẠT — đổi cỡ, đổi định dạng và đổi tên cả lô trong một lượt. */
export default function BatchImagePage() {
  const ids = useId()
  const images = useImageFiles({ multiple: true })
  const run = useFlowRun()
  const [mode, setMode] = useState<ResizeMode>('edge')
  const [values, setValues] = useState(FIRST_VALUE)
  const [format, setFormat] = useState<Target>('keep')
  const [quality, setQuality] = useState<Quality>('high')
  const [pattern, setPattern] = useState(DEFAULT_PATTERN)
  const [startText, setStartText] = useState('1')
  // Safari không ghi được WebP — không mời thứ trình duyệt này không làm được.
  const [webp] = useState(canEncodeWebp)

  const count = images.items.length
  const value = mode === 'keep' ? null : parseDecimal(values[mode])
  const valueOk = isResizeValue(mode, value)
  const start = parseDecimal(startText)
  const startOk = start !== null && Number.isInteger(start) && start >= 0 && start <= 999_999
  const patternError = patternProblem(pattern)
  const numbered = pattern.includes('{n}')
  const lossy = format !== 'png' && (format !== 'keep' || images.items.some((item) => item.format !== 'png'))

  const blocked = !valueOk
    ? `Kích thước phải là số nguyên từ ${RESIZE_LIMIT[mode as Exclude<ResizeMode, 'keep'>].min} đến ${RESIZE_LIMIT[mode as Exclude<ResizeMode, 'keep'>].max}.`
    : patternError
      ? patternError
      : numbered && !startOk
        ? 'Số bắt đầu phải là số nguyên từ 0.'
        : null

  const sample =
    count > 0 && !patternError && (!numbered || startOk)
      ? renameAll(
          images.items.slice(0, 2).map((item) => item.name),
          images.items.slice(0, 2).map((item) => IMAGE_FORMAT[format === 'keep' ? writableFormat(item.format) : format].extension),
          { pattern, start: startOk ? start : 1 },
        )
      : []

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple
      pickerTitle="Chọn các ảnh cần xử lý"
      runLabel={count > 1 ? `Xử lý ${count} ảnh` : 'Xử lý ảnh'}
      runIcon="collection"
      blocked={blocked}
      task={() =>
        batchImagesTask(images.items, {
          resize: { mode, value: value ?? 0 },
          format,
          quality: QUALITY_VALUE[quality],
          rename: { pattern, start: startOk ? start : 1 },
        })
      }
      options={
        <>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-mode`}>
              Đổi kích thước
            </label>
            <Form.Select id={`${ids}-mode`} value={mode} onChange={(event) => setMode(event.target.value as ResizeMode)}>
              {RESIZE_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </div>
          {mode === 'keep' ? null : (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-value`}>
                {RESIZE_MODES.find((option) => option.value === mode)?.label}
              </label>
              <InputGroup hasValidation={false}>
                <Form.Control
                  id={`${ids}-value`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values[mode]}
                  isInvalid={!valueOk}
                  onChange={(event) => setValues((current) => ({ ...current, [mode]: event.target.value }))}
                />
                <InputGroup.Text>{RESIZE_MODES.find((option) => option.value === mode)?.unit}</InputGroup.Text>
              </InputGroup>
              <p className="erp-flow-field__hint">Giữ tỉ lệ ảnh. Ảnh đã nhỏ hơn cỡ này thì giữ nguyên — không phóng to.</p>
            </div>
          )}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-format`}>
              Định dạng ra
            </label>
            <Form.Select id={`${ids}-format`} value={format} onChange={(event) => setFormat(event.target.value as Target)}>
              <option value="keep">Giữ định dạng từng ảnh</option>
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              {webp ? <option value="webp">WebP</option> : null}
            </Form.Select>
          </div>
          {lossy ? (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-quality`}>
                Chất lượng JPG / WebP
              </label>
              <Form.Select id={`${ids}-quality`} value={quality} onChange={(event) => setQuality(event.target.value as Quality)}>
                <option value="high">Cao — gần như không khác ảnh gốc</option>
                <option value="medium">Vừa — cân giữa độ nét và dung lượng</option>
                <option value="small">Nhỏ gọn — nhẹ nhất</option>
              </Form.Select>
            </div>
          ) : null}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-pattern`}>
              Mẫu tên tệp
            </label>
            <Form.Control
              id={`${ids}-pattern`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={pattern}
              isInvalid={patternError !== null}
              onChange={(event) => setPattern(event.target.value)}
            />
            <p className="erp-flow-field__hint">
              <code>{'{name}'}</code> = tên gốc, <code>{'{n}'}</code> = số thứ tự. Ví dụ: <code>{'cong-trinh-{n}'}</code>
            </p>
          </div>
          {numbered ? (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-start`}>
                Số bắt đầu
              </label>
              <Form.Control id={`${ids}-start`} type="text" inputMode="numeric" autoComplete="off" value={startText} isInvalid={!startOk} onChange={(event) => setStartText(event.target.value)} />
            </div>
          ) : null}
          {sample.length > 0 ? (
            <p className="erp-flow-field__hint erp-image-output">
              Tên ra: <strong>{sample.join(', ')}</strong>
              {count > sample.length ? '…' : ''}
            </p>
          ) : null}
        </>
      }
    />
  )
}
