import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'

export default function ReadAloudPage() {
  const textId = useId()
  const [text, setText] = useState('')
  const [rate, setRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  const speak = () => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 20000))
    utterance.lang = 'vi-VN'
    utterance.rate = rate
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }
  const stop = () => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">Đọc trên thiết bị</p>
    <p className="erp-tool-result__value">{speaking ? 'Đang đọc' : 'Sẵn sàng'}</p>
    <div className="d-flex flex-wrap gap-2 mt-3"><Button disabled={!supported || !text.trim()} onClick={speak}>Đọc văn bản</Button><Button variant="outline-secondary" disabled={!speaking} onClick={stop}>Dừng</Button></div>
    <p className="erp-tool-result__note mt-3">{supported ? 'Giọng đọc phụ thuộc giọng tiếng Việt đã cài trên thiết bị và trình duyệt.' : 'Trình duyệt này không hỗ trợ đọc văn bản.'}</p>
  </div>}>
    <ToolPanel title="Văn bản cần đọc">
      <label className="erp-flow-field__label" htmlFor={textId}>Nội dung</label>
      <Form.Control id={textId} as="textarea" rows={12} maxLength={20000} value={text} onChange={(event) => setText(event.target.value)} />
      <label className="erp-flow-field__label mt-3">Tốc độ: {rate.toFixed(1)}×
        <Form.Range min={0.5} max={2} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} />
      </label>
    </ToolPanel>
  </ToolBoard>
}
