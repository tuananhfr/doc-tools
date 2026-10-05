import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'

interface SpeechResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface SpeechRecognizer {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer }

export default function DictationPage() {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognizer = useRef<SpeechRecognizer | null>(null)
  const active = useRef(false)
  const supported = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition)

  useEffect(() => () => { active.current = false; recognizer.current?.stop() }, [])

  const toggle = () => {
    if (listening) {
      active.current = false
      recognizer.current?.stop()
      recognizer.current = null
      setListening(false)
      return
    }
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition
    if (!Constructor) return
    try {
      const instance = new Constructor()
      instance.lang = 'vi-VN'
      instance.continuous = true
      instance.interimResults = false
      instance.onresult = (event) => {
        const segments: string[] = []
        for (let index = event.resultIndex; index < event.results.length; index++) if (event.results[index].isFinal) segments.push(event.results[index][0].transcript.trim())
        if (segments.length) setText((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${segments.join(' ')} `)
      }
      instance.onerror = () => { active.current = false; setListening(false); setError('Nhận dạng giọng nói bị gián đoạn. Kiểm tra quyền micro và thử lại.') }
      instance.onend = () => {
        if (active.current) { try { instance.start() } catch { active.current = false; setListening(false) } }
      }
      active.current = true
      recognizer.current = instance
      instance.start()
      setListening(true)
      setError('')
    } catch { active.current = false; setError('Không mở được micro. Kiểm tra quyền truy cập của trình duyệt.') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'ghi-am-thanh-van-ban.txt'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Trạng thái</p>
    <p className="erp-tool-result__value">{listening ? 'Đang nghe' : supported ? 'Sẵn sàng' : 'Chưa hỗ trợ'}</p>
    <p className="erp-tool-result__note">Nhận dạng giọng nói dùng dịch vụ của trình duyệt; âm thanh có thể được gửi tới nhà cung cấp trình duyệt. Văn bản bạn sửa tại đây không được gửi tới máy chủ Chuyện Nhỏ.</p>
    {error ? <p role="alert" className="erp-tool-result__note">{error}</p> : null}
  </div>}>
    <ToolPanel title="Đọc chính tả tiếng Việt">
      <Button disabled={!supported} variant={listening ? 'outline-danger' : 'primary'} onClick={toggle}>{listening ? 'Dừng' : 'Bắt đầu đọc'}</Button>
      <label className="erp-flow-field__label mt-3">Văn bản<Form.Control as="textarea" rows={10} maxLength={100_000} value={text} onChange={(event) => setText(event.target.value)} /></label>
      <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-secondary" disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>Sao chép</Button><Button variant="outline-secondary" disabled={!text} onClick={download}>Tải .txt</Button></div>
    </ToolPanel>
  </ToolBoard>
}
