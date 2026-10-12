import { rangeAt, remainingAt, type ScheduledAudio, type TimelineEntry } from '../utils/reading-timeline'
import { timeStretch } from '../utils/time-stretch'
import { PIPER_SAMPLE_RATE } from './piper-tts'

export const SENTENCE_GAP_SECONDS = 0.12
const START_LEAD_SECONDS = 0.05

interface Item extends ScheduledAudio {
  pcm: Float32Array<ArrayBuffer>
  /** Tốc độ lúc Piper sinh đoạn này; co giãn luôn tính từ âm thanh gốc, không co giãn chồng lên bản đã co giãn. */
  synthRate: number
  range: { start: number; end: number }
  source: AudioBufferSourceNode | null
}

/** Xếp lịch phát các đoạn Piper trên một AudioContext; tạm dừng = treo đồng hồ, đổi tốc độ = co giãn phần chưa nghe. */
export class PiperPlayer {
  readonly context = new AudioContext()
  private items: Item[] = []
  private timeline: TimelineEntry[] = []
  private rate: number
  endsAt: number

  /** Phải tạo ngay trong thao tác bấm: Safari chỉ mở tiếng cho AudioContext tạo trong thao tác của người dùng. */
  constructor(rate: number) {
    this.rate = rate
    void this.context.resume()
    this.endsAt = this.context.currentTime
  }

  get now() { return this.context.currentTime }

  enqueue(pcm: Float32Array<ArrayBuffer>, synthRate: number, range: { start: number; end: number }) {
    this.items = this.items.filter((item) => item.startAt + item.duration > this.now)
    const item: Item = { pcm, synthRate, range, source: null, startAt: 0, duration: 0, from: 0, length: pcm.length }
    this.items.push(item)
    this.play(item)
  }

  setRate(rate: number) {
    if (rate === this.rate) return
    this.rate = rate
    const now = this.now
    const remaining = remainingAt(this.items, now)
    for (const item of this.items) this.silence(item)
    this.items = remaining.map(({ item, from }) => Object.assign(item, { from }))
    this.timeline = this.timeline.filter((entry) => entry.startAt < now)
    this.endsAt = now
    for (const item of this.items) this.play(item)
  }

  pause() { return this.context.suspend() }
  resume() { return this.context.resume() }

  currentRange() { return rangeAt(this.timeline, this.now) }

  close() {
    for (const item of this.items) this.silence(item)
    this.items = []
    void this.context.close()
  }

  private play(item: Item) {
    const input = item.pcm.subarray(item.from)
    const speed = this.rate / item.synthRate
    const audio = Math.abs(speed - 1) < 0.01 ? input : timeStretch(input, speed, PIPER_SAMPLE_RATE)
    item.startAt = Math.max(this.endsAt, this.now + START_LEAD_SECONDS)
    item.duration = 0
    if (!audio.length) return
    const buffer = this.context.createBuffer(1, audio.length, PIPER_SAMPLE_RATE)
    buffer.copyToChannel(audio, 0)
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.context.destination)
    source.start(item.startAt)
    item.source = source
    item.duration = buffer.duration
    this.endsAt = item.startAt + buffer.duration + SENTENCE_GAP_SECONDS
    this.timeline.push({ startAt: item.startAt, ...item.range })
  }

  private silence(item: Item) {
    try { item.source?.stop() } catch { /* nguồn chưa start hoặc đã dừng */ }
    item.source?.disconnect()
    item.source = null
  }
}
