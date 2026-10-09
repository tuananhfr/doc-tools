export type PomodoroSession = 'focus' | 'break'

export const POMODORO_MAX_MINUTES: Record<PomodoroSession, number> = { focus: 180, break: 60 }

export function isValidMinutes(session: PomodoroSession, minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= POMODORO_MAX_MINUTES[session]
}

export function nextSession(session: PomodoroSession): PomodoroSession {
  return session === 'focus' ? 'break' : 'focus'
}

/** Giây còn lại tới mốc kết thúc, làm tròn lên: còn 0,2 giây vẫn hiện 00:01 chứ không báo hết giờ sớm. */
export function secondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
