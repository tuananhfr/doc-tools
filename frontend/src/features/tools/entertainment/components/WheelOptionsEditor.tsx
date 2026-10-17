import { useId } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolPanel } from '@/features/tools/hub'
import { WHEEL_LIMITS, type ParsedOptions } from '../utils/spin-wheel'

interface WheelOptionsEditorProps {
  text: string
  parsed: ParsedOptions
  disabled: boolean
  onChange: (text: string) => void
}

export function WheelOptionsEditor({ text, parsed, disabled, onChange }: WheelOptionsEditorProps) {
  const { t } = useTranslation('entertainment')
  const inputId = useId()
  const helpId = useId()
  const tooFew = parsed.options.length < WHEEL_LIMITS.minOptions

  return <ToolPanel title={`1. ${t('wheel.optionsTitle')}`}>
    <label className="erp-flow-field__label" htmlFor={inputId}>{t('wheel.optionsLabel')}</label>
    <Form.Control id={inputId} as="textarea" rows={7} className="cn-wheel-options" value={text} disabled={disabled}
      aria-describedby={helpId} onChange={(event) => onChange(event.target.value)} />
    <div id={helpId} className="cn-wheel-help">
      <p>{t('wheel.optionsCount', { total: parsed.options.length, max: WHEEL_LIMITS.maxOptions })}</p>
      <p>{t('wheel.optionsHelp', { min: WHEEL_LIMITS.minOptions, max: WHEEL_LIMITS.maxOptions, length: WHEEL_LIMITS.maxLength })}</p>
      {tooFew ? <p className="cn-wheel-warning">{t('wheel.needOptions', { min: WHEEL_LIMITS.minOptions })}</p> : null}
      {parsed.overLimit ? <p className="cn-wheel-warning">{t('wheel.overLimit', { max: WHEEL_LIMITS.maxOptions })}</p> : null}
      {parsed.clipped ? <p className="cn-wheel-warning">{t('wheel.clipped', { length: WHEEL_LIMITS.maxLength })}</p> : null}
    </div>
  </ToolPanel>
}
