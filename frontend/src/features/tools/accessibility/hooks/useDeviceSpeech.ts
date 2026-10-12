import { useEffect, useRef, useState } from 'react'
import { speechLanguage } from '@/i18n/intl'
import { splitSpeechText } from '../utils/speech-chunks'

// Chrome nạp danh sách giọng bất đồng bộ; có trình duyệt không bao giờ bắn `voiceschanged` khi máy không có giọng nào.
const VOICE_WAIT_MS = 1500

export type VoiceState = 'loading' | 'ok' | 'missing'

function hasVoiceFor(lang: string): boolean {
  const base = lang.toLowerCase().split('-')[0]
  return window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
}

/** Giọng của máy (Web Speech). Mọi đoạn được xếp hàng ngay trong lượt bấm, vì iOS chỉ cho `speak()` trong thao tác của người dùng. */
export function useDeviceSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [failed, setFailed] = useState(false)
  const [voice, setVoice] = useState<VoiceState>('loading')
  // `cancel()` bắn `end`/`error` của lượt cũ SAU khi lượt mới đã bắt đầu; chỉ lượt mang số hiện tại được đổi trạng thái.
  const run = useRef(0)

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

  const speak = (text: string, rate: number) => {
    if (!supported) return
    const chunks = splitSpeechText(text)
    if (!chunks.length) return
    const current = ++run.current
    const synth = window.speechSynthesis
    synth.cancel()
    setFailed(false)
    setSpeaking(true)
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk)
      utterance.lang = speechLanguage()
      utterance.rate = rate
      if (index === chunks.length - 1) utterance.onend = () => { if (run.current === current) setSpeaking(false) }
      utterance.onerror = (event) => {
        if (run.current !== current || event.error === 'interrupted' || event.error === 'canceled') return
        run.current++
        synth.cancel()
        setSpeaking(false)
        setFailed(true)
      }
      synth.speak(utterance)
    })
  }

  const stop = () => {
    run.current++
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return { supported, speaking, failed, voice, speak, stop }
}
