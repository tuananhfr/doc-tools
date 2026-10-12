import { useTranslation } from 'react-i18next'

const CENTER = 100
const RADIUS = 96
const PALETTE_SIZE = 6

function point(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return `${(CENTER + radius * Math.sin(rad)).toFixed(3)} ${(CENTER - radius * Math.cos(rad)).toFixed(3)}`
}

function slicePath(start: number, end: number) {
  return `M${CENTER} ${CENTER} L${point(start, RADIUS)} A${RADIUS} ${RADIUS} 0 ${end - start > 180 ? 1 : 0} 1 ${point(end, RADIUS)}Z`
}

/** Neighbouring slices never share a colour, including the last slice against the first one. */
function paletteIndex(index: number, count: number) {
  const color = index % PALETTE_SIZE
  return index === count - 1 && count > 1 && color === 0 ? 1 : color
}

function labelStyle(count: number) {
  if (count <= 6) return { size: 9, chars: 16 }
  if (count <= 12) return { size: 7.5, chars: 14 }
  if (count <= 20) return { size: 6, chars: 12 }
  return { size: 5, chars: 10 }
}

interface SpinWheelProps {
  options: string[]
  rotation: number
  durationMs: number
  onSpinEnd: () => void
}

export function SpinWheel({ options, rotation, durationMs, onSpinEnd }: SpinWheelProps) {
  const { t } = useTranslation('entertainment')
  const count = options.length
  const slice = 360 / Math.max(count, 1)
  const label = labelStyle(count)

  return <div className="cn-wheel" role="img" aria-label={count >= 2 ? t('wheel.wheelLabel', { total: count }) : t('wheel.emptyWheel')}>
    <span className="cn-wheel-pointer" aria-hidden="true" />
    <div className="cn-wheel-disc" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${durationMs}ms` }}
      onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === 'transform') onSpinEnd() }}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        {count < 2
          ? <circle className="cn-wheel-empty" cx={CENTER} cy={CENTER} r={RADIUS} />
          : options.map((option, index) => {
            const mid = (index + 0.5) * slice
            // Labels on the left half are anchored from the other side so they never read upside down.
            const leftHalf = mid > 180
            const text = option.length > label.chars ? `${option.slice(0, label.chars - 1)}…` : option
            return <g key={option}>
              <path className={`cn-wheel-slice cn-wheel-slice--${paletteIndex(index, count)}`} d={slicePath(index * slice, (index + 1) * slice)} />
              <text className="cn-wheel-label" x={CENTER + (leftHalf ? -1 : 1) * RADIUS * 0.6} y={CENTER} fontSize={label.size} transform={`rotate(${leftHalf ? mid + 90 : mid - 90} ${CENTER} ${CENTER})`}>{text}</text>
            </g>
          })}
        <circle className="cn-wheel-hub" cx={CENTER} cy={CENTER} r={11} />
      </svg>
    </div>
  </div>
}
