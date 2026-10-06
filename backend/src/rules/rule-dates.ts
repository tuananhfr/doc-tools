const VIETNAM_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Today's date in Vietnam (`YYYY-MM-DD`); legal texts take effect at local midnight, not 07:00 UTC+7. */
export function vietnamToday(now = new Date()): string {
  const parts = Object.fromEntries(VIETNAM_DATE.formatToParts(now).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
