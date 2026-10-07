import { useId, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
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

type UtilityKey = ParseKeys<'utility'>

const MODES: (Omit<ToolSegment<Mode>, 'label'> & { label: UtilityKey })[] = [
  { value: 'password', label: 'randomCode.modes.password', icon: 'key' },
  { value: 'code', label: 'randomCode.modes.code', icon: 'upc-scan' },
]

const COUNT_MAX: Record<Mode, number> = { password: 20, code: 100 }

const FIRST: Settings = { mode: 'password', password: DEFAULT_PASSWORD, code: DEFAULT_CODE, count: { password: 1, code: 10 } }

const CLASSES: { key: 'lower' | 'upper' | 'digits' | 'symbols'; label: UtilityKey }[] = [
  { key: 'upper', label: 'randomCode.classes.upper' },
  { key: 'lower', label: 'randomCode.classes.lower' },
  { key: 'digits', label: 'randomCode.classes.digits' },
  { key: 'symbols', label: 'randomCode.classes.symbols' },
]

const STRENGTH: Record<PasswordStrength, { label: UtilityKey; icon: string; tone: string }> = {
  weak: { label: 'randomCode.strengths.weak', icon: 'shield-exclamation', tone: 'danger' },
  fair: { label: 'randomCode.strengths.fair', icon: 'shield', tone: 'warning' },
  strong: { label: 'randomCode.strengths.strong', icon: 'shield-check', tone: 'success' },
  excellent: { label: 'randomCode.strengths.excellent', icon: 'shield-fill-check', tone: 'success' },
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
  const { t } = useTranslation('utility')
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
            <h2 className="erp-flow-options__title">{results.length > 1 ? t('randomCode.resultsCount', { count: results.length }) : t('randomCode.results')}</h2>
            {results.length > 1 ? <CopyButton text={results.join('\n')} label={t('randomCode.copyAll')} size="sm" /> : null}
          </div>

          {noClass ? (
            <p className="erp-flow-field__hint">{t('randomCode.noClass')}</p>
          ) : (
            <ul className="erp-tool-rows" aria-live="polite">
              {results.map((value) => (
                <li key={value} className="erp-tool-row erp-tool-row--code">
                  <code className="erp-tool-row__code">{value}</code>
                  <CopyButton text={value} label={t('randomCode.copyValue', { value })} iconOnly variant="link" />
                </li>
              ))}
            </ul>
          )}

          <Button variant="primary" className="erp-flow__run" disabled={noClass} onClick={() => setResults(generate(settings))}>
            <Icon name="arrow-repeat" className="me-2" />
            {t('randomCode.regenerate')}
          </Button>
        </>
      }
    >
      <ToolSegments label={t('randomCode.modeLabel')} value={mode} options={MODES.map((item) => ({ ...item, label: t(item.label) }))} onChange={(next) => apply({ ...settings, mode: next })} />

      <ToolPanel title={t('randomCode.panelTitle')}>
        <div className="erp-tool-form">
          {mode === 'password' ? (
            <>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-length`}>
                  {t('randomCode.length')}
                  <span className="erp-image-range__value">{t('randomCode.chars', { count: password.length })}</span>
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
                <legend className="erp-flow-field__label">{t('randomCode.classGroups')}</legend>
                <div className="erp-tool-checks">
                  {CLASSES.map((item) => (
                    <Form.Check
                      key={item.key}
                      id={`${ids}-${item.key}`}
                      type="checkbox"
                      label={t(item.label)}
                      checked={password[item.key]}
                      onChange={(event) => setPassword({ [item.key]: event.target.checked })}
                    />
                  ))}
                </div>
              </fieldset>

              <Form.Check
                id={`${ids}-plain`}
                type="checkbox"
                label={t('randomCode.plain')}
                checked={password.plain}
                onChange={(event) => setPassword({ plain: event.target.checked })}
              />

              {noClass ? null : (
                <p className={`erp-code-strength erp-code-strength--${strength.tone}`}>
                  <Icon name={strength.icon} />
                  <span>
                    <Trans ns="utility" i18nKey="randomCode.strength" values={{ label: t(strength.label), bits: Math.round(passwordBits(password)) }} components={{ strong: <strong /> }} />
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <div className="erp-tool-form__grid">
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-prefix`}>
                    {t('randomCode.prefix')}
                  </label>
                  <Form.Control
                    id={`${ids}-prefix`}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={CODE_PREFIX_MAX}
                    placeholder={t('randomCode.prefixPlaceholder')}
                    value={code.prefix}
                    onChange={(event) => setCode({ prefix: event.target.value.slice(0, CODE_PREFIX_MAX) })}
                  />
                </div>
                <div className="erp-flow-field">
                  <label className="erp-flow-field__label" htmlFor={`${ids}-charset`}>
                    {t('randomCode.charset')}
                  </label>
                  <Form.Select id={`${ids}-charset`} value={code.charset} onChange={(event) => setCode({ charset: event.target.value as CodeCharset })}>
                    <option value="alnum">{t('randomCode.alnum')}</option>
                    <option value="digits">{t('randomCode.digitsOnly')}</option>
                  </Form.Select>
                </div>
              </div>

              <div className="erp-flow-field">
                <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-code-length`}>
                  {t('randomCode.codeLength')}
                  <span className="erp-image-range__value">{t('randomCode.chars', { count: code.length })}</span>
                </label>
                <Form.Range id={`${ids}-code-length`} min={CODE_LENGTH.min} max={CODE_LENGTH.max} value={code.length} onChange={(event) => setCode({ length: Number(event.target.value) })} />
              </div>

              {code.charset === 'alnum' ? <p className="erp-flow-field__hint">{t('randomCode.alnumHint')}</p> : null}
            </>
          )}

          <div className="erp-flow-field erp-tool-count">
            <label className="erp-flow-field__label" htmlFor={`${ids}-count`}>
              {t('randomCode.count', { max: COUNT_MAX[mode] })}
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
