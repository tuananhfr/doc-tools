import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TextEditMarkup } from '../types/markup.types'
import { localFont } from '../services/local-fonts'
import { cssFont } from '../services/text-measure'
import type { FontStyle } from '../utils/font-style'
import { rgbCss } from '../utils/decorations'
import { EDIT_LINE_HEIGHT } from '../utils/markup-geometry'
import type { PageFrame } from '../utils/markup-draft'
import { baseToVisual, type Size } from '../utils/page-geometry'
import type { ReflowBlock } from '../utils/reflow-layout'

interface TextEditInputProps {
  markup: TextEditMarkup
  /** Khổ trang nhìn thấy (pt). */
  page: Size
  frame: PageFrame
  pxPerPt: number
  /** Chữ sẽ viết lại vào trang: khoảng cách dòng và mép trái các dòng sau lấy theo chữ gốc. */
  block?: Pick<ReflowBlock, 'pitch' | 'left'>
  onChange: (value: string) => void
  onDone: (keep: boolean) => void
}

// Đầu/đuôi dòng theo hhea của từng phông — để đặt chân chữ trong ô gõ trùng chân chữ lúc xuất.
const STAMP_LINE = { sans: { ascent: 1, descent: 0.265 }, serif: { ascent: 1.069, descent: 0.293 } }
// Arimo / Tinos giữ nguyên số của Arial / Times New Roman.
const MATCH_LINE = { sans: { ascent: 0.905, descent: 0.212 }, serif: { ascent: 0.891, descent: 0.216 } }

function lineMetrics(font: FontStyle): { ascent: number; descent: number } {
  const kind = font.serif ? 'serif' : 'sans'
  return (font.local ? localFont(font.local) : undefined) ?? (font.match ? MATCH_LINE : STAMP_LINE)[kind]
}

/**
 * Ô gõ đè đúng chỗ chữ gốc, xoay theo hướng chữ, cùng phông/cỡ/màu, bề rộng
 * bằng khung ngắt dòng — gõ tới đâu xuống dòng giống hệt lúc xuất tới đó.
 */
export function TextEditInput({ markup, page, frame, pxPerPt, block, onChange, onDone }: TextEditInputProps) {
  const { t } = useTranslation('pdf')
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = field.current
    if (!element) return
    element.focus({ preventScroll: true })
    element.select()
  }, [])

  const origin = baseToVisual(markup.frame.origin, frame.base, frame.rotation)
  // Chữ nghiêng bao nhiêu trên màn hình = góc chữ trong khung gốc trừ xoay thêm (theo chiều kim đồng hồ).
  const screenTurn = (frame.rotation - markup.frame.turn + 360) % 360
  const { ascent, descent } = lineMetrics(markup.font)
  const fontPx = markup.fontSize * pxPerPt
  const linePx = block ? block.pitch * pxPerPt : fontPx * EDIT_LINE_HEIGHT
  // Dòng đầu luôn bắt đầu ở gốc khối; các dòng sau lùi vào (thụt treo) hoặc lùi ra (thụt đầu dòng) so với nó.
  const hang = block?.left ?? 0
  // Trình duyệt làm tròn đầu/đuôi dòng về điểm ảnh nguyên rồi chia đôi phần dư — tính theo số thực là chữ trong ô gõ lệch ~1px so với chữ sau khi lưu.
  const ascentPx = Math.round(ascent * fontPx)
  const baselineInLine = ascentPx + Math.floor((linePx - ascentPx - Math.round(descent * fontPx)) / 2)
  const shift = markup.baseline * pxPerPt - baselineInLine

  return (
    <textarea
      ref={field}
      className="erp-doc-markup__input is-edit"
      aria-label={t('markup.replacement')}
      value={markup.text}
      spellCheck={false}
      style={{
        left: `${(origin.x / page.width) * 100}%`,
        top: `${(origin.y / page.height) * 100}%`,
        width: markup.frame.width * pxPerPt,
        height: Math.max(markup.frame.height * pxPerPt - shift, linePx),
        transform: `rotate(${screenTurn}deg) translateY(${shift}px)`,
        font: cssFont(markup.font, fontPx),
        lineHeight: `${linePx}px`,
        padding: `0 ${markup.inset * pxPerPt}px 0 ${(markup.inset + Math.max(0, hang)) * pxPerPt}px`,
        textIndent: -hang * pxPerPt,
        color: rgbCss(markup.ink),
        background: rgbCss(markup.fill),
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
