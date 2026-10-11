import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseYmd } from '@/features/tools/vietnam/utils/calendar-format'
import { solarToLunar, type LunarDate } from '@/features/tools/vietnam/utils/lunar-calendar'
import { useSandbox } from '../hooks/useSandbox'
import { entResult } from '../services/entertainment.api'
import { EntertainmentFailure } from './EntertainmentFailure'
import { ReportActions } from './ReportActions'

export function CalendarSources({ date }: { date: string }) {
  const { t, i18n } = useTranslation('entertainment')
  const sandbox = useSandbox()
  const lunar = solarToLunar(parseYmd(date))
  const [comparison, setComparison] = useState<{ date: string; same: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { setComparison(null); setError(null) }, [date])
  const compare = async () => {
    if (busy || !lunar) return
    setBusy(true); setError(null)
    try {
      const reply = await entResult<{ lunar: LunarDate }>(`almanac/day?date=${encodeURIComponent(date)}`, undefined)
      const value = reply.result.lunar
      setComparison({ date, same: ['day', 'month', 'year', 'leap'].every(key => value[key as keyof LunarDate] === lunar[key as keyof LunarDate]) })
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }
  const lines = [
    `${t('calendar.solar')}: ${date}`,
    ...(lunar ? [`${t('calendar.lunar')}: ${lunar.day}/${lunar.month}/${lunar.year}${lunar.leap ? ` (${t('calendar.leap')})` : ''}`] : []),
    t('calendar.method'), t('calendar.version'), t('calendar.source'), t('calendar.pending'),
  ]
  return <section className="cn-ent-calendar" lang={i18n.language === 'vi' ? 'vi' : 'en'} dir="ltr" aria-labelledby="calendar-source-title">
    <h2 id="calendar-source-title">{t('calendar.title')}</h2>
    <p>{t('calendar.method')}</p><p>{t('calendar.version')}</p><p>{t('calendar.source')}</p>
    <p className="cn-ent-no-meaning">{t('calendar.pending')}</p>
    {sandbox.state === 'enabled' ? <button className="cn-button cn-button--ghost" disabled={busy || !lunar} onClick={() => void compare()}>{t(busy ? 'gate.loading' : 'calendar.check')}</button> : null}
    {comparison?.date === date ? <p role="status">{t(comparison.same ? 'calendar.checked' : 'calendar.mismatch')}</p> : null}
    {error ? <EntertainmentFailure error={error} /> : null}
    <p>{t('disclaimer')}</p><ReportActions title={t('calendar.title')} lines={lines} disabled={!lunar} />
  </section>
}
