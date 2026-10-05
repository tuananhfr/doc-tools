import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'

type Session = 'focus' | 'break'

export default function PomodoroPage() {
  const focusId = useId()
  const breakId = useId()
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [session, setSession] = useState<Session>('focus')
  const [remaining, setRemaining] = useState(25 * 60)
  const [deadline, setDeadline] = useState<number | null>(null)

  useEffect(() => {
    if (deadline === null) return
    const update = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0) setDeadline(null)
    }
    update()
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [deadline])

  const reset = (next: Session, minutes: number) => {
    setSession(next)
    setRemaining(minutes * 60)
    setDeadline(null)
  }
  const start = () => setDeadline(Date.now() + remaining * 1000)
  const pause = () => {
    if (deadline !== null) setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    setDeadline(null)
  }
  const valid = Number.isInteger(focusMinutes) && focusMinutes >= 1 && focusMinutes <= 180 && Number.isInteger(breakMinutes) && breakMinutes >= 1 && breakMinutes <= 60
  const display = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  return <ToolBoard side={<div className="erp-tool-result" role="timer" aria-live={remaining === 0 ? 'assertive' : 'off'}>
    <p className="erp-tool-result__label">{session === 'focus' ? 'Tập trung' : 'Nghỉ'}</p>
    <p className="erp-tool-result__value">{display}</p>
    <div className="d-flex flex-wrap gap-2 mt-3">
      {deadline === null ? <Button disabled={!valid || remaining === 0} onClick={start}>Bắt đầu</Button> : <Button onClick={pause}>Tạm dừng</Button>}
      <Button variant="outline-secondary" onClick={() => reset(session, session === 'focus' ? focusMinutes : breakMinutes)}>Đặt lại</Button>
      <Button variant="outline-secondary" onClick={() => reset(session === 'focus' ? 'break' : 'focus', session === 'focus' ? breakMinutes : focusMinutes)}>Chuyển phiên</Button>
    </div>
    <p className="erp-tool-result__note mt-3">Bộ hẹn giờ chỉ chạy khi trang còn mở. Khi về 00:00, chọn chuyển phiên để bắt đầu lượt tiếp theo.</p>
  </div>}>
    <ToolPanel title="Thời lượng">
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={focusId}>Tập trung (phút)
          <Form.Control id={focusId} type="number" min="1" max="180" value={focusMinutes} onChange={(event) => setFocusMinutes(Number(event.target.value))} />
        </label>
        <label className="erp-flow-field__label" htmlFor={breakId}>Nghỉ (phút)
          <Form.Control id={breakId} type="number" min="1" max="60" value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))} />
        </label>
      </div>
      {!valid ? <p className="text-danger mt-2">Tập trung 1–180 phút; nghỉ 1–60 phút.</p> : null}
    </ToolPanel>
  </ToolBoard>
}
