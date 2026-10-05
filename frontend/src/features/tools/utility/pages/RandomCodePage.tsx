import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { CopyButton, ToolBoard, ToolPanel, ToolSegments, type ToolSegment } from '@/features/tools/hub'
import {
  CODE_LENGTH,
  CODE_PREFIX_MAX,
  DEFAULT_CODE,
  DEFAULT_PASSWORD,
  generateBatch,
  generateCode,
  generatePassword,
  PASSWORD_LENGTH,
  passwordBits,
  passwordClasses,
  passwordStrength,
  secureRng,
  type CodeCharset,
  type CodeOptions,
  type PasswordOptions,
  type PasswordStrength,
} from '../utils/random-code'

type Mode = 'password' | 'code'

interface Settings {
  mode: Mode
  password: PasswordOptions
  code: CodeOptions
  /** Số chuỗi mỗi lượt, theo từng chế độ. */
  count: Record<Mode, number>
}

const MODES: ToolSegment<Mode>[] = [
  { value: 'password', label: 'Mật khẩu', icon: 'key' },
  { value: 'code', label: 'Mã đơn, mã phiếu', icon: 'upc-scan' },
]

const COUNT_MAX: Record<Mode, number> = { password: 20, code: 100 }

const FIRST: Settings = { mode: 'password', password: DEFAULT_PASSWORD, code: DEFAULT_CODE, count: { password: 1, code: 10 } }

const CLASSES: { key: 'lower' | 'upper' | 'digits' | 'symbols'; label: string }[] = [
  { key: 'upper', label: 'Chữ hoa (A–Z)' },
  { key: 'lower', label: 'Chữ thường (a–z)' },
  { key: 'digits', label: 'Chữ số (0–9)' },
  { key: 'symbols', label: 'Ký hiệu (!@#$…)' },
]

const STRENGTH: Record<PasswordStrength, { label: string; icon: string; tone: string }> = {
  weak: { label: 'Yếu', icon: 'shield-exclamation', tone: 'danger' },
  fair: { label: 'Tạm được', icon: 'shield', tone: 'warning' },
  strong: { label: 'Mạnh', icon: 'shield-check', tone: 'success' },
  excellent: { label: 'Rất mạnh', icon: 'shield-fill-check', tone: 'success' },
}

const rng = secureRng()

function generate(settings: Settings): string[] {
  const count = settings.count[settings.mode]
  return generateBatch(count, settings.mode === 'password' ? () => generatePassword(settings.password, rng) : () => generateCode(settings.code, rng))
}

const clampInt = (text: string, min: number, max: number, fallback: number) => {
  const value = Math.round(Number(text))
  return Number.isFinite(value) && text.trim() !== '' ? Math.min(max, Math.max(min, value)) : fallback
}

/**
 * TẠO MÃ NGẪU NHIÊN — mật khẩu, hoặc một lô mã đơn / mã phiếu không trùng nhau.
 * Sinh bằng nguồn ngẫu nhiên mật mã của trình duyệt, ngay trên máy; đổi tuỳ chọn
 * nào là sinh lại ngay, không có trạng thái "tuỳ chọn một đằng, kết quả một nẻo".
 */
