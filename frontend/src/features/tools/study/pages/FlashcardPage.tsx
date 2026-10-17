import { DailyStudio } from '@/features/tools/utility/components/DailyStudio'
import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolLeaveGuard, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { readFlashcards, reviewFlashcard, type Flashcard } from '../utils/flashcards'
import { newId } from '@/utils/id'

const STORAGE_KEY = 'chuyen-nho.flashcards.v1'

export default function FlashcardPage() {
  const { t } = useTranslation('study')
  const { t: common } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.flashcard' })
  const frontId = useId()
  const backId = useId()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const restore = () => {
    try {
      setCards(readFlashcards(localStorage.getItem(STORAGE_KEY)))
      setLoadFailed(false)
      setSaveFailed(false)
    } catch { setLoadFailed(true) }
    setReady(true)
  }
  useEffect(restore, [])

  // Commit before changing the visible deck or clearing the input. A failed write must
  // leave both the previous stored deck and the person's new text intact.
  const persist = (next: Flashcard[]) => {
    if (!ready || loadFailed) return false
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }
    catch { setSaveFailed(true); return false }
    setCards(next)
    setSaveFailed(false)
    return true
  }

  const due = cards.find((card) => card.dueAt <= now)
  const add = () => {
    if (!front.trim() || !back.trim() || cards.length >= 1000) return
    const timestamp = Date.now()
    const card: Flashcard = { id: newId(), front: front.trim(), back: back.trim(), box: 0, dueAt: timestamp }
    if (!persist([...cards, card])) return
    setFront('')
    setBack('')
    setNow(timestamp)
  }
  const remove = (card: Flashcard) => {
    // Xoá là mất hẳn (thẻ chỉ nằm trong localStorage, không có thùng rác) — hỏi lại trước.
    const front = card.front.length > 80 ? `${card.front.slice(0, 80)}…` : card.front
    if (!window.confirm(t('flashcard.confirmRemove', { front }))) return
    persist(cards.filter((item) => item.id !== card.id))
  }
  const grade = (remembered: boolean) => {
    if (!due) return
    const timestamp = Date.now()
    if (!persist(cards.map((card) => card.id === due.id ? reviewFlashcard(card, remembered, timestamp) : card))) return
    setRevealed(false)
    setNow(timestamp)
  }

  return <DailyStudio kind="flashcards"><ToolBoard className="cn-flashcard-workspace" layout="balanced" side={<div className="erp-tool-result cn-flashcard-review" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="arrow-repeat" /></span><div><h2>2. {studio('reviewTitle')}</h2><p>{t('flashcard.reviewDue', { count: cards.filter((card) => card.dueAt <= now).length })}</p></div></div>
    <div className="cn-flashcard-paper" data-revealed={revealed && Boolean(due)}><Icon name={due ? 'card-heading' : 'check2-circle'} /><p className="erp-tool-result__value">{due?.front ?? t('flashcard.noneDue')}</p>
    {due ? <>
      {revealed ? <p className="erp-tool-result__note">{due.back}</p> : <Button variant="outline-secondary" onClick={() => setRevealed(true)}>{t('flashcard.flip')}</Button>}
      {revealed ? <div className="cn-flashcard-grades d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" onClick={() => grade(false)}>{t('flashcard.forgot')}</Button><Button onClick={() => grade(true)}>{t('flashcard.remembered')}</Button></div> : null}
    </> : <p className="erp-tool-result__note">{t('flashcard.schedule')}</p>}
    </div>{ready && !loadFailed ? <p className="cn-flashcard-stored"><Icon name="device-hdd" />{t('flashcard.stored', { count: cards.length })}</p> : null}
  </div>}>
    <ToolPanel title={`1. ${t('flashcard.title')}`} actions={<span className="cn-studio-small-icon"><Icon name="plus-square" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      {loadFailed ? <div role="alert"><p>{t('flashcard.loadFailed')}</p><Button variant="outline-primary" onClick={restore}>{t('flashcard.retryStorage')}</Button></div> : null}
      {saveFailed ? <p className="erp-tool-form__error" role="alert">{t('flashcard.saveFailed')}</p> : null}
      <label className="erp-flow-field__label" htmlFor={frontId}>{t('flashcard.front')}</label>
      <Form.Control id={frontId} as="textarea" rows={3} maxLength={500} value={front} onChange={(event) => setFront(event.target.value)} />
      <label className="erp-flow-field__label mt-3" htmlFor={backId}>{t('flashcard.back')}</label>
      <Form.Control id={backId} as="textarea" rows={3} maxLength={1000} value={back} onChange={(event) => setBack(event.target.value)} />
      <Button className="mt-3 cn-flashcard-add" disabled={!ready || loadFailed || !front.trim() || !back.trim() || cards.length >= 1000} onClick={add}><Icon name="plus-lg" className="me-2" />{t('flashcard.add')}</Button>
      {cards.length ? <ul className="erp-tool-rows mt-3">{cards.map((card) => <li className="erp-tool-row erp-tool-row--item" key={card.id}><span className="erp-tool-row__value">{card.front}</span><Button size="sm" variant="link" className="erp-tool-copy" aria-label={t('flashcard.removeAria', { front: card.front.slice(0, 80) })} onClick={() => remove(card)}>{t('flashcard.remove')}</Button></li>)}</ul> : null}
    </ToolPanel>
  </ToolBoard><ToolLeaveGuard active={front !== '' || back !== ''} message={common('workspace.unsaved')} /></DailyStudio>
}
