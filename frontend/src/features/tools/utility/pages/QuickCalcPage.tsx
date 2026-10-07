import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { CALC_FORMULAS, CALC_GROUPS, type CalcGroup } from '../config/calc-formulas'
import { evaluateFormula, formatResult, QUANTITY_KEY } from '../utils/calc'

const FIRST_FORMULA: Record<CalcGroup, string> = { area: 'rectangle', volume: 'box', mass: 'rebar' }

const NO_VALUES: Record<string, string> = {}

/**
 * TÍNH TOÁN NHANH — diện tích, thể tích, khối lượng của các hình hay gặp ở công
 * trường. Kết quả đổi theo từng phím gõ và luôn kèm phép tính đã dùng, để người
 * dùng soát được máy hiểu con số mình gõ thế nào.
 */
export default function QuickCalcPage() {
  const { t } = useTranslation('utility')
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
    <ToolBoard
      side={
        <div className="erp-tool-result" role="status">
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
              <CopyButton text={formatResult(outcome.value)} label={t('shared.copyResult')} className="align-self-start" />
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

      <ToolPanel title={t('quickCalc.panelTitle')}>
        <div className="erp-tool-form">
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={formulaSelect}>
              {group === 'mass' ? t('quickCalc.material') : t('quickCalc.shape')}
            </label>
            <Form.Select id={formulaSelect} value={formula.id} onChange={(event) => setChosen((current) => ({ ...current, [group]: event.target.value }))}>
              {formulas.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.label)}
                </option>
              ))}
            </Form.Select>
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
    </ToolBoard>
  )
}
