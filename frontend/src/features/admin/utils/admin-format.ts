const VIETNAM = 'Asia/Ho_Chi_Minh'
const DATE = new Intl.DateTimeFormat('vi-VN', { timeZone: VIETNAM, day: '2-digit', month: '2-digit', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: VIETNAM, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const NUMBER = new Intl.NumberFormat('vi-VN')

type Moment = string | number | null | undefined

/** Numbers are epoch seconds (backend counters), strings are ISO timestamps. */
function toDate(value: Moment) {
  if (value === null || value === undefined || value === '') return null
  return new Date(typeof value === 'number' ? value * 1000 : value)
}

export function formatDate(value: Moment) { const date = toDate(value); return date ? DATE.format(date) : '—' }
export function formatDateTime(value: Moment) { const date = toDate(value); return date ? DATE_TIME.format(date) : '—' }
export function formatNumber(value: number) { return NUMBER.format(value) }

/** Pro ends at the exclusive midnight after its last day; show the last day itself. */
export function formatProEnd(endsAt: number) { return formatDate(endsAt - 1) }

/** `YYYY-MM-DD` in Vietnam `days` from now; the backend reads `until` as a Vietnam calendar day. */
export function vietnamDatePlus(days: number, now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VIETNAM, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now + days * 86400000))
}

export function shortDay(day: string) { return `${day.slice(8, 10)}/${day.slice(5, 7)}` }
