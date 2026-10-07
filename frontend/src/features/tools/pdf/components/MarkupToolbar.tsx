import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
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
import { MARKUP_COLORS, stampLabel } from '../utils/markup-geometry'

type HintedTool = 'highlight' | 'underline' | 'strikeout' | 'editText' | 'cover' | 'redact'

const TOOLS: Record<MarkupTool, { icon: string; hint?: HintedTool }> = {
  select: { icon: 'cursor' },
  pen: { icon: 'pencil' },
  line: { icon: 'slash-lg' },
  arrow: { icon: 'arrow-up-right' },
  rect: { icon: 'square' },
  ellipse: { icon: 'circle' },
  cloud: { icon: 'cloud' },
  highlight: { icon: 'highlighter', hint: 'highlight' },
  underline: { icon: 'type-underline', hint: 'underline' },
  strikeout: { icon: 'type-strikethrough', hint: 'strikeout' },
  editText: { icon: 'input-cursor-text', hint: 'editText' },
  cover: { icon: 'eraser', hint: 'cover' },
  redact: { icon: 'square-fill', hint: 'redact' },
  text: { icon: 'fonts' },
  note: { icon: 'sticky' },
  stamp: { icon: 'patch-check' },
}

const WIDTH_KEY: Record<StrokeWidth, 'thin' | 'medium' | 'thick'> = { 1: 'thin', 2: 'medium', 4: 'thick' }

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
  const { t } = useTranslation('pdf')
  const fromPage = target !== null && FROM_PAGE.has(target)
  // Che chữ và dấu sửa chữ cũ chỉ phủ lên bề mặt — phải nói ra; sửa chữ thì tuỳ trang có viết lại được không.
  const surface = fromPage && !(target === 'editText' && realEdit)
  const redact = target === 'redact'
  const showColor = target !== null && target !== 'stamp' && !fromPage && !redact
  const showWidth = target !== null && WITH_WIDTH.has(target)
  const widthLabel = (width: StrokeWidth) => t(target === 'text' ? `markup.textSize.${WIDTH_KEY[width]}` : `markup.width.${WIDTH_KEY[width]}`)
  const toolHint = (id: MarkupTool) => {
    const hint = TOOLS[id].hint
    return hint ? t(`markup.hint.${hint}`) : t(`markup.tool.${id}`)
  }
  const colorLabel = (color: MarkupColor) => t(`markup.color.${color}`)

  return (
    <div className="erp-doc-markbar" role="toolbar" aria-label={t('markup.toolbar')}>
      <div className="erp-doc-markbar__group" role="group" aria-label={t('markup.tools')}>
        {Object.values(MARKUP_TOOL).map((id) => (
          <button
            key={id}
            type="button"
            className="erp-doc-tool erp-doc-markbar__tool"
            title={toolHint(id)}
            aria-label={t(`markup.tool.${id}`)}
            aria-pressed={tool === id}
            onClick={() => onTool(id)}
          >
            <Icon name={TOOLS[id].icon} />
          </button>
        ))}
      </div>

      {showColor ? (
        <div className="erp-doc-markbar__group" role="group" aria-label={t('stamp.color')}>
          {Object.values(MARKUP_COLOR).map((color) => (
            <button
              key={color}
              type="button"
              className="erp-doc-markbar__swatch"
              title={colorLabel(color)}
              aria-label={t('markup.colorAria', { color: colorLabel(color).toLowerCase() })}
              aria-pressed={style.color === color}
              onClick={() => onStyle({ color })}
            >
              <span style={{ background: rgbCss(MARKUP_COLORS[color]) }} />
            </button>
          ))}
        </div>
      ) : null}

      {showWidth ? (
        <div className="erp-doc-markbar__group" role="group" aria-label={target === 'text' ? t('shared.fontSize') : t('markup.strokeWidth')}>
          {Object.values(STROKE_WIDTH).map((width) => (
            <button
              key={width}
              type="button"
              className="erp-doc-tool erp-doc-markbar__width"
              title={widthLabel(width)}
              aria-label={widthLabel(width)}
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
          {t('markup.surfaceNotice')}
        </p>
      ) : null}

      {redact ? (
        <p className="erp-doc-markbar__notice erp-doc-markbar__notice--redact">
          <Icon name="exclamation-triangle" />
          {t('markup.redactNotice')}
        </p>
      ) : null}

      {target === 'stamp' ? (
        <Form.Select
          size="sm"
          className="erp-doc-markbar__preset"
          aria-label={t('markup.preset')}
          value={style.preset}
          onChange={(event) => onStyle({ preset: event.target.value as StampPreset })}
        >
          {Object.values(STAMP_PRESET).map((preset) => (
            <option key={preset} value={preset}>
              {stampLabel(preset)}
            </option>
          ))}
        </Form.Select>
      ) : null}

      <div className="erp-doc-markbar__group erp-doc-markbar__actions" role="group" aria-label={t('markup.actions')}>
        <button type="button" className="erp-doc-tool erp-doc-tool--danger" title={t('markup.deleteHint')} aria-label={t('markup.delete')} disabled={!canDelete} onClick={onDelete}>
          <Icon name="trash3" />
        </button>
        <button type="button" className="erp-doc-tool" title={t('toolbar.undoHint')} aria-label={t('toolbar.undo')} disabled={!canUndo} onClick={onUndo}>
          <Icon name="arrow-counterclockwise" />
        </button>
        <button type="button" className="erp-doc-tool" title={t('toolbar.redoHint')} aria-label={t('toolbar.redo')} disabled={!canRedo} onClick={onRedo}>
          <Icon name="arrow-clockwise" />
        </button>
        <button type="button" className="erp-doc-tool erp-doc-markbar__done" onClick={onDone}>
          <Icon name="check-lg" />
          <span>{t('markup.done')}</span>
        </button>
      </div>
    </div>
  )
}
