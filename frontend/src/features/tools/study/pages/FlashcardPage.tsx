import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { readFlashcards, reviewFlashcard, type Flashcard } from '../utils/flashcards'

const STORAGE_KEY = 'chuyen-nho.flashcards.v1'

export default function FlashcardPage() {
  const { t } = useTranslation('study')
  const frontId = useId()
  const backId = useId()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [ready, setReady] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    try { setCards(readFlashcards(localStorage.getItem(STORAGE_KEY))) } catch { setCards([]) }
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)) } catch { /* Storage may be unavailable. */ }
  }, [cards, ready])

  const due = cards.find((card) => card.dueAt <= now)
  const add = () => {
    if (!front.trim() || !back.trim() || cards.length >= 1000) return
    setCards((current) => [...current, { id: crypto.randomUUID(), front: front.trim(), back: back.trim(), box: 0, dueAt: Date.now() }])
    setFront('')
    setBack('')
    setNow(Date.now())
  }
  const grade = (remembered: boolean) => {
    if (!due) return
    const timestamp = Date.now()
    setCards((current) => current.map((card) => card.id === due.id ? reviewFlashcard(card, remembered, timestamp) : card))
    setRevealed(false)
    setNow(timestamp)
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('flashcard.reviewDue', { count: cards.filter((card) => card.dueAt <= now).length })}</p>
    <p className="erp-tool-result__value">{due?.front ?? t('flashcard.noneDue')}</p>
    {due ? <>
      {revealed ? <p className="erp-tool-result__note">{due.back}</p> : <Button variant="outline-secondary" onClick={() => setRevealed(true)}>{t('flashcard.flip')}</Button>}
      {revealed ? <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" onClick={() => grade(false)}>{t('flashcard.forgot')}</Button><Button onClick={() => grade(true)}>{t('flashcard.remembered')}</Button></div> : null}
    </> : <p className="erp-tool-result__note">{t('flashcard.schedule')}</p>}
    <p className="erp-tool-result__note mt-3">{t('flashcard.stored', { count: cards.length })}</p>
  </div>}>
    <ToolPanel title={t('flashcard.title')}>
      <label className="erp-flow-field__label" htmlFor={frontId}>{t('flashcard.front')}
        <Form.Control id={frontId} as="textarea" rows={3} maxLength={500} value={front} onChange={(event) => setFront(event.target.value)} />
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={backId}>{t('flashcard.back')}
        <Form.Control id={backId} as="textarea" rows={3} maxLength={1000} value={back} onChange={(event) => setBack(event.target.value)} />
      </label>
      <Button className="mt-3" disabled={!front.trim() || !back.trim() || cards.length >= 1000} onClick={add}>{t('flashcard.add')}</Button>
      {cards.length ? <ul className="erp-tool-rows mt-3">{cards.map((card) => <li className="erp-tool-row" key={card.id}><span className="erp-tool-row__label">{card.front}</span><Button size="sm" variant="link" onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))}>{t('flashcard.remove')}</Button></li>)}</ul> : null}
    </ToolPanel>
  </ToolBoard>
}
