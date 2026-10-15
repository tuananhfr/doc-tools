import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { WorkspaceGuide } from '@/features/tools/hub'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { NumerologyResult } from '../components/NumerologyResult'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { entResult } from '../services/entertainment.api'
import type { NumerologyResult as Calculation, EntertainmentEnvelope } from '../types/entertainment.types'

function NumerologyWorkspace() {
  const { t } = useTranslation('entertainment')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.numerology' })
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
  const form = <form className="cn-ent-form cn-numerology-form" onSubmit={event => { event.preventDefault(); void calculate() }}><fieldset disabled={busy}><legend><Icon name="pencil-square" /> {t('numerology.configure')}</legend>
    <p className="cn-studio-form-hint">{studio('inputHint')}</p>
    <label htmlFor="ent-birth">{t('numerology.birth')}<input id="ent-birth" type="date" required min="1800-01-01" max={new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)} value={birth} onChange={event => setBirth(event.target.value)} /></label>
    <label htmlFor="ent-name">{t('numerology.name')}<input id="ent-name" maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="off" /></label>
    <label htmlFor="ent-year">{t('numerology.year')}<input id="ent-year" type="number" min={1800} max={2199} required step={1} value={year} onChange={event => setYear(event.target.value)} /></label>
    <p>{t('numerology.method')}</p><label className="cn-ent-check"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t('numerology.consent')}</span></label>
    <button type="submit" className="cn-button" disabled={!consent || !birth || !year}><Icon name={busy ? 'hourglass-split' : 'stars'} /> {t(busy ? 'actions.calculating' : 'numerology.calculate')}</button></fieldset>{error ? <EntertainmentFailure error={error} /> : null}</form>
  return <div className="cn-numerology-workspace">
    <div className="cn-numerology-main">{result ? <NumerologyResult result={result} onReset={reset} /> : form}</div>
    <aside className="cn-numerology-sidebar">
      {!result ? <section className="cn-studio-card cn-numerology-intro">
        <div className="cn-number-orbit" aria-hidden="true"><span>1</span><span>3</span><span>9</span><span><Icon name="stars" /></span></div>
        <h2>{studio('introTitle')}</h2><p>{studio('introHint')}</p>
        <div className="cn-number-features">{(['life_path', 'expression', 'personal_year'] as const).map((metric, index) => <div key={metric}><span className="cn-studio-small-icon"><Icon name={['signpost-split', 'person', 'calendar3'][index]} /></span><span>{t(`numerology.metrics.${metric}`)}</span></div>)}</div>
      </section> : null}
      <WorkspaceGuide steps={[studio('stepFill'), studio('stepCalculate'), studio('stepRead')]} tip={studio('tip')} note={t('disclaimer')} noteTitle={studio('noteTitle')} noteIcon="heart" />
    </aside>
  </div>
}
export default function NumerologyPage() { return <EntertainmentFrame showReference={false}><NumerologyWorkspace /></EntertainmentFrame> }
