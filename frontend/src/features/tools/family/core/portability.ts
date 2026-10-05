import { validateFamilySpace, type FamilyEvent, type FamilySpace } from './family'

export function parseFamilyBackup(text: string): FamilySpace | null {
  if (text.length > 20_000_000) return null
  try {
    const value = validateFamilySpace(JSON.parse(text) as unknown)
    return value ? { ...value, mode: 'LOCAL_ONLY' } : null
  } catch { return null }
}

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const compactDate = (value: string) => value.replaceAll('-', '')
const compactTime = (value: string) => value.replace(':', '')
const recurrenceRule: Record<FamilyEvent['recurrence'], string> = { once: '', daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }

export function exportFamilyIcs(space: FamilySpace, includeSensitive = false): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const rows = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chuyen Nho//Family Calendar//VI', 'CALSCALE:GREGORIAN']
  for (const event of space.events) {
    if (!includeSensitive && (event.dataClass === 'SENSITIVE' || event.scope === 'PRIVATE')) continue
    rows.push('BEGIN:VEVENT', `UID:${event.id.replace(/[^a-zA-Z0-9-]/g, '')}@chuyen-nho.local`, `DTSTAMP:${stamp}`)
    if (event.time) rows.push(`DTSTART;TZID=Asia/Ho_Chi_Minh:${compactDate(event.date)}T${compactTime(event.time)}00`, 'DURATION:PT1H')
    else rows.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`, 'DURATION:P1D')
    rows.push(`SUMMARY:${escapeIcs(event.title)}`)
    if (event.notes) rows.push(`DESCRIPTION:${escapeIcs(event.notes)}`)
    if (event.recurrence !== 'once') rows.push(`RRULE:FREQ=${recurrenceRule[event.recurrence]}`)
    rows.push('END:VEVENT')
  }
  rows.push('END:VCALENDAR')
  return rows.join('\r\n') + '\r\n'
}
