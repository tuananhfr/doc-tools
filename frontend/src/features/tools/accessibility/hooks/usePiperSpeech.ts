import { useEffect, useRef, useState } from 'react'
import { PiperPlayer, SENTENCE_GAP_SECONDS } from '../services/piper-player'
import { loadPiperSynth, PIPER_SAMPLE_RATE, PiperTtsError, type PiperSynth } from '../services/piper-tts'
import type { PiperErrorCode } from '../types/piper-tts.types'
import type { ReadingHighlight } from '../types/reading.types'
import { splitSpeechText } from '../utils/speech-chunks'
import { normalizeVietnameseText } from '../utils/vi-text-normalize'
import { encodeWav } from '../utils/wav'

export type PiperPhase = 'idle' | 'loading' | 'speaking' | 'paused' | 'exporting'

// Chỉ sinh trước tối đa chừng này giây âm thanh: đủ để không ngắt quãng, không giữ cả bài trong RAM.
const BUFFER_AHEAD_SECONDS = 8
const HIGHLIGHT_POLL_MS = 100

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    const abort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * Giọng Chuyện Nhỏ (Piper, tiếng Việt) chạy trong worker; mỗi lượt đọc/xuất tệp nạp một worker rồi kết thúc nó.
 * `rate` đổi giữa chừng thì phần đã sinh được co giãn ngay, phần chưa sinh dùng tốc độ mới.
 */
export function usePiperSpeech(rate: number) {
  const [phase, setPhase] = useState<PiperPhase>('idle')
  const [download, setDownload] = useState<{ loaded: number; total: number } | null>(null)
  const [exported, setExported] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<PiperErrorCode | null>(null)
  const [highlight, setHighlight] = useState<ReadingHighlight | null>(null)
  const job = useRef<AbortController | null>(null)
  const player = useRef<PiperPlayer | null>(null)
  const rateRef = useRef(rate)

  useEffect(() => () => job.current?.abort(), [])
  useEffect(() => {
    rateRef.current = rate
    player.current?.setRate(rate)
  }, [rate])

  const begin = () => {
    job.current?.abort()
    const controller = new AbortController()
    job.current = controller
    setError(null); setDownload(null); setExported(null); setHighlight(null); setPhase('loading')
    return controller
  }
  const finish = (controller: AbortController, failure?: unknown) => {
    if (job.current !== controller) return
    job.current = null
    setPhase('idle'); setDownload(null); setExported(null); setHighlight(null)
    if (failure && !isAbort(failure)) setError(failure instanceof PiperTtsError ? failure.code : 'PROCESSING_FAILED')
  }
  const open = async (controller: AbortController): Promise<PiperSynth> => {
    const synth = await loadPiperSynth(controller.signal, (loaded, total) => { if (job.current === controller) setDownload({ loaded, total }) })
    setDownload(null)
    return synth
  }

  /** Phải gọi ngay trong thao tác bấm, vì `PiperPlayer` tạo AudioContext. */
  const speak = (text: string) => {
    const chunks = splitSpeechText(text)
    if (!chunks.length) return
    const controller = begin()
    const audio = new PiperPlayer(rateRef.current)
    player.current = audio
    const poll = window.setInterval(() => {
      const range = audio.currentRange()
      setHighlight((previous) => previous?.start === range?.start && previous?.end === range?.end ? previous
        : range && { start: range.start, end: range.end })
    }, HIGHLIGHT_POLL_MS)
    const run = async () => {
      let synth: PiperSynth | undefined
      try {
        synth = await open(controller)
        setPhase('speaking')
        for (const chunk of chunks) {
          while (audio.endsAt - audio.now > BUFFER_AHEAD_SECONDS) await wait(250, controller.signal)
          const speed = rateRef.current
          const pcm = await synth.synthesize(normalizeVietnameseText(chunk.text), 1 / speed)
          if (controller.signal.aborted) return
          if (pcm.length) audio.enqueue(pcm, speed, chunk)
        }
        synth.dispose()
        synth = undefined
        while (audio.now < audio.endsAt) await wait(200, controller.signal)
        finish(controller)
      } catch (failure) {
        finish(controller, failure)
      } finally {
        synth?.dispose()
        window.clearInterval(poll)
        audio.close()
        if (player.current === audio) player.current = null
      }
    }
    void run()
  }

  const exportWav = async (text: string): Promise<Blob | null> => {
    const chunks = splitSpeechText(text)
    if (!chunks.length) return null
    const controller = begin()
    let synth: PiperSynth | undefined
    try {
      synth = await open(controller)
      setPhase('exporting')
      const pcm: Float32Array[] = []
      const gap = new Float32Array(Math.round(PIPER_SAMPLE_RATE * SENTENCE_GAP_SECONDS))
      for (const [index, chunk] of chunks.entries()) {
        setExported({ done: index, total: chunks.length })
        pcm.push(await synth.synthesize(normalizeVietnameseText(chunk.text), 1 / rateRef.current), gap)
      }
      if (controller.signal.aborted) return null
      finish(controller)
      return new Blob([encodeWav(pcm, PIPER_SAMPLE_RATE)], { type: 'audio/wav' })
    } catch (failure) {
      finish(controller, failure)
      return null
    } finally {
      synth?.dispose()
    }
  }

  // Treo đồng hồ AudioContext: âm thanh đã xếp lịch dừng đúng mẫu đang phát, vòng sinh trước cũng tự chờ.
  const pause = () => {
    if (phase !== 'speaking' || !player.current) return
    void player.current.pause()
    setPhase('paused')
  }
  const resume = () => {
    if (phase !== 'paused' || !player.current) return
    void player.current.resume()
    setPhase('speaking')
  }
  const stop = () => {
    const controller = job.current
    controller?.abort()
    if (controller) finish(controller)
  }

  return { phase, download, exported, error, highlight, speak, exportWav, pause, resume, stop }
}
