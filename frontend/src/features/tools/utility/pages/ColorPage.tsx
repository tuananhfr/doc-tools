import { useId, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
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

const LEVEL: Record<ContrastLevel, { label: ParseKeys<'utility'>; icon: string; tone: string }> = {
  aaa: { label: 'color.levels.aaa', icon: 'check-circle-fill', tone: 'success' },
  aa: { label: 'color.levels.aa', icon: 'check-circle', tone: 'success' },
  large: { label: 'color.levels.large', icon: 'exclamation-triangle', tone: 'warning' },
  fail: { label: 'color.levels.fail', icon: 'x-circle', tone: 'danger' },
}

/** Tương phản của chữ trắng / chữ đen đặt trên màu đang chọn. */
function ContrastRow({ label, ratio, sample }: { label: string; ratio: number; sample: CSSProperties }) {
  const { t } = useTranslation('utility')
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
        {t(level.label)}
      </span>
    </li>
  )
}

/** MÀU SẮC — chọn một màu, đọc mã của nó ở ba dạng HEX / RGB / HSL, sửa dạng nào hai dạng kia đổi theo. */
export default function ColorPage() {
  const { t } = useTranslation('utility')
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
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(t('color.pickFailed'))
    }
  }

  return (
    <ToolBoard
      sideLabel={t('color.preview')}
      side={
        <>
          <h2 className="erp-flow-options__title">{t('color.preview')}</h2>
          {/* Giá trị động: màu do người dùng chọn, không phải màu của giao diện. */}
          <div className="erp-color-swatch" style={{ backgroundColor: hex }} role="img" aria-label={t('color.swatch', { hex })} />
          <div className="erp-flow-field">
            <span className="erp-flow-field__label">{t('color.textOnColor')}</span>
            <ul className="erp-color-contrasts">
              <ContrastRow label={t('color.whiteText')} ratio={contrastRatio(color, WHITE)} sample={{ backgroundColor: hex, color: formatHex(WHITE) }} />
              <ContrastRow label={t('color.blackText')} ratio={contrastRatio(color, BLACK)} sample={{ backgroundColor: hex, color: formatHex(BLACK) }} />
            </ul>
            <p className="erp-flow-field__hint">{t('color.contrastHint')}</p>
          </div>
        </>
      }
    >
      <ToolPanel title={t('color.panelTitle')}>
        <div className="erp-tool-form">
          <div className="erp-color-pick">
            <label className="visually-hidden" htmlFor={pickerId}>
              {t('color.picker')}
            </label>
            <input id={pickerId} type="color" className="erp-color-pick__input" value={hex.toLowerCase()} onChange={(event) => setColor(parseHex(event.target.value) ?? color)} />
            <div className="erp-color-pick__text">
              <p className="erp-color-pick__hex">{hex}</p>
              <p className="erp-flow-field__hint">{t('color.pickerHint')}</p>
              {canPick ? (
                <Button variant="outline-secondary" size="sm" className="align-self-start" onClick={() => void pickFromScreen()}>
                  <Icon name="eyedropper" className="me-2" />
                  {t('color.eyedropper')}
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
