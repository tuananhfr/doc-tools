import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { MONEY_GROUPS, MONEY_PRESETS, type MoneyGroup, type MoneyUnit } from '../config/money-presets'
import { evaluatePreset, formatMoneyValue, presetCode } from '../utils/money'

const FIRST_PRESET: Record<MoneyGroup, string> = { percent: 'percent-of', tax: 'vat-add', profit: 'margin', split: 'split' }

const NO_VALUES: Record<string, string> = {}

const UNIT_SUFFIX = { money: 'money.suffix.money', percent: 'money.suffix.percent', count: 'money.suffix.count' } as const satisfies Record<MoneyUnit, string>

/**
 * TÍNH TIỀN & THUẾ — phần trăm, thuế, chiết khấu, lãi gộp, chia tiền. Kết quả
 * luôn kèm phép tính dựng từ các số ĐÃ HIỂU ("150.000" là một trăm năm mươi
 * nghìn) và mã công thức + phiên bản, để đối chiếu khi cách tính thay đổi.
 */
export default function MoneyCalcPage() {
  const { t } = useTranslation('utility')
  const presetSelect = useId()
  const [group, setGroup] = useState<MoneyGroup>('percent')
  const [chosen, setChosen] = useState(FIRST_PRESET)
  /** Chữ đã gõ, theo từng phép tính: đổi phép rồi quay lại vẫn còn số cũ. */
  const [texts, setTexts] = useState<Record<string, Record<string, string>>>({})

  const presets = MONEY_PRESETS.filter((item) => item.group === group)
  const preset = presets.find((item) => item.id === chosen[group]) ?? presets[0]
  const values = texts[preset.id] ?? NO_VALUES
  const outcome = evaluatePreset(preset, values)
  const invalid = outcome.ok ? [] : outcome.invalid

  const setValue = (key: string, value: string) => setTexts((current) => ({ ...current, [preset.id]: { ...current[preset.id], [key]: value } }))

  return (
    <ToolBoard
      side={
        <div className="erp-tool-result" role="status">
          {outcome.ok ? (
            <>
              <p className="erp-tool-result__label">{outcome.rows[0].label}</p>
              <p className="erp-tool-result__value">
                {formatMoneyValue(outcome.rows[0].value, outcome.rows[0].unit)}
                {outcome.rows[0].unit === 'money' ? <span className="erp-tool-result__unit"> {t('money.suffix.money')}</span> : null}
              </p>
              <p className="erp-tool-result__note">= {outcome.expression}</p>
              <CopyButton text={formatMoneyValue(outcome.rows[0].value, outcome.rows[0].unit)} label={t('shared.copyResult')} className="align-self-start" />
              {outcome.rows.length > 1 ? (
                <ul className="erp-tool-rows mt-3">
                  {outcome.rows.slice(1).map((row) => (
                    <li key={row.label} className="erp-tool-row">
                      <span className="erp-tool-row__value">
                        {formatMoneyValue(row.value, row.unit)}
                        {row.unit === 'money' ? <span className="erp-tool-row__unit"> {t('money.suffix.money')}</span> : null}
                      </span>
                      <span className="erp-tool-row__label">{row.label}</span>
                      <CopyButton text={formatMoneyValue(row.value, row.unit)} label={t('money.copyRow', { label: row.label.toLowerCase() })} iconOnly variant="link" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <p className="erp-tool-result__label">{t(preset.label)}</p>
              <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
              <p className="erp-tool-result__note">{outcome.reason ?? (invalid.length > 0 ? t('money.invalid') : t('money.missing'))}</p>
            </>
          )}
          <p className="erp-tool-result__note mt-2">{t('money.formulaCode', { code: presetCode(preset) })}</p>
        </div>
      }
    >
      <ToolSegments label={t('money.groupLabel')} value={group} options={MONEY_GROUPS.map((item) => ({ ...item, label: t(item.label) }))} onChange={setGroup} />

      <ToolPanel title={t('money.panelTitle')}>
        <div className="erp-tool-form">
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={presetSelect}>
              {t('money.operation')}
            </label>
            <Form.Select id={presetSelect} value={preset.id} onChange={(event) => setChosen((current) => ({ ...current, [group]: event.target.value }))}>
              {presets.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.label)}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="erp-tool-form__grid">
            {preset.inputs.map((input) => (
              <NumberField
                key={`${preset.id}.${input.key}`}
                label={t(input.label)}
                unit={t(UNIT_SUFFIX[input.unit])}
                placeholder={input.placeholder ? t(input.placeholder) : undefined}
                value={values[input.key] ?? ''}
                invalid={invalid.includes(input.key)}
                onChange={(value) => setValue(input.key, value)}
              />
            ))}
          </div>

          {group === 'tax' ? <p className="erp-flow-field__hint">{t('money.taxHint')}</p> : null}
          {group === 'profit' ? <p className="erp-flow-field__hint">{t('money.profitHint')}</p> : null}
          <p className="erp-flow-field__hint">
            {t('money.inputHint')}
          </p>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
