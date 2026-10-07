import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { rgbCss } from '../../utils/decorations'
import { INK_COLOR, SIGNATURE_PAD, SIGNATURE_STROKE, strokePath, type SignatureInk, type Stroke } from '../../utils/signature'

interface SignaturePadProps {
  strokes: Stroke[]
  ink: SignatureInk
  disabled: boolean
  onChange: (strokes: Stroke[]) => void
}

/** Điểm cách điểm trước dưới mức này (đơn vị ô ký) thì bỏ — chuột 1000 Hz sinh hàng nghìn điểm trùng nhau. */
const MIN_STEP = 1.5

/** Ô ký tay: kéo chuột / ngón tay / bút để vẽ. Nét lưu theo hệ `SIGNATURE_PAD`, không theo điểm ảnh màn hình. */
export function SignaturePad({ strokes, ink, disabled, onChange }: SignaturePadProps) {
  const { t } = useTranslation('pdf')
  const drawing = useRef(false)
  const [draft, setDraft] = useState<Stroke | null>(null)

  const toPoint = (event: PointerEvent<SVGSVGElement>) => {
    const frame = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.min(SIGNATURE_PAD.width, Math.max(0, ((event.clientX - frame.left) / frame.width) * SIGNATURE_PAD.width)),
      y: Math.min(SIGNATURE_PAD.height, Math.max(0, ((event.clientY - frame.top) / frame.height) * SIGNATURE_PAD.height)),
    }
  }

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0) return
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    setDraft([toPoint(event)])
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return
    const point = toPoint(event)
    setDraft((current) => {
      if (!current) return current
      const last = current[current.length - 1]
      return Math.hypot(point.x - last.x, point.y - last.y) < MIN_STEP ? current : [...current, point]
    })
  }

  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    if (draft && draft.length > 0) onChange([...strokes, draft])
    setDraft(null)
  }

  const cancel = () => {
    drawing.current = false
    setDraft(null)
  }

  const shown = draft ? [...strokes, draft] : strokes

  return (
    <svg
      className={`erp-sign-pad${disabled ? ' is-disabled' : ''}`}
      viewBox={`0 0 ${SIGNATURE_PAD.width} ${SIGNATURE_PAD.height}`}
      role="img"
      aria-label={strokes.length > 0 ? t('signStage.pad', { count: strokes.length }) : t('signStage.padEmpty')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <rect className="erp-sign-pad__paper" width={SIGNATURE_PAD.width} height={SIGNATURE_PAD.height} />
      <line className="erp-sign-pad__rule" x1={24} x2={SIGNATURE_PAD.width - 24} y1={SIGNATURE_PAD.height * 0.78} y2={SIGNATURE_PAD.height * 0.78} />
      {shown.map((stroke, index) => (
        <path key={index} d={strokePath(stroke)} fill="none" strokeWidth={SIGNATURE_STROKE} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: rgbCss(INK_COLOR[ink]) }} />
      ))}
    </svg>
  )
}
