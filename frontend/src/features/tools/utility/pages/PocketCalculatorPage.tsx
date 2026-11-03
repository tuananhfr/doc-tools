import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyButton } from '@/features/tools/hub'
import { calculateExpression } from '../utils/pocket-calculator'

const KEYS = ['AC', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '%', '0', '.', '+']

export default function PocketCalculatorPage() {
  const { t, i18n } = useTranslation('utility', { keyPrefix: 'pocketCalculator' })
  const id = useId()
  const [expression, setExpression] = useState('')
  const [previous, setPrevious] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const outcome = calculateExpression(expression)
  const localized = (value: string) => i18n.language === 'vi' ? value.replace('.', ',') : value
  const equals = () => {
    setSubmitted(true)
    if (!outcome.ok) return
    setPrevious(expression)
    setExpression(outcome.value)
  }
  const press = (key: string) => {
    setSubmitted(false)
    setPrevious('')
    if (key === 'AC') { setExpression(''); return }
    if (key === '⌫') { setExpression(value => value.slice(0, -1)); return }
    setExpression(value => {
      const current = previous && /^[\d.(]$/.test(key) ? '' : value
      const next = /^[+×÷]$/.test(key) && /[+×÷−]$/.test(current) ? current.slice(0, -1) + key : current + key
      return next.slice(0, 400)
    })
  }
  return <section className="cn-pocket-calculator" aria-label={t('title')}>
    <div className="cn-pocket-display">
      <label htmlFor={id}>{t('expression')}</label>
      <input id={id} value={expression} inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={400}
        placeholder="125 × (3 + 2)" onChange={event => { setExpression(event.target.value); setPrevious(''); setSubmitted(false) }}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); equals() } if (event.key === 'Escape') press('AC') }} />
      {previous ? <small>{previous} =</small> : null}
      <output aria-label={t('result')} aria-live="polite">{outcome.ok ? localized(outcome.value) : '—'}</output>
      {!outcome.ok && (submitted || outcome.error === 'zero' || outcome.error === 'large') ? <p className="text-danger" role="alert">{t(`errors.${outcome.error}`)}</p> : null}
    </div>
    <div className="cn-pocket-keypad">{KEYS.map(key => <button type="button" key={key} className={['÷', '×', '−', '+'].includes(key) ? 'cn-pocket-operator' : ''}
      aria-label={key === 'AC' ? t('clear') : key === '⌫' ? t('backspace') : key} onClick={() => press(key)}>{key === '.' && i18n.language === 'vi' ? ',' : key}</button>)}</div>
    <div className="cn-pocket-actions"><button type="button" className="cn-button" onClick={equals} aria-label={t('equals')}>=</button>
      {outcome.ok ? <CopyButton text={localized(outcome.value)} label={t('copy')} variant="outline-secondary" /> : null}
    </div>
  </section>
}