export default function RandomCodePage() {
  const ids = useId()
  const [settings, setSettings] = useState(FIRST)
  const [results, setResults] = useState(() => generate(FIRST))

  const apply = (next: Settings) => {
    setSettings(next)
    setResults(generate(next))
  }

  const { mode, password, code } = settings
  const count = settings.count[mode]
  const noClass = mode === 'password' && passwordClasses(password).length === 0
  const strength = STRENGTH[passwordStrength(passwordBits(password))]

  const setPassword = (patch: Partial<PasswordOptions>) => apply({ ...settings, password: { ...password, ...patch } })
  const setCode = (patch: Partial<CodeOptions>) => apply({ ...settings, code: { ...code, ...patch } })
  const setCount = (value: number) => apply({ ...settings, count: { ...settings.count, [mode]: value } })

  return (
    <ToolBoard
      side={
        <>
          <div className="erp-tool-side-head">
            <h2 className="erp-flow-options__title">Kết quả{results.length > 1 ? ` (${results.length})` : ''}</h2>
            {results.length > 1 ? <CopyButton text={results.join('\n')} label="Chép tất cả" size="sm" /> : null}
          </div>

          {noClass ? (
            <p className="erp-flow-field__hint">Bật ít nhất một nhóm ký tự để tạo mật khẩu.</p>
          ) : (
            <ul className="erp-tool-rows" aria-live="polite">
              {results.map((value) => (
                <li key={value} className="erp-tool-row erp-tool-row--code">
                  <code className="erp-tool-row__code">{value}</code>
                  <CopyButton text={value} label={`Chép ${value}`} iconOnly variant="link" />
                </li>
              ))}
            </ul>
          )}

          <Button variant="primary" className="erp-flow__run" disabled={noClass} onClick={() => setResults(generate(settings))}>
            <Icon name="arrow-repeat" className="me-2" />
            Tạo lại
          </Button>
        </>
      }
    >
      <ToolSegments label="Loại mã" value={mode} options={MODES} onChange={(next) => apply({ ...settings, mode: next })} />

      <ToolPanel title="Tuỳ chọn">
        <div className="erp-tool-form">
          {mode === 'password' ? (
            <>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-length`}>
                  Độ dài
                  <span className="erp-image-range__value">{password.length} ký tự</span>
                </label>
                <Form.Range
                  id={`${ids}-length`}
                  min={PASSWORD_LENGTH.min}
                  max={PASSWORD_LENGTH.max}
                  value={password.length}
                  onChange={(event) => setPassword({ length: Number(event.target.value) })}
                />
              </div>

              <fieldset className="erp-flow-options">
                <legend className="erp-flow-field__label">Dùng các nhóm ký tự</legend>
                <div className="erp-tool-checks">
                  {CLASSES.map((item) => (
                    <Form.Check
                      key={item.key}
                      id={`${ids}-${item.key}`}
                      type="checkbox"
                      label={item.label}
                      checked={password[item.key]}
                      onChange={(event) => setPassword({ [item.key]: event.target.checked })}
                    />
                  ))}
                </div>
              </fieldset>

              <Form.Check
                id={`${ids}-plain`}
                type="checkbox"
                label="Bỏ ký tự dễ nhìn nhầm (0 O o 1 l I)"
                checked={password.plain}
                onChange={(event) => setPassword({ plain: event.target.checked })}
              />

              {noClass ? null : (
                <p className={`erp-code-strength erp-code-strength--${strength.tone}`}>
                  <Icon name={strength.icon} />
                  <span>
                    Độ mạnh: <strong>{strength.label}</strong> · khoảng {Math.round(passwordBits(password))} bit
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <div className="erp-tool-form__grid">
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-prefix`}>
                    Tiền tố (không bắt buộc)
                  </label>
                  <Form.Control
                    id={`${ids}-prefix`}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={CODE_PREFIX_MAX}
                    placeholder="Ví dụ PX-"
                    value={code.prefix}
                    onChange={(event) => setCode({ prefix: event.target.value.slice(0, CODE_PREFIX_MAX) })}
                  />
                </div>
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-charset`}>
                    Phần ngẫu nhiên gồm
                  </label>
                  <Form.Select id={`${ids}-charset`} value={code.charset} onChange={(event) => setCode({ charset: event.target.value as CodeCharset })}>
                    <option value="alnum">Chữ hoa và số</option>
                    <option value="digits">Chỉ chữ số</option>
                  </Form.Select>
                </div>
              </div>

              <div className="erp-flow-field">
                <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-code-length`}>
                  Số ký tự ngẫu nhiên
                  <span className="erp-image-range__value">{code.length} ký tự</span>
                </label>
                <Form.Range id={`${ids}-code-length`} min={CODE_LENGTH.min} max={CODE_LENGTH.max} value={code.length} onChange={(event) => setCode({ length: Number(event.target.value) })} />
              </div>

              {code.charset === 'alnum' ? <p className="erp-flow-field__hint">Không dùng I, O, 0, 1 — mã đọc qua điện thoại hay chép tay không bị nhầm.</p> : null}
            </>
          )}

          <div className="erp-flow-field erp-tool-count">
            <label className="erp-flow-field__label" htmlFor={`${ids}-count`}>
              Số lượng mỗi lượt (tối đa {COUNT_MAX[mode]})
            </label>
            <Form.Control
              id={`${ids}-count`}
              type="number"
              inputMode="numeric"
              className="erp-tool-number"
              min={1}
              max={COUNT_MAX[mode]}
              value={count}
              onChange={(event) => setCount(clampInt(event.target.value, 1, COUNT_MAX[mode], 1))}
            />
          </div>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
