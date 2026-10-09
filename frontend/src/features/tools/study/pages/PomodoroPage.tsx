import { useEffect, useId, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { notifySessionEnd, playBeep, primeSessionAlerts } from '../services/session-alert'
import { formatClock, isValidMinutes, nextSession, secondsLeft, type PomodoroSession } from '../utils/pomodoro'

export default function PomodoroPage() {
  const { t } = useTranslation('study')
  const focusId = useId()
  const breakId = useId()
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [session, setSession] = useState<PomodoroSession>('focus')
  const [remaining, setRemaining] = useState(25 * 60)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [ended, setEnded] = useState<PomodoroSession | null>(null)
  const baseTitle = useRef<string | null>(null)

  const minutesOf = (target: PomodoroSession) => (target === 'focus' ? focusMinutes : breakMinutes)

  const restoreTitle = () => {
    if (baseTitle.current !== null) document.title = baseTitle.current
    baseTitle.current = null
  }
  // Rời trang mà tiêu đề còn "Hết giờ…" thì trang kế tiếp mang nhầm tiêu đề đó.
  useEffect(() => restoreTitle, [])

  useEffect(() => {
    if (deadline === null) return
    const update = () => {
      const seconds = secondsLeft(deadline, Date.now())
      if (seconds > 0) {
        setRemaining(seconds)
        return
      }
      const next = nextSession(session)
      const nextMinutes = next === 'focus' ? focusMinutes : breakMinutes
      const title = t(session === 'focus' ? 'pomodoro.focusEndedTitle' : 'pomodoro.breakEndedTitle')
      playBeep()
      notifySessionEnd(title, t(next === 'break' ? 'pomodoro.nextBreak' : 'pomodoro.nextFocus', { minutes: nextMinutes }))
      if (baseTitle.current === null) baseTitle.current = document.title
      document.title = title
      setEnded(session)
      setSession(next)
      setRemaining(nextMinutes * 60)
      setDeadline(null)
    }
    update()
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [deadline, session, focusMinutes, breakMinutes, t])

  const reset = (next: PomodoroSession) => {
    restoreTitle()
    setEnded(null)
    setSession(next)
    setRemaining(minutesOf(next) * 60)
    setDeadline(null)
  }
  const start = () => {
    primeSessionAlerts()
    restoreTitle()
    setEnded(null)
    setDeadline(Date.now() + remaining * 1000)
  }
  const pause = () => {
    if (deadline !== null) setRemaining(secondsLeft(deadline, Date.now()))
    setDeadline(null)
  }
  // Đang dừng / chưa chạy: đổi số phút của phiên hiện tại thì đồng hồ theo ngay; đang chạy thì để lượt sau mới áp.
  const changeMinutes = (target: PomodoroSession, minutes: number) => {
    if (target === 'focus') setFocusMinutes(minutes)
    else setBreakMinutes(minutes)
    if (deadline === null && target === session && isValidMinutes(target, minutes)) setRemaining(minutes * 60)
  }
  const valid = isValidMinutes('focus', focusMinutes) && isValidMinutes('break', breakMinutes)

  return <ToolBoard side={<div className="erp-tool-result" role="timer" aria-live="off">
    <p className="erp-tool-result__label">{session === 'focus' ? t('pomodoro.focus') : t('pomodoro.break')}</p>
    <p className="erp-tool-result__value">{formatClock(remaining)}</p>
    {ended ? <p className="erp-tool-result__note" role="status">{t(ended === 'focus' ? 'pomodoro.focusEndedTitle' : 'pomodoro.breakEndedTitle')} · {t('pomodoro.switched')}</p> : null}
    <div className="d-flex flex-wrap gap-2 mt-3">
      {deadline === null ? <Button disabled={!valid || remaining === 0} onClick={start}>{t('pomodoro.start')}</Button> : <Button onClick={pause}>{t('pomodoro.pause')}</Button>}
      <Button variant="outline-secondary" onClick={() => reset(session)}>{t('pomodoro.reset')}</Button>
      <Button variant="outline-secondary" onClick={() => reset(nextSession(session))}>{t('pomodoro.switch')}</Button>
    </div>
    <p className="erp-tool-result__note mt-3">{t('pomodoro.note')}</p>
  </div>}>
    <ToolPanel title={t('pomodoro.title')}>
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={focusId}>{t('pomodoro.focusMinutes')}
          <Form.Control id={focusId} type="number" min="1" max="180" value={focusMinutes} onChange={(event) => changeMinutes('focus', Number(event.target.value))} />
        </label>
        <label className="erp-flow-field__label" htmlFor={breakId}>{t('pomodoro.breakMinutes')}
          <Form.Control id={breakId} type="number" min="1" max="60" value={breakMinutes} onChange={(event) => changeMinutes('break', Number(event.target.value))} />
        </label>
      </div>
      {!valid ? <p className="text-danger mt-2">{t('pomodoro.invalid')}</p> : null}
    </ToolPanel>
  </ToolBoard>
}
