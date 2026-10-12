import { describe, expect, it } from 'vitest'
import { detectSpeechLang, languageName, pickVoice, readNotices, voiceCheck, type VoiceCheck } from './voice-select'

const voice = (name: string, lang: string, localService: boolean, isDefault = false) => ({ name, lang, localService, default: isDefault })

describe('detectSpeechLang', () => {
  it('reads Vietnamese text with a Vietnamese voice whatever the page language', () => {
    expect(detectSpeechLang('Tiếng Việt có dấu', 'en-US')).toBe('vi-VN')
    expect(detectSpeechLang('ĐỌC TRUYỆN CHO BÀ NGHE', 'en-US')).toBe('vi-VN')
  })

  it('keeps the page language for other text, including French with circumflexes', () => {
    expect(detectSpeechLang('Hello world', 'en-US')).toBe('en-US')
    expect(detectSpeechLang("Être prêt à côté de l'hôtel", 'fr-FR')).toBe('fr-FR')
    expect(detectSpeechLang('', 'ja-JP')).toBe('ja-JP')
  })
})

describe('pickVoice', () => {
  it('prefers an installed voice over an online one for the same language', () => {
    expect(pickVoice([voice('Samantha', 'en-US', true, true), voice('Google tiếng Việt', 'vi-VN', false), voice('Linh', 'vi-VN', true)], 'vi-VN')?.name).toBe('Linh')
  })

  it('falls back to an online voice, accepts underscores and prefers the exact region', () => {
    expect(pickVoice([voice('Google tiếng Việt', 'vi-VN', false)], 'vi-VN')?.name).toBe('Google tiếng Việt')
    expect(pickVoice([voice('An', 'vi_VN', true)], 'vi-VN')?.name).toBe('An')
    expect(pickVoice([voice('UK', 'en-GB', true), voice('US', 'en-US', true)], 'en-US')?.name).toBe('US')
  })

  it('returns null when no voice speaks the language', () => {
    expect(pickVoice([voice('Samantha', 'en-US', true)], 'vi-VN')).toBeNull()
  })
})

describe('voiceCheck', () => {
  it('distinguishes loading, missing and online voices', () => {
    expect(voiceCheck(null, 'vi-VN')).toEqual({ state: 'loading' })
    expect(voiceCheck([], 'vi-VN')).toEqual({ state: 'missing' })
    expect(voiceCheck([voice('Google tiếng Việt', 'vi-VN', false)], 'vi-VN')).toEqual({ state: 'ok', name: 'Google tiếng Việt', online: true })
  })
})

describe('readNotices', () => {
  const base = { engine: 'device' as const, deviceSupported: true, piperSupported: true, lang: 'vi-VN', online: true }
  const ok = (online: boolean): VoiceCheck => ({ state: 'ok', name: 'Giọng', online })

  it('stays quiet while voices load, then says TTS_UNAVAILABLE and suggests the Vietnamese Piper voice', () => {
    expect(readNotices({ ...base, voice: { state: 'loading' } })).toEqual({ codes: [], suggestPiper: false, onlineVoice: null })
    expect(readNotices({ ...base, voice: { state: 'missing' } })).toEqual({ codes: ['TTS_UNAVAILABLE'], suggestPiper: true, onlineVoice: null })
    expect(readNotices({ ...base, lang: 'en-US', voice: { state: 'missing' } }).suggestPiper).toBe(false)
    expect(readNotices({ ...base, deviceSupported: false, voice: { state: 'missing' } }).codes).toEqual(['TTS_UNAVAILABLE'])
  })

  it('names an online voice and adds OFFLINE only when that voice needs the network', () => {
    expect(readNotices({ ...base, voice: ok(true) })).toEqual({ codes: [], suggestPiper: false, onlineVoice: 'Giọng' })
    expect(readNotices({ ...base, online: false, voice: ok(true) }).codes).toEqual(['OFFLINE'])
    expect(readNotices({ ...base, online: false, voice: ok(false) }).codes).toEqual([])
  })

  it('reports Piper availability and that its first download needs the network', () => {
    expect(readNotices({ ...base, engine: 'piper', voice: { state: 'missing' } }).codes).toEqual([])
    expect(readNotices({ ...base, engine: 'piper', piperSupported: false, online: false, voice: { state: 'missing' } }).codes).toEqual(['TTS_UNAVAILABLE', 'OFFLINE'])
  })
})

describe('languageName', () => {
  it('names the base language in the page locale and survives bad tags', () => {
    expect(languageName('vi-VN', 'en')).toBe('Vietnamese')
    expect(languageName('vi-VN', 'vi')).toBe('Tiếng Việt')
    expect(languageName('bad!!', 'en')).toBe('bad!!')
  })
})
