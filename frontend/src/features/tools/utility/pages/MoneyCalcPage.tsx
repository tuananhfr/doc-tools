import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { MONEY_GROUPS, MONEY_PRESETS, type MoneyGroup, type MoneyUnit } from '../config/money-presets'
import { evaluatePreset, formatMoneyValue, presetCode } from '../utils/money'

const FIRST_PRESET: Record<MoneyGroup, string> = { percent: 'percent-of', tax: 'vat-add', profit: 'margin', split: 'split' }

const NO_VALUES: Record<string, string> = {}

const UNIT_SUFFIX: Record<MoneyUnit, string | undefined> = { money: 'đ', percent: '%', count: 'người' }

/**
 * TÍNH TIỀN & THUẾ — phần trăm, thuế, chiết khấu, lãi gộp, chia tiền. Kết quả
 * luôn kèm phép tính dựng từ các số ĐÃ HIỂU ("150.000" là một trăm năm mươi
 * nghìn) và mã công thức + phiên bản, để đối chiếu khi cách tính thay đổi.
 */
export default function MoneyCalcPage() {
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
                {outcome.rows[0].unit === 'money' ? <span className="erp-tool-result__unit"> đ</span> : null}
              </p>
              <p className="erp-tool-result__note">= {outcome.expression}</p>
              <CopyButton text={formatMoneyValue(outcome.rows[0].value, outcome.rows[0].unit)} label="Chép kết quả" className="align-self-start" />
              {outcome.rows.length > 1 ? (
                <ul className="erp-tool-rows mt-3">
                  {outcome.rows.slice(1).map((row) => (
                    <li key={row.label} className="erp-tool-row">
                      <span className="erp-tool-row__value">
                        {formatMoneyValue(row.value, row.unit)}
                        {row.unit === 'money' ? <span className="erp-tool-row__unit"> đ</span> : null}
                      </span>
                      <span className="erp-tool-row__label">{row.label}</span>
                      <CopyButton text={formatMoneyValue(row.value, row.unit)} label={`Chép ${row.label.toLowerCase()}`} iconOnly variant="link" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <p className="erp-tool-result__label">{preset.label}</p>
              <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
              <p className="erp-tool-result__note">{outcome.reason ?? (invalid.length > 0 ? 'Ô được đánh dấu chưa phải một con số hợp lệ (không âm; số người là số nguyên từ 1).' : 'Nhập đủ các ô để tính.')}</p>
            </>
          )}
          <p className="erp-tool-result__note mt-2">Mã công thức: {presetCode(preset)}</p>
        </div>
      }
    >
      <ToolSegments label="Loại phép tính" value={group} options={MONEY_GROUPS} onChange={setGroup} />

      <ToolPanel title="Số liệu">
        <div className="erp-tool-form">
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={presetSelect}>
              Phép tính
            </label>
            <Form.Select id={presetSelect} value={preset.id} onChange={(event) => setChosen((current) => ({ ...current, [group]: event.target.value }))}>
              {presets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="erp-tool-form__grid">
            {preset.inputs.map((input) => (
              <NumberField
                key={`${preset.id}.${input.key}`}
                label={input.label}
                unit={UNIT_SUFFIX[input.unit]}
                placeholder={input.placeholder}
                value={values[input.key] ?? ''}
                invalid={invalid.includes(input.key)}
                onChange={(value) => setValue(input.key, value)}
              />
            ))}
          </div>

          {group === 'tax' ? <p className="erp-flow-field__hint">Thuế suất do bạn tự nhập: mức thuế khác nhau theo mặt hàng và theo từng thời kỳ, công cụ không gắn sẵn con số nào.</p> : null}
          {group === 'profit' ? <p className="erp-flow-field__hint">Margin tính trên giá bán, markup tính trên giá vốn — cùng một khoản lãi cho hai con số khác nhau.</p> : null}
          <p className="erp-flow-field__hint">
            Số tiền: 150.000 và 150,000 đều là một trăm năm mươi nghìn; phần lẻ gõ 1500,5. Số đã hiểu được in lại trong phép tính bên cạnh. Kết quả hiện tới hai số lẻ, không tự làm tròn theo quy định kế toán nào.
          </p>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
