import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
}

/** Password field with a show/hide toggle; long passphrases are hard to type blind on a phone. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { id, value, onChange, autoComplete, invalid, describedBy, autoFocus }, ref,
) {
  const { t } = useTranslation('account')
  const [visible, setVisible] = useState(false)
  return (
    <div className="cn-password">
      <input
        ref={ref}
        id={id}
        className="form-control cn-input"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="cn-password__toggle"
        aria-controls={id}
        aria-pressed={visible}
        aria-label={visible ? t('password.hide') : t('password.show')}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon name={visible ? 'eye-slash' : 'eye'} />
      </button>
    </div>
  )
})
