import { useEffect, useRef, useState } from 'react'
import { loadPiperSynth, PIPER_SAMPLE_RATE, PiperTtsError, type PiperSynth } from '../services/piper-tts'
import type { PiperErrorCode } from '../types/piper-tts.types'
import { splitSpeechText } from '../utils/speech-chunks'
import { normalizeVietnameseText } from '../utils/vi-text-normalize'
import { encodeWav } from '../utils/wav'

export type PiperPhase = 'idle' | 'loading' | 'speaking' | 'exporting'

// Chỉ sinh trước tối đa chừng này giây âm thanh: đủ để không ngắt quãng, không giữ cả bài trong RAM.
const BUFFER_AHEAD_SECONDS = 8
const SENTENCE_GAP_SECONDS = 0.12

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    const abort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** Giọng Chuyện Nhỏ (Piper, tiếng Việt) chạy trong worker; mỗi lượt đọc/xuất tệp nạp một worker rồi kết thúc nó. */
export function usePiperSpeech() {
  const [phase, setPhase] = useState<PiperPhase>('idle')
  const [download, setDownload] = useState<{ loaded: number; total: number } | null>(null)
  const [exported, setExported] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<PiperErrorCode | null>(null)
  const job = useRef<AbortController | null>(null)
  const rate = useRef(1)

  useEffect(() => () => job.current?.abort(), [])

  const begin = () => {
    job.current?.abort()
    const controller = new AbortController()
    job.current = controller
    setError(null); setDownload(null); setExported(null); setPhase('loading')
    return controller
  }
  const finish = (controller: AbortController, failure?: unknown) => {
    if (job.current !== controller) return
    job.current = null
    setPhase('idle'); setDownload(null); setExported(null)
    if (failure && !isAbort(failure)) setError(failure instanceof PiperTtsError ? failure.code : 'PROCESSING_FAILED')
  }
  const open = async (controller: AbortController): Promise<PiperSynth> => {
    const synth = await loadPiperSynth(controller.signal, (loaded, total) => { if (job.current === controller) setDownload({ loaded, total }) })
    setDownload(null)
    return synth
  }

  /** Phải gọi ngay trong thao tác bấm: Safari chỉ mở tiếng cho AudioContext tạo trong thao tác của người dùng. */
  const speak = (text: string, speed: number) => {
    const chunks = splitSpeechText(normalizeVietnameseText(text))
    if (!chunks.length) return
    rate.current = speed
    const controller = begin()
    const context = new AudioContext()
    void context.resume()
    const run = async () => {
      let synth: PiperSynth | undefined
      try {
        synth = await open(controller)
        setPhase('speaking')
        let endsAt = context.currentTime
        for (const chunk of chunks) {
          while (endsAt - context.currentTime > BUFFER_AHEAD_SECONDS) await wait(250, controller.signal)
          // Tốc độ đọc tại thời điểm sinh đoạn: kéo thanh trượt giữa chừng thì các đoạn sau đổi theo.
          const pcm = await synth.synthesize(chunk, 1 / rate.current)
          if (controller.signal.aborted) return
          if (!pcm.length) continue
          const buffer = context.createBuffer(1, pcm.length, PIPER_SAMPLE_RATE)
          buffer.copyToChannel(pcm, 0)
          const source = context.createBufferSource()
          source.buffer = buffer
          source.connect(context.destination)
          const startAt = Math.max(endsAt, context.currentTime + 0.05)
          source.start(startAt)
          endsAt = startAt + buffer.duration + SENTENCE_GAP_SECONDS
        }
        synth.dispose()
        synth = undefined
        while (context.currentTime < endsAt) await wait(200, controller.signal)
        finish(controller)
      } catch (failure) {
        finish(controller, failure)
      } finally {
        synth?.dispose()
        void context.close()
      }
    }
    void run()
  }

  const exportWav = async (text: string, speed: number): Promise<Blob | null> => {
    const chunks = splitSpeechText(normalizeVietnameseText(text))
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
        pcm.push(await synth.synthesize(chunk, 1 / speed), gap)
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

  const stop = () => {
    const controller = job.current
    controller?.abort()
    if (controller) finish(controller)
  }
  const setRate = (speed: number) => { rate.current = speed }

  return { phase, download, exported, error, speak, exportWav, stop, setRate }
}
