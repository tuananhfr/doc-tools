import { Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import {
  MARKUP_COLOR,
  MARKUP_TOOL,
  STAMP_PRESET,
  STROKE_WIDTH,
  type MarkupColor,
  type MarkupKind,
  type MarkupTool,
  type StampPreset,
  type StrokeWidth,
} from '../types/markup.types'
import { rgbCss } from '../utils/decorations'
import type { MarkupStyle } from '../utils/markup-draft'
import { MARKUP_COLORS, STAMP_PRESETS } from '../utils/markup-geometry'

const TOOLS: Record<MarkupTool, { icon: string; label: string; hint?: string }> = {
  select: { icon: 'cursor', label: 'Chọn / di chuyển' },
  pen: { icon: 'pencil', label: 'Bút' },
  line: { icon: 'slash-lg', label: 'Đường thẳng' },
  arrow: { icon: 'arrow-up-right', label: 'Mũi tên' },
  rect: { icon: 'square', label: 'Khung chữ nhật' },
  ellipse: { icon: 'circle', label: 'Khung tròn' },
  cloud: { icon: 'cloud', label: 'Đám mây (vùng sửa)' },
  highlight: { icon: 'highlighter', label: 'Tô sáng', hint: 'Tô sáng — kéo qua chữ để tô theo dòng, kéo ngoài chữ để tô một vùng' },
  underline: { icon: 'type-underline', label: 'Gạch chân', hint: 'Gạch chân — kéo qua chữ để gạch theo dòng' },
  strikeout: { icon: 'type-strikethrough', label: 'Gạch ngang', hint: 'Gạch ngang — kéo qua chữ để gạch theo dòng' },
  editText: { icon: 'input-cursor-text', label: 'Sửa chữ', hint: 'Sửa chữ — bấm vào dòng chữ để gõ lại, kéo để chọn một đoạn' },
  cover: { icon: 'eraser', label: 'Che chữ', hint: 'Che chữ — kéo qua chữ hoặc một vùng để phủ màu nền lên' },
  redact: {
    icon: 'square-fill',
    label: 'Xoá thật',
    hint: 'Xoá thật — kéo qua chữ hoặc một vùng; khi xuất, nội dung dưới khung bị xoá hẳn khỏi tệp',
  },
  text: { icon: 'fonts', label: 'Chữ' },
  note: { icon: 'sticky', label: 'Ghi chú' },
  stamp: { icon: 'patch-check', label: 'Dấu duyệt' },
}

const COLOR_LABEL: Record<MarkupColor, string> = {
  red: 'Đỏ',
  orange: 'Cam',
  yellow: 'Vàng',
  green: 'Xanh lá',
  blue: 'Xanh dương',
  black: 'Đen',
}

const WIDTH_LABEL: Record<StrokeWidth, string> = { 1: 'Nét mảnh', 2: 'Nét vừa', 4: 'Nét đậm' }
const TEXT_SIZE_LABEL: Record<StrokeWidth, string> = { 1: 'Chữ nhỏ', 2: 'Chữ vừa', 4: 'Chữ lớn' }

const WITH_WIDTH: ReadonlySet<string> = new Set(['pen', 'line', 'arrow', 'rect', 'ellipse', 'cloud', 'underline', 'strikeout', 'text'])

/** Sửa/che chữ lấy màu từ trang, không theo bảng màu. */
const FROM_PAGE: ReadonlySet<string> = new Set(['editText', 'cover', 'textEdit'])

interface MarkupToolbarProps {
  tool: MarkupTool
  /** Loại dấu đang chỉnh kiểu: công cụ đang cầm, hoặc dấu đang chọn khi cầm công cụ Chọn. */
  target: MarkupKind | MarkupTool | null
  style: Partial<MarkupStyle>
  /** Sửa chữ ở đây viết lại trang thật (chữ cũ biến mất khỏi tệp) — khỏi phải nhắc "chỉ che bề mặt". */
  realEdit: boolean
  canDelete: boolean
  canUndo: boolean
  canRedo: boolean
  onTool: (tool: MarkupTool) => void
  onStyle: (patch: Partial<MarkupStyle>) => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onDone: () => void
}

export function MarkupToolbar({ tool, target, style, realEdit, canDelete, canUndo, canRedo, onTool, onStyle, onDelete, onUndo, onRedo, onDone }: MarkupToolbarProps) {
  const fromPage = target !== null && FROM_PAGE.has(target)
  // Che chữ và dấu sửa chữ cũ chỉ phủ lên bề mặt — phải nói ra; sửa chữ thì tuỳ trang có viết lại được không.
  const surface = fromPage && !(target === 'editText' && realEdit)
  const redact = target === 'redact'
  const showColor = target !== null && target !== 'stamp' && !fromPage && !redact
  const showWidth = target !== null && WITH_WIDTH.has(target)
  const widthLabels = target === 'text' ? TEXT_SIZE_LABEL : WIDTH_LABEL

  return (
    <div className="erp-doc-markbar" role="toolbar" aria-label="Công cụ đánh dấu">
      <div className="erp-doc-markbar__group" role="group" aria-label="Công cụ">
        {Object.values(MARKUP_TOOL).map((id) => (
          <button
            key={id}
            type="button"
            className="erp-doc-tool erp-doc-markbar__tool"
            title={TOOLS[id].hint ?? TOOLS[id].label}
            aria-label={TOOLS[id].label}
            aria-pressed={tool === id}
            onClick={() => onTool(id)}
          >
            <Icon name={TOOLS[id].icon} />
          </button>
        ))}
      </div>

      {showColor ? (
        <div className="erp-doc-markbar__group" role="group" aria-label="Màu">
          {Object.values(MARKUP_COLOR).map((color) => (
            <button
              key={color}
              type="button"
              className="erp-doc-markbar__swatch"
              title={COLOR_LABEL[color]}
              aria-label={`Màu ${COLOR_LABEL[color].toLowerCase()}`}
              aria-pressed={style.color === color}
              onClick={() => onStyle({ color })}
            >
              <span style={{ background: rgbCss(MARKUP_COLORS[color]) }} />
            </button>
          ))}
        </div>
      ) : null}

      {showWidth ? (
        <div className="erp-doc-markbar__group" role="group" aria-label={target === 'text' ? 'Cỡ chữ' : 'Độ dày nét'}>
          {Object.values(STROKE_WIDTH).map((width) => (
            <button
              key={width}
              type="button"
              className="erp-doc-tool erp-doc-markbar__width"
              title={widthLabels[width]}
              aria-label={widthLabels[width]}
              aria-pressed={style.width === width}
              onClick={() => onStyle({ width })}
            >
              {target === 'text' ? (
                <span className="erp-doc-markbar__glyph" style={{ fontSize: 10 + width * 2 }}>
                  A
                </span>
              ) : (
                <span className="erp-doc-markbar__stroke" style={{ height: width + 1 }} />
              )}
            </button>
          ))}
        </div>
      ) : null}

      {surface ? (
        <p className="erp-doc-markbar__notice">
          <Icon name="info-circle" />
          Chỉ che trên bề mặt — chữ gốc vẫn còn trong tệp.
        </p>
      ) : null}

      {redact ? (
        <p className="erp-doc-markbar__notice erp-doc-markbar__notice--redact">
          <Icon name="exclamation-triangle" />
          Xoá thật: phần dưới khung đen bị xoá hẳn khỏi tệp khi xuất.
        </p>
      ) : null}

      {target === 'stamp' ? (
        <Form.Select
          size="sm"
          className="erp-doc-markbar__preset"
          aria-label="Mẫu dấu"
          value={style.preset}
          onChange={(event) => onStyle({ preset: event.target.value as StampPreset })}
        >
          {Object.values(STAMP_PRESET).map((preset) => (
            <option key={preset} value={preset}>
              {STAMP_PRESETS[preset].label}
            </option>
          ))}
        </Form.Select>
      ) : null}

      <div className="erp-doc-markbar__group erp-doc-markbar__actions" role="group" aria-label="Thao tác">
        <button type="button" className="erp-doc-tool erp-doc-tool--danger" title="Xoá dấu đang chọn (Delete)" aria-label="Xoá dấu đang chọn" disabled={!canDelete} onClick={onDelete}>
          <Icon name="trash3" />
        </button>
        <button type="button" className="erp-doc-tool" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled={!canUndo} onClick={onUndo}>
          <Icon name="arrow-counterclockwise" />
        </button>
        <button type="button" className="erp-doc-tool" title="Làm lại (Ctrl+Y)" aria-label="Làm lại" disabled={!canRedo} onClick={onRedo}>
          <Icon name="arrow-clockwise" />
        </button>
        <button type="button" className="erp-doc-tool erp-doc-markbar__done" onClick={onDone}>
          <Icon name="check-lg" />
          <span>Xong</span>
        </button>
      </div>
    </div>
  )
}
