import { useId, useState, type CSSProperties } from 'react'
import { Button } from 'react-bootstrap'
import { Icon, useToast } from '@/components/ui'
import { formatQuantity, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { useThemeTokens } from '@/hooks'
import { ColorCodeField } from '../components/ColorCodeField'
import {
  BLACK,
  contrastLevel,
  contrastRatio,
  formatHex,
  formatHsl,
  formatRgb,
  hslToRgb,
  parseHex,
  parseHsl,
  parseRgb,
  rgbToHsl,
  WHITE,
  type ContrastLevel,
  type Rgb,
} from '../utils/color'

/** `EyeDropper` chưa có trong kiểu DOM của TypeScript; chỉ Chrome / Edge trên máy tính hỗ trợ. */
type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> }

const eyeDropper = (): EyeDropperConstructor | null => (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper ?? null

const LEVEL: Record<ContrastLevel, { label: string; icon: string; tone: string }> = {
  aaa: { label: 'Rất rõ (AAA)', icon: 'check-circle-fill', tone: 'success' },
  aa: { label: 'Đọc tốt (AA)', icon: 'check-circle', tone: 'success' },
  large: { label: 'Chỉ hợp chữ lớn', icon: 'exclamation-triangle', tone: 'warning' },
  fail: { label: 'Khó đọc', icon: 'x-circle', tone: 'danger' },
}

/** Tương phản của chữ trắng / chữ đen đặt trên màu đang chọn. */
function ContrastRow({ label, ratio, sample }: { label: string; ratio: number; sample: CSSProperties }) {
  const level = LEVEL[contrastLevel(ratio)]

  return (
    <li className="erp-color-contrast">
      <span className="erp-color-contrast__sample" style={sample} aria-hidden="true">
        Aa
      </span>
      <span className="erp-color-contrast__text">
        <span className="erp-color-contrast__label">{label}</span>
        <span className="erp-color-contrast__ratio">{formatQuantity(Math.round(ratio * 100) / 100)} : 1</span>
      </span>
      <span className={`erp-color-contrast__level erp-color-contrast__level--${level.tone}`}>
        <Icon name={level.icon} />
        {level.label}
      </span>
    </li>
  )
}

/** MÀU SẮC — chọn một màu, đọc mã của nó ở ba dạng HEX / RGB / HSL, sửa dạng nào hai dạng kia đổi theo. */
export default function ColorPage() {
  const pickerId = useId()
  const toast = useToast()
  const tokens = useThemeTokens()
  const [color, setColor] = useState<Rgb>(() => parseHex(tokens.brand) ?? BLACK)

  const hex = formatHex(color)
  const canPick = eyeDropper() !== null

  const pickFromScreen = async () => {
    const EyeDropper = eyeDropper()
    if (!EyeDropper) return
    try {
      const picked = parseHex((await new EyeDropper().open()).sRGBHex)
      if (picked) setColor(picked)
    } catch (error) {
      // Nhấn Esc để thôi hút màu không phải lỗi.
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error('Không hút được màu từ màn hình.')
    }
  }

  return (
    <ToolBoard
      sideLabel="Xem thử"
      side={
        <>
          <h2 className="erp-flow-options__title">Xem thử</h2>
          {/* Giá trị động: màu do người dùng chọn, không phải màu của giao diện. */}
          <div className="erp-color-swatch" style={{ backgroundColor: hex }} role="img" aria-label={`Màu ${hex}`} />
          <div className="erp-flow-field">
            <span className="erp-flow-field__label">Chữ đặt trên màu này</span>
            <ul className="erp-color-contrasts">
              <ContrastRow label="Chữ trắng" ratio={contrastRatio(color, WHITE)} sample={{ backgroundColor: hex, color: formatHex(WHITE) }} />
              <ContrastRow label="Chữ đen" ratio={contrastRatio(color, BLACK)} sample={{ backgroundColor: hex, color: formatHex(BLACK) }} />
            </ul>
            <p className="erp-flow-field__hint">Tỷ lệ tương phản theo WCAG: từ 4,5 : 1 là chữ thường đọc được, từ 3 : 1 chỉ đủ cho chữ lớn và icon.</p>
          </div>
        </>
      }
    >
      <ToolPanel title="Chọn màu">
        <div className="erp-tool-form">
          <div className="erp-color-pick">
            <label className="visually-hidden" htmlFor={pickerId}>
              Bảng chọn màu
            </label>
            <input id={pickerId} type="color" className="erp-color-pick__input" value={hex.toLowerCase()} onChange={(event) => setColor(parseHex(event.target.value) ?? color)} />
            <div className="erp-color-pick__text">
              <p className="erp-color-pick__hex">{hex}</p>
              <p className="erp-flow-field__hint">Bấm vào ô màu để mở bảng chọn, hoặc gõ mã ở dưới.</p>
              {canPick ? (
                <Button variant="outline-secondary" size="sm" className="align-self-start" onClick={() => void pickFromScreen()}>
                  <Icon name="eyedropper" className="me-2" />
                  Hút màu từ màn hình
                </Button>
              ) : null}
            </div>
          </div>

          <ColorCodeField label="HEX" code={hex} parse={parseHex} onColor={setColor} />
          <ColorCodeField label="RGB" code={formatRgb(color)} parse={parseRgb} onColor={setColor} />
          <ColorCodeField
            label="HSL"
            code={formatHsl(rgbToHsl(color))}
            parse={(text) => {
              const hsl = parseHsl(text)
              return hsl ? hslToRgb(hsl) : null
            }}
            onColor={setColor}
          />
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
