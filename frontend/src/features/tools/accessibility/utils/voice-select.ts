import type { ReadEngine, ReadErrorCode } from '../types/read-listen.types'

/** Phần của `SpeechSynthesisVoice` cần để chọn giọng — test truyền đối tượng thường. */
export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export type VoiceCheck = { state: 'loading' } | { state: 'missing' } | { state: 'ok'; name: string; online: boolean }

export interface ReadNotices {
  codes: ReadErrorCode[]
  /** Máy không có giọng Việt mà trình duyệt chạy được Piper: gợi ý đổi giọng thay vì để người dùng bế tắc. */
  suggestPiper: boolean
  /** Tên giọng online đang được chọn — giọng đó cần mạng và gửi chữ ra ngoài, phải nói ra. */
  onlineVoice: string | null
}

// Chỉ những chữ có ở tiếng Việt mà không có ở tiếng Pháp/Bồ: â ê ô à é… có cả ở đó nên không tính.
const VIETNAMESE_LETTERS = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĩũ]/giu
const LETTERS = /\p{L}/gu
const SAMPLE_CHARS = 2000

const normalizeLang = (lang: string) => lang.toLowerCase().replaceAll('_', '-')

/** Ngôn ngữ để đọc: chữ mang dấu riêng của tiếng Việt thì đọc giọng Việt dù trang đang ở ngôn ngữ nào. */
export function detectSpeechLang(text: string, fallback: string): string {
  const sample = text.slice(0, SAMPLE_CHARS).normalize('NFC')
  const letters = sample.match(LETTERS)?.length ?? 0
  const vietnamese = sample.match(VIETNAMESE_LETTERS)?.length ?? 0
  return letters > 0 && vietnamese >= 2 && vietnamese / letters >= 0.02 ? 'vi-VN' : fallback
}

/**
 * Giọng cho một ngôn ngữ: giọng cài trên máy trước giọng online (online cần mạng, gửi chữ cho nhà cung cấp trình
 * duyệt, và giọng Google của Chrome tự dừng sau ~15 giây), rồi đúng vùng trước cùng ngôn ngữ, rồi giọng mặc định.
 */
export function pickVoice<T extends VoiceInfo>(voices: readonly T[], lang: string): T | null {
  const wanted = normalizeLang(lang)
  const base = wanted.split('-')[0]
  let best: T | null = null
  let bestRank = Infinity
  for (const voice of voices) {
    const tag = normalizeLang(voice.lang)
    const match = tag === wanted ? 0 : tag.split('-')[0] === base ? 1 : -1
    if (match < 0) continue
    const rank = (voice.localService ? 0 : 4) + match * 2 + (voice.default ? 0 : 1)
    if (rank < bestRank) {
      best = voice
      bestRank = rank
    }
  }
  return best
}

export function voiceCheck(voices: readonly VoiceInfo[] | null, lang: string): VoiceCheck {
  if (voices === null) return { state: 'loading' }
  const voice = pickVoice(voices, lang)
  return voice ? { state: 'ok', name: voice.name, online: !voice.localService } : { state: 'missing' }
}

interface NoticeInput {
  engine: ReadEngine
  deviceSupported: boolean
  piperSupported: boolean
  voice: VoiceCheck
  lang: string
  online: boolean
}

/** Câu báo trung thực về giọng (READ06, CN-003): không có giọng, giọng online, mất mạng. Đang nạp giọng thì im. */
export function readNotices({ engine, deviceSupported, piperSupported, voice, lang, online }: NoticeInput): ReadNotices {
  if (engine === 'piper') {
    const codes: ReadErrorCode[] = []
    if (!piperSupported) codes.push('TTS_UNAVAILABLE')
    // Không biết chắc mô hình đã nằm trong cache chưa — nói điều kiện thật: lần tải đầu cần mạng.
    if (!online) codes.push('OFFLINE')
    return { codes, suggestPiper: false, onlineVoice: null }
  }
  const missing = !deviceSupported || voice.state === 'missing'
  const onlineVoice = voice.state === 'ok' && voice.online ? voice.name : null
  const codes: ReadErrorCode[] = []
  if (missing) codes.push('TTS_UNAVAILABLE')
  if (!online && onlineVoice) codes.push('OFFLINE')
  return { codes, suggestPiper: missing && normalizeLang(lang).startsWith('vi') && piperSupported, onlineVoice }
}

/** "Tiếng Việt" / "Vietnamese" cho câu báo thiếu giọng; thẻ ngôn ngữ hỏng thì trả nguyên văn. */
export function languageName(lang: string, displayLocale: string): string {
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'language' }).of(lang.split('-')[0]) ?? lang
  } catch {
    return lang
  }
}
