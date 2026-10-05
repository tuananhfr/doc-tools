import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { readFlashcards, reviewFlashcard, type Flashcard } from '../utils/flashcards'

const STORAGE_KEY = 'chuyen-nho.flashcards.v1'

export default function FlashcardPage() {
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
    <p className="erp-tool-result__label">Ôn tập · {cards.filter((card) => card.dueAt <= now).length} thẻ đến hạn</p>
    <p className="erp-tool-result__value">{due?.front ?? 'Chưa có thẻ đến hạn'}</p>
    {due ? <>
      {revealed ? <p className="erp-tool-result__note">{due.back}</p> : <Button variant="outline-secondary" onClick={() => setRevealed(true)}>Lật thẻ</Button>}
      {revealed ? <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" onClick={() => grade(false)}>Chưa nhớ</Button><Button onClick={() => grade(true)}>Đã nhớ</Button></div> : null}
    </> : <p className="erp-tool-result__note">Thẻ đã nhớ sẽ quay lại sau 1, 3, 7, 14 hoặc 30 ngày.</p>}
    <p className="erp-tool-result__note mt-3">{cards.length} thẻ lưu trên thiết bị này. Xóa dữ liệu trình duyệt sẽ xóa các thẻ.</p>
  </div>}>
    <ToolPanel title="Tạo thẻ ghi nhớ">
      <label className="erp-flow-field__label" htmlFor={frontId}>Mặt trước
        <Form.Control id={frontId} as="textarea" rows={3} maxLength={500} value={front} onChange={(event) => setFront(event.target.value)} />
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={backId}>Mặt sau
        <Form.Control id={backId} as="textarea" rows={3} maxLength={1000} value={back} onChange={(event) => setBack(event.target.value)} />
      </label>
      <Button className="mt-3" disabled={!front.trim() || !back.trim() || cards.length >= 1000} onClick={add}>Thêm thẻ</Button>
      {cards.length ? <ul className="erp-tool-rows mt-3">{cards.map((card) => <li className="erp-tool-row" key={card.id}><span className="erp-tool-row__label">{card.front}</span><Button size="sm" variant="link" onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))}>Xóa</Button></li>)}</ul> : null}
    </ToolPanel>
  </ToolBoard>
}
