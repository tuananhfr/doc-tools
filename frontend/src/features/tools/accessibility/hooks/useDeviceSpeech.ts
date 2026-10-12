import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLanguage } from '@/i18n/intl'
import type { ReadingHighlight } from '../types/reading.types'
import { speechChunksFrom, splitSpeechText, type SpeechChunk } from '../utils/speech-chunks'

// Chrome nạp danh sách giọng bất đồng bộ; có trình duyệt không bao giờ bắn `voiceschanged` khi máy không có giọng nào.
const VOICE_WAIT_MS = 1500

export type VoiceState = 'loading' | 'ok' | 'missing'
export type DeviceStatus = 'idle' | 'speaking' | 'paused'

function hasVoiceFor(lang: string): boolean {
  const base = lang.toLowerCase().split('-')[0]
  return window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
}

/** Safari/Firefox có khi báo `charLength` = 0: tự đo từ bắt đầu ở `index`. */
function wordLength(text: string, index: number, reported: number): number {
  if (reported > 0) return reported
  return /^[\p{L}\p{M}\p{N}'’-]+/u.exec(text.slice(index))?.[0].length ?? /^\S+/u.exec(text.slice(index))?.[0].length ?? 0
}

/**
 * Giọng của máy (Web Speech). Mọi đoạn được xếp hàng ngay trong lượt bấm, vì iOS chỉ cho `speak()` trong thao tác của người dùng.
 * Tạm dừng / đổi tốc độ = huỷ rồi đọc lại từ chỗ đang đọc: `pause()`/`resume()` gốc treo hẳn trên Chrome Android
 * và giọng online, còn tốc độ của một lượt đã xếp hàng không đổi được.
 */
export function useDeviceSpeech(rate: number) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [status, setStatus] = useState<DeviceStatus>('idle')
  const [failed, setFailed] = useState(false)
  const [voice, setVoice] = useState<VoiceState>('loading')
  const [highlight, setHighlight] = useState<ReadingHighlight | null>(null)
  // `cancel()` bắn `end`/`error` của lượt cũ SAU khi lượt mới đã bắt đầu; chỉ lượt mang số hiện tại được đổi trạng thái.
  const run = useRef(0)
  const chunks = useRef<SpeechChunk[]>([])
  // Đầu từ vừa được báo, hoặc đầu đoạn khi giọng không báo ranh giới từ (giọng online Google của Chrome).
  const position = useRef(0)
  const rateRef = useRef(rate)
  const statusRef = useRef<DeviceStatus>('idle')

  const changeStatus = useCallback((next: DeviceStatus) => {
    statusRef.current = next
    setStatus(next)
    if (next === 'idle') setHighlight(null)
  }, [])

  useEffect(() => () => {
    run.current++
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const check = (final: boolean) => {
      if (hasVoiceFor(speechLanguage())) setVoice('ok')
      else if (final || synth.getVoices().length) setVoice('missing')
    }
    const onChange = () => check(false)
    check(false)
    const timer = window.setTimeout(() => check(true), VOICE_WAIT_MS)
    synth.addEventListener('voiceschanged', onChange)
    return () => { window.clearTimeout(timer); synth.removeEventListener('voiceschanged', onChange) }
  }, [supported])

  const start = useCallback((offset: number) => {
    const synth = window.speechSynthesis
    const current = ++run.current
    synth.cancel()
    const remaining = speechChunksFrom(chunks.current, offset)
    if (!remaining.length) { changeStatus('idle'); return }
    changeStatus('speaking')
    remaining.forEach(({ chunk, from }, index) => {
      const spoken = chunk.text.slice(from - chunk.start)
      const utterance = new SpeechSynthesisUtterance(spoken)
      utterance.lang = speechLanguage()
      utterance.rate = rateRef.current
      utterance.onstart = () => {
        if (run.current !== current) return
        position.current = from
        setHighlight({ start: chunk.start, end: chunk.end })
      }
      utterance.onboundary = (event) => {
        if (run.current !== current || event.name === 'sentence') return
        const wordStart = from + event.charIndex
        position.current = wordStart
        setHighlight({ start: chunk.start, end: chunk.end, wordStart, wordEnd: wordStart + wordLength(spoken, event.charIndex, event.charLength) })
      }
      if (index === remaining.length - 1) utterance.onend = () => { if (run.current === current) changeStatus('idle') }
      utterance.onerror = (event) => {
        if (run.current !== current || event.error === 'interrupted' || event.error === 'canceled') return
        run.current++
        synth.cancel()
        changeStatus('idle')
        setFailed(true)
      }
      synth.speak(utterance)
    })
  }, [changeStatus])

  // Đổi tốc độ lúc đang đọc thì đọc lại từ từ hiện tại; lúc tạm dừng chỉ ghi nhận, Tiếp tục sẽ dùng tốc độ mới.
  useEffect(() => {
    if (rateRef.current === rate) return
    rateRef.current = rate
    if (statusRef.current === 'speaking') start(position.current)
  }, [rate, start])

  const speak = (text: string) => {
    if (!supported) return
    chunks.current = splitSpeechText(text)
    position.current = 0
    setFailed(false)
    start(0)
  }

  const pause = () => {
    if (statusRef.current !== 'speaking') return
    run.current++
    window.speechSynthesis.cancel()
    changeStatus('paused')
  }

  /** Phải gọi trong thao tác bấm, như `speak`. */
  const resume = () => {
    if (statusRef.current === 'paused') start(position.current)
  }

  const stop = () => {
    run.current++
    if (supported) window.speechSynthesis.cancel()
    changeStatus('idle')
  }

  return { supported, status, failed, voice, highlight, speak, pause, resume, stop }
}
