import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DOCUMENT_COLORS, rgbCss } from '../utils/decorations'
import { MARKUP_COLORS, NOTE_PADDING, noteFrameSize, textFrameSize, type MeasureText } from '../utils/markup-geometry'
import type { TextKind } from '../utils/markup-draft'
import type { MarkupColor } from '../types/markup.types'
import type { Point, Size } from '../utils/page-geometry'

export interface TextDraft {
  kind: TextKind
  /** Dấu đang sửa; `null` = dấu mới. */
  id: string | null
  /** Góc trên-trái trên trang nhìn thấy (pt). */
  at: Point
  fontSize: number
  color: MarkupColor
  value: string
  /** Bề rộng ngắt dòng đã kéo (pt) — có thì ô gõ cũng tự xuống dòng đúng chỗ đó. */
  wrap?: number
}

interface MarkupTextInputProps {
  draft: TextDraft
  page: Size
  pxPerPt: number
  measure: MeasureText
  onChange: (value: string) => void
  onDone: (keep: boolean) => void
}

/** Ô gõ chữ đặt đúng chỗ chữ sẽ nằm, cùng phông và cỡ với lúc xuất để khung đo lúc lưu khớp cái đã thấy. */
export function MarkupTextInput({ draft, page, pxPerPt, measure, onChange, onDone }: MarkupTextInputProps) {
  const { t } = useTranslation('pdf')
  const field = useRef<HTMLTextAreaElement>(null)
  const note = draft.kind === 'note'
  const wrapped = draft.wrap !== undefined
  const box = note ? noteFrameSize(draft.value, measure, draft.wrap) : textFrameSize(draft.value, draft.fontSize, measure, 0, draft.wrap)

  // `autoFocus` không chạy khi Modal đang giữ focus trong nó — gọi tay sau khi gắn.
  useEffect(() => {
    field.current?.focus({ preventScroll: true })
  }, [])

  return (
    <textarea
      ref={field}
      className={`erp-doc-markup__input${note ? ' is-note' : ''}${wrapped ? ' is-wrapped' : ''}`}
      aria-label={note ? t('markup.noteContent') : t('markup.textContent')}
      value={draft.value}
      spellCheck={false}
      style={{
        left: `${(draft.at.x / page.width) * 100}%`,
        top: `${(draft.at.y / page.height) * 100}%`,
        // +1 ký tự cho con trỏ: khung đo vừa khít chữ, không chừa chỗ gõ tiếp. Khung đã kéo thì giữ đúng bề rộng.
        width: box.width * pxPerPt + (wrapped ? 0 : draft.fontSize * pxPerPt),
        height: box.height * pxPerPt,
        fontSize: draft.fontSize * pxPerPt,
        padding: note ? NOTE_PADDING * pxPerPt : 0,
        color: rgbCss(note ? DOCUMENT_COLORS.text : MARKUP_COLORS[draft.color]),
        ['--erp-doc-note' as string]: rgbCss(MARKUP_COLORS[draft.color]),
      }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onDone(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onDone(false)
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          onDone(true)
        }
      }}
    />
  )
}
