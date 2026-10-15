import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { readFlashcards, reviewFlashcard, type Flashcard } from '../utils/flashcards'
import { newId } from '@/utils/id'

const STORAGE_KEY = 'chuyen-nho.flashcards.v1'

export default function FlashcardPage() {
  const { t } = useTranslation('study')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.flashcard' })
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
    setCards((current) => [...current, { id: newId(), front: front.trim(), back: back.trim(), box: 0, dueAt: Date.now() }])
    setFront('')
    setBack('')
    setNow(Date.now())
  }
  const remove = (card: Flashcard) => {
    // Xoá là mất hẳn (thẻ chỉ nằm trong localStorage, không có thùng rác) — hỏi lại trước.
    const front = card.front.length > 80 ? `${card.front.slice(0, 80)}…` : card.front
    if (!window.confirm(t('flashcard.confirmRemove', { front }))) return
    setCards((current) => current.filter((item) => item.id !== card.id))
  }
  const grade = (remembered: boolean) => {
    if (!due) return
    const timestamp = Date.now()
    setCards((current) => current.map((card) => card.id === due.id ? reviewFlashcard(card, remembered, timestamp) : card))
    setRevealed(false)
    setNow(timestamp)
  }

  return <ToolBoard className="cn-flashcard-workspace" layout="balanced" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>} side={<div className="erp-tool-result cn-flashcard-review" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="arrow-repeat" /></span><div><h2>{studio('reviewTitle')}</h2><p>{t('flashcard.reviewDue', { count: cards.filter((card) => card.dueAt <= now).length })}</p></div></div>
    <div className="cn-flashcard-paper" data-revealed={revealed && Boolean(due)}><Icon name={due ? 'card-heading' : 'check2-circle'} /><p className="erp-tool-result__value">{due?.front ?? t('flashcard.noneDue')}</p>
    {due ? <>
      {revealed ? <p className="erp-tool-result__note">{due.back}</p> : <Button variant="outline-secondary" onClick={() => setRevealed(true)}>{t('flashcard.flip')}</Button>}
      {revealed ? <div className="cn-flashcard-grades d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" onClick={() => grade(false)}>{t('flashcard.forgot')}</Button><Button onClick={() => grade(true)}>{t('flashcard.remembered')}</Button></div> : null}
    </> : <p className="erp-tool-result__note">{t('flashcard.schedule')}</p>}
    </div><p className="cn-flashcard-stored"><Icon name="device-hdd" />{t('flashcard.stored', { count: cards.length })}</p>
  </div>}>
    <ToolPanel title={t('flashcard.title')} actions={<span className="cn-studio-small-icon"><Icon name="plus-square" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      <label className="erp-flow-field__label" htmlFor={frontId}>{t('flashcard.front')}
        <Form.Control id={frontId} as="textarea" rows={3} maxLength={500} value={front} onChange={(event) => setFront(event.target.value)} />
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={backId}>{t('flashcard.back')}
        <Form.Control id={backId} as="textarea" rows={3} maxLength={1000} value={back} onChange={(event) => setBack(event.target.value)} />
      </label>
      <Button className="mt-3 cn-flashcard-add" disabled={!front.trim() || !back.trim() || cards.length >= 1000} onClick={add}><Icon name="plus-lg" className="me-2" />{t('flashcard.add')}</Button>
      {cards.length ? <ul className="erp-tool-rows mt-3">{cards.map((card) => <li className="erp-tool-row erp-tool-row--item" key={card.id}><span className="erp-tool-row__value">{card.front}</span><Button size="sm" variant="link" className="erp-tool-copy" aria-label={t('flashcard.removeAria', { front: card.front.slice(0, 80) })} onClick={() => remove(card)}>{t('flashcard.remove')}</Button></li>)}</ul> : null}
    </ToolPanel>
  </ToolBoard>
}
