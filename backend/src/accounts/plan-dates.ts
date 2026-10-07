/** Pro lasts through the whole given day in Vietnam (UTC+7), matching how dates are read in rule packages. */
export function endOfVietnamDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error('Date must be YYYY-MM-DD')
  return Math.floor(Date.parse(`${date}T23:59:59+07:00`) / 1000) + 1
}
