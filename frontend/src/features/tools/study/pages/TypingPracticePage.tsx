import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ENGLISH_TYPING_LESSONS, KEYBOARD_ROWS, randomTypingLesson, readTypingProgress, TYPING_LESSONS, TYPING_STORAGE_KEY, typingCharacters, typingEdits, typingFinger, typingMetrics, type TypingLevel, type TypingProgress } from '../utils/typing'

const LESSON_LABELS = {
  basic: ['basicLesson1', 'basicLesson2', 'basicLesson3'],
  advanced: ['advancedLesson1', 'advancedLesson2', 'advancedLesson3'],
} as const
const FINGER_LABELS = ['fingers.0', 'fingers.1', 'fingers.2', 'fingers.3', 'fingers.4', 'fingers.5', 'fingers.6', 'fingers.7', 'fingers.8'] as const

export default function TypingPracticePage() {
  const { t, i18n } = useTranslation('study', { keyPrefix: 'typing' })
  const inputId = useId(), lessonId = useId()
  const [level, setLevel] = useState<TypingLevel>('basic')
  const [lesson, setLesson] = useState(0)
  const [exercise, setExercise] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [now, setNow] = useState(0)
  const [started, setStarted] = useState<number | null>(null)
  const [finished, setFinished] = useState<number | null>(null)
  const [attempts, setAttempts] = useState({ total: 0, correct: 0 })
  const [history, setHistory] = useState<TypingProgress[]>([])
  const [storageFailed, setStorageFailed] = useState(false)
  const committed = useRef(''), composing = useRef(false), recorded = useRef(false)
  const attemptCounter = useRef({ total: 0, correct: 0 })
  const startClock = useRef<number | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const completion = useRef<HTMLDivElement>(null)
  const lessons = level === 'advanced' && i18n.language !== 'vi' ? ENGLISH_TYPING_LESSONS : TYPING_LESSONS[level]
  const target = exercise ?? lessons[lesson]
  const elapsed = started === null ? 0 : Math.max(0, (finished ?? now) - started)
  const scoredText = composing.current ? committed.current : typed
  const metrics = typingMetrics(scoredText, target, elapsed, attempts.total, attempts.correct)
  const actual = typingCharacters(scoredText), expected = typingCharacters(target)
  const next = expected[actual.length] ?? ''
  const finger = typingFinger(next)

  useEffect(() => {
    try { setHistory(readTypingProgress(localStorage.getItem(TYPING_STORAGE_KEY))) }
    catch { setStorageFailed(true) }
  }, [])
  useEffect(() => {
    if (started === null || finished !== null) return
    const timer = window.setInterval(() => setNow(performance.now()), 250)
    return () => window.clearInterval(timer)
  }, [started, finished])
  useEffect(() => {
    if (finished === null) return
    completion.current?.focus({ preventScroll: true })
    completion.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [finished])

  const reset = () => {
    committed.current = ''; recorded.current = false; composing.current = false
    startClock.current = null
    attemptCounter.current = { total: 0, correct: 0 }
    setTyped(''); setStarted(null); setFinished(null); setNow(0); setAttempts({ total: 0, correct: 0 })
  }
  useEffect(() => {
    reset()
    setExercise(previous => randomTypingLesson(level, lesson, i18n.language, previous ?? ''))
  }, [i18n.language, level, lesson])

  const update = (value: string) => {
    const normalized = value.normalize('NFC')
    setTyped(value)
    if (finished !== null) return
    const timestamp = performance.now()
    if (normalized && startClock.current === null) { startClock.current = timestamp; setStarted(timestamp) }
    const start = startClock.current ?? timestamp
    setNow(timestamp)
    if (composing.current) return
    const edit = typingEdits(committed.current, normalized, target)
    const nextAttempts = { total: attemptCounter.current.total + edit.attempts, correct: attemptCounter.current.correct + edit.correct }
    attemptCounter.current = nextAttempts
    committed.current = normalized
    setAttempts(nextAttempts)
    if (normalized === target.normalize('NFC') && !recorded.current) {
      recorded.current = true
      setFinished(timestamp)
      const score = typingMetrics(normalized, target, timestamp - start, nextAttempts.total, nextAttempts.correct)
      const record: TypingProgress = { level, wpm: score.wpm, accuracy: score.accuracy, at: Date.now() }
      // Read again before saving so another tab's completed lesson is preserved.
      try {
        const updated = [...readTypingProgress(localStorage.getItem(TYPING_STORAGE_KEY)), record].slice(-20)
        localStorage.setItem(TYPING_STORAGE_KEY, JSON.stringify(updated))
        setHistory(updated); setStorageFailed(false)
      } catch { setHistory(current => [...current, record].slice(-20)); setStorageFailed(true) }
    }
  }
  return <div className="cn-typing-practice">
    <section className="cn-typing-main">
      <div className="cn-typing-toolbar">
        <div className="cn-typing-levels" role="group" aria-label={t('level')}>{(['basic', 'advanced'] as const).map(value => <button type="button" key={value} aria-pressed={level === value} onClick={() => {
          if (level === value && lesson === 0) {
            reset(); setExercise(randomTypingLesson(value, 0, i18n.language, target))
          } else { setLevel(value); setLesson(0) }
        }}>{t(value)}</button>)}</div>
        <label htmlFor={lessonId}>{t('lesson')}<select id={lessonId} value={lesson} onChange={event => setLesson(Number(event.target.value))}>{lessons.map((_, index) => <option key={index} value={index}>{t(LESSON_LABELS[level][index])}</option>)}</select></label>
      </div>
      {finished !== null ? <div ref={completion} tabIndex={-1} className="cn-typing-completion" role="status">
        <h2>✓ {t('completed')}</h2>
        <dl className="cn-typing-metrics"><div><dt>{t('time')}</dt><dd>{new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(elapsed / 1000)} <small>{t('seconds')}</small></dd></div><div><dt>{t('speed')}</dt><dd>{metrics.wpm} <small>WPM</small></dd></div><div><dt>{t('accuracy')}</dt><dd>{metrics.accuracy}%</dd></div></dl>
        <div className="cn-typing-completion-actions"><button type="button" className="cn-button" onClick={() => { reset(); field.current?.focus() }}>{t('restart')}</button></div>
      </div> : <dl className="cn-typing-metrics"><div><dt>{t('speed')}</dt><dd>{metrics.wpm} <small>WPM</small></dd></div><div><dt>{t('accuracy')}</dt><dd>{metrics.accuracy}%</dd></div><div><dt>{t('time')}</dt><dd>{Math.floor(elapsed / 1000)} <small>{t('seconds')}</small></dd></div></dl>}
      <div className="cn-typing-target" aria-label={t('sample')}>{expected.map((char, index) => <span key={index} className={index < actual.length ? actual[index] === char ? 'is-correct' : 'is-wrong' : index === actual.length ? 'is-next' : undefined}>{char}</span>)}</div>
      <label className="cn-typing-input-label" htmlFor={inputId}>{t('input')}</label>
      <textarea id={inputId} ref={field} value={typed} readOnly={finished !== null} rows={3} maxLength={target.length + 40} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
        onCompositionStart={() => { composing.current = true }} onCompositionEnd={event => { composing.current = false; update(event.currentTarget.value) }}
        onChange={event => update(event.target.value)} />
      {finished === null ? <div className="cn-typing-footer"><span role="status">{t('progress', { percent: metrics.progress })}</span><button type="button" className="btn btn-outline-secondary" onClick={() => { reset(); field.current?.focus() }}>{t('restart')}</button></div> : null}
      <details className="cn-typing-guide" open={level === 'basic' ? true : undefined}><summary>{t('fingerGuide')}</summary>
        <p>{t('homeHint')}</p>
        <div className="cn-typing-keyboard" aria-hidden="true">{KEYBOARD_ROWS.map(row => <div key={row}>{Array.from(row).map(key => <span key={key} data-finger={typingFinger(key)} className={next.toLowerCase() === key ? 'is-active' : undefined}>{key.toUpperCase()}</span>)}</div>)}<div><span className={`cn-typing-space${next === ' ' ? ' is-active' : ''}`}>{t('space')}</span></div></div>
        <p className="cn-typing-finger" role="status">{finger === null ? t('keepTyping') : t('nextFinger', { finger: t(FINGER_LABELS[finger]), key: next === ' ' ? t('space') : next })}</p>
      </details>
    </section>
    <aside className="cn-typing-progress"><h2>{t('yourProgress')}</h2>
      <dl><div><dt>{t('sessions')}</dt><dd>{history.length}</dd></div><div><dt>{t('bestSpeed')}</dt><dd>{Math.max(0, ...history.map(item => item.wpm))} WPM</dd></div></dl>
      {history.length ? <ol>{history.slice(-5).reverse().map((item, index) => <li key={`${item.at}-${index}`}><span>{t(item.level)}<small>{new Date(item.at).toLocaleDateString(i18n.language)}</small></span><strong>{item.wpm} WPM<small>{item.accuracy}%</small></strong></li>)}</ol> : <p>{t('noProgress')}</p>}
      {storageFailed ? <p role="status">{t('storageFailed')}</p> : null}
    </aside>
  </div>
}
