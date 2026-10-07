import { useEffect, useState } from 'react'
import { translate } from '@/i18n/runtime'
import { dateOffset, occursOn, type FamilySpace } from '../core/family'

export interface ReminderAlert { key: string; title: string; date: string; time: string; sensitive: boolean }
const SESSION_PREFIX = 'chuyen-nho.family.reminder.'

export function useForegroundReminders(space: FamilySpace | null, viewerId: string) {
  const [alerts, setAlerts] = useState<ReminderAlert[]>([])
  useEffect(() => {
    if (!space) return
    const seen = new Set<string>()
    const scan = () => {
      const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
      const dates = [dateOffset(today, -1), today, dateOffset(today, 1)]
      const events = new Map(space.events.map((event) => [event.id, event]))
      const found: ReminderAlert[] = []
      for (const reminder of space.reminders) {
        if (reminder.recipientMemberIds.length && !reminder.recipientMemberIds.includes(viewerId)) continue
        const event = events.get(reminder.eventId)
        if (!event?.time) continue
        for (const date of dates) {
          if (!occursOn(event, date)) continue
          const trigger = Date.parse(`${date}T${event.time}:00+07:00`) - reminder.minutesBefore * 60000
          const elapsed = Date.now() - trigger
          if (elapsed < 0 || elapsed > 30 * 60000) continue
          const key = `${reminder.id}:${date}`
          if (seen.has(key)) continue
          try { if (sessionStorage.getItem(SESSION_PREFIX + key)) continue; sessionStorage.setItem(SESSION_PREFIX + key, '1') } catch { /* Session storage can be disabled. */ }
          seen.add(key)
          const sensitive = reminder.hideDetails || event.dataClass === 'SENSITIVE'
          found.push({ key, title: sensitive ? translate('family:reminders.sensitiveTitle') : event.title, date, time: event.time, sensitive })
          if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification(sensitive ? translate('family:reminders.notificationTitle') : event.title, { body: sensitive ? translate('family:reminders.notificationBody') : `${date} · ${event.time}` }) } catch { /* In-app alert remains available. */ }
          }
        }
      }
      if (found.length) setAlerts((current) => [...current, ...found].slice(-20))
    }
    scan()
    const interval = setInterval(scan, 30000)
    return () => clearInterval(interval)
  }, [space, viewerId])
  return { alerts, dismiss: (key: string) => setAlerts((current) => current.filter((alert) => alert.key !== key)) }
}
