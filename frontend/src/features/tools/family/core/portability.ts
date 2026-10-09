import { isShareable, salvageFamilySpace, type FamilyEvent, type FamilySpace } from './family'

/** `dropped` = số mục hỏng đã bỏ — màn hình phải nói ra, không khôi phục thiếu một cách im lặng. */
export function parseFamilyBackup(text: string): { space: FamilySpace; dropped: number } | null {
  if (text.length > 20_000_000) return null
  try {
    const value = salvageFamilySpace(JSON.parse(text) as unknown)
    return value ? { space: { ...value.space, mode: 'LOCAL_ONLY' }, dropped: value.dropped } : null
  } catch { return null }
}

const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const compactDate = (value: string) => value.replaceAll('-', '')
const compactTime = (value: string) => value.replace(':', '')
const recurrenceRule: Record<FamilyEvent['recurrence'], string> = { once: '', daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
// Việt Nam không có giờ mùa hè: một khối STANDARD +07:00 là đủ. Thiếu VTIMEZONE thì
// Outlook / vài ứng dụng lịch bỏ TZID và hiểu giờ theo UTC — lệch 7 tiếng.
const VIETNAM_TIMEZONE = ['BEGIN:VTIMEZONE', 'TZID:Asia/Ho_Chi_Minh', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0700', 'TZOFFSETTO:+0700', 'TZNAME:+07', 'END:STANDARD', 'END:VTIMEZONE']

/** RFC 5545 §3.1: dòng dài quá 75 octet (UTF-8) phải gập, dòng tiếp bắt đầu bằng một dấu cách; không cắt giữa ký tự. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    const limit = parts.length ? 74 : 75
    if (size + bytes > limit) { parts.push(current); current = ''; size = 0 }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function exportFamilyIcs(space: FamilySpace, includeSensitive = false): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const rows = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chuyen Nho//Family Calendar//VI', 'CALSCALE:GREGORIAN']
  const events = space.events.filter((event) => includeSensitive || isShareable(event))
  if (events.some((event) => event.time)) rows.push(...VIETNAM_TIMEZONE)
  for (const event of events) {
    rows.push('BEGIN:VEVENT', `UID:${event.id.replace(/[^a-zA-Z0-9-]/g, '')}@chuyen-nho.local`, `DTSTAMP:${stamp}`)
    if (event.time) rows.push(`DTSTART;TZID=Asia/Ho_Chi_Minh:${compactDate(event.date)}T${compactTime(event.time)}00`, 'DURATION:PT1H')
    else rows.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`, 'DURATION:P1D')
    rows.push(`SUMMARY:${escapeIcs(event.title)}`)
    if (event.notes) rows.push(`DESCRIPTION:${escapeIcs(event.notes)}`)
    if (event.recurrence !== 'once') rows.push(`RRULE:FREQ=${recurrenceRule[event.recurrence]}`)
    rows.push('END:VEVENT')
  }
  rows.push('END:VCALENDAR')
  return rows.map(foldIcsLine).join('\r\n') + '\r\n'
}
