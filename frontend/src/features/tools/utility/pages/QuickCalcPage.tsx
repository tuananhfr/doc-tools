import { CalculationStudio } from '@/features/tools/utility/components/CalculationStudio'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { NumberField } from '../components/NumberField'
import { CALC_FORMULAS, CALC_GROUPS, type CalcGroup } from '../config/calc-formulas'
import { evaluateFormula, formatResult, QUANTITY_KEY } from '../utils/calc'

const FIRST_FORMULA: Record<CalcGroup, string> = { area: 'rectangle', volume: 'box', mass: 'rebar' }
const FORMULA_ICONS: Record<string, string> = { rectangle: 'aspect-ratio', triangle: 'triangle', circle: 'circle', box: 'box', cylinder: 'database', rebar: 'grip-vertical', plate: 'layers', density: 'boxes' }

const NO_VALUES: Record<string, string> = {}

/**
 * TÍNH TOÁN NHANH — diện tích, thể tích, khối lượng của các hình hay gặp ở công
 * trường. Kết quả đổi theo từng phím gõ và luôn kèm phép tính đã dùng, để người
 * dùng soát được máy hiểu con số mình gõ thế nào.
 */
export default function QuickCalcPage() {
  const { t } = useTranslation('utility')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.quickCalc' })
  const formulaSelect = useId()
  const [group, setGroup] = useState<CalcGroup>('area')
  const [chosen, setChosen] = useState(FIRST_FORMULA)
  /** Chữ đã gõ, theo từng công thức: đổi hình rồi quay lại vẫn còn số cũ. */
  const [texts, setTexts] = useState<Record<string, Record<string, string>>>({})
  const [quantity, setQuantity] = useState('')

  const formulas = CALC_FORMULAS.filter((item) => item.group === group)
  const formula = formulas.find((item) => item.id === chosen[group]) ?? formulas[0]
  const values = texts[formula.id] ?? NO_VALUES
  const outcome = evaluateFormula(formula, values, quantity)
  const groupInfo = CALC_GROUPS.find((item) => item.value === group) ?? CALC_GROUPS[0]
  const invalid = outcome.ok ? [] : outcome.invalid

  const setValues = (patch: Record<string, string>) => setTexts((current) => ({ ...current, [formula.id]: { ...current[formula.id], ...patch } }))

  return (
    <CalculationStudio kind="quick"><ToolBoard className="cn-quickcalc-workspace cn-calculation-workspace" layout="compact"
      side={
        <div className="erp-tool-result cn-calculation-result" role="status">
          <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name={group === 'area' ? 'bounding-box' : group === 'volume' ? 'box' : 'bricks'} /></span><div><h2>2. {studio('resultTitle')}</h2><p>{studio('resultHint')}</p></div></div>
          <p className="erp-tool-result__label">{t(groupInfo.label)}</p>
          {outcome.ok ? (
            <>
              <p className="erp-tool-result__value">
                {formatResult(outcome.value)} <span className="erp-tool-result__unit">{groupInfo.unit}</span>
              </p>
              <p className="erp-tool-result__note">= {outcome.expression}</p>
              {group === 'mass' && outcome.value >= 1000 ? <p className="erp-tool-result__note">{t('quickCalc.tonnes', { value: formatResult(outcome.value / 1000) })}</p> : null}
              {outcome.quantity !== 1 ? (
                <p className="erp-tool-result__note">
                  {t('quickCalc.perPiece', { value: formatResult(outcome.single), unit: groupInfo.unit })}
                </p>
              ) : null}
              <CopyButton text={formatResult(outcome.value)} label={t('shared.copyResult')} variant="primary" className="cn-calculation-copy" />
            </>
          ) : (
            <>
              <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
              <p className="erp-tool-result__note">{invalid.length > 0 ? t('quickCalc.invalid') : t('quickCalc.missing')}</p>
            </>
          )}
        </div>
      }
    >
      <ToolSegments label={t('quickCalc.groupLabel')} value={group} options={CALC_GROUPS.map((item) => ({ ...item, label: t(item.label) }))} onChange={setGroup} />

      <ToolPanel title={`1. ${t('quickCalc.panelTitle')}`} actions={<span className="cn-studio-small-icon"><Icon name="calculator" /></span>}>
        <p className="cn-studio-form-hint">{studio('inputHint')}</p>
        <div className="erp-tool-form">
          <div className="erp-flow-field">
            <span className="erp-flow-field__label" id={formulaSelect}>
              {group === 'mass' ? t('quickCalc.material') : t('quickCalc.shape')}
            </span>
            <div className="cn-calc-formulas" role="group" aria-labelledby={formulaSelect}>
              {formulas.map((item) => (
                <button type="button" key={item.id} aria-pressed={item.id === formula.id} onClick={() => setChosen(current => ({ ...current, [group]: item.id }))}>
                  {item.id === 'trapezoid' ? <svg className="cn-calc-shape-art" width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M9 7h14l7 19H2Z" /></svg> : <Icon name={FORMULA_ICONS[item.id]} />}<span>{t(item.label)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="erp-tool-form__grid">
            {formula.inputs.map((input) => (
              <NumberField
                key={`${formula.id}.${input.key}`}
                label={t(input.label)}
                unit={input.unit}
                value={values[input.key] ?? ''}
                invalid={invalid.includes(input.key)}
                onChange={(value) => setValues({ [input.key]: value })}
              />
            ))}
            <NumberField label={t('quickCalc.quantity')} unit={t('quickCalc.pieces')} placeholder="1" value={quantity} invalid={invalid.includes(QUANTITY_KEY)} onChange={setQuantity} />
          </div>

          {formula.presets ? (
            <div className="erp-tool-presets" role="group" aria-label={t('quickCalc.densityPresets')}>
              {formula.presets.map((preset) => (
                <Button key={preset.label} variant="outline-secondary" size="sm" onClick={() => setValues(preset.values)}>
                  {t(preset.label)}
                </Button>
              ))}
            </div>
          ) : null}

          <p className="erp-flow-field__hint">{t('quickCalc.decimalHint')}</p>
        </div>
      </ToolPanel>
    </ToolBoard></CalculationStudio>
  )
}
