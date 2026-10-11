import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { NumerologyResult } from '../components/NumerologyResult'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { entResult } from '../services/entertainment.api'
import type { NumerologyResult as Calculation, EntertainmentEnvelope } from '../types/entertainment.types'

function NumerologyWorkspace() {
  const { t } = useTranslation('entertainment')
  const [name, setName] = useState(''); const [birth, setBirth] = useState(''); const [year, setYear] = useState(() => String(new Date(Date.now() + 7 * 3600_000).getUTCFullYear()))
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<EntertainmentEnvelope<Calculation> | null>(null); const running = useRef(false)
  const calculate = async () => {
    if (running.current || !consent) return
    running.current = true; setBusy(true); setError(null)
    try { setResult(await entResult<Calculation>('numerology/calculate', { birth_date: birth, name, personal_year: Number(year) })) }
    catch (failure) { setError(failure) }
    finally { running.current = false; setBusy(false) }
  }
  const reset = () => { setResult(null); setError(null); setName(''); setBirth(''); setConsent(false) }
  return result ? <NumerologyResult result={result} onReset={reset} /> : <form className="cn-ent-form" onSubmit={event => { event.preventDefault(); void calculate() }}><fieldset disabled={busy}><legend>{t('numerology.configure')}</legend>
    <label htmlFor="ent-birth">{t('numerology.birth')}<input id="ent-birth" type="date" required min="1800-01-01" max={new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)} value={birth} onChange={event => setBirth(event.target.value)} /></label>
    <label htmlFor="ent-name">{t('numerology.name')}<input id="ent-name" maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="off" /></label>
    <label htmlFor="ent-year">{t('numerology.year')}<input id="ent-year" type="number" min={1800} max={2199} required step={1} value={year} onChange={event => setYear(event.target.value)} /></label>
    <p>{t('numerology.method')}</p><label className="cn-ent-check"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t('numerology.consent')}</span></label>
    <button type="submit" className="cn-button" disabled={!consent || !birth || !year}>{t(busy ? 'actions.calculating' : 'numerology.calculate')}</button></fieldset>{error ? <EntertainmentFailure error={error} /> : null}</form>
}
export default function NumerologyPage() { return <EntertainmentFrame><NumerologyWorkspace /></EntertainmentFrame> }
