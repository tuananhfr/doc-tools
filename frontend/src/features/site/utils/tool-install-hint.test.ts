import { describe, expect, it } from 'vitest'
import { closeHint, hintMode, parseHintPrefs } from './tool-install-hint'

const base = { slug: 'vay-tra-gop', prefs: { never: false, closed: [] }, promptReady: false, standalone: false, framed: false, ios: false }

describe('parseHintPrefs', () => {
  it('bỏ qua dữ liệu hỏng', () => {
    expect(parseHintPrefs(null)).toEqual({ never: false, closed: [] })
    expect(parseHintPrefs('{')).toEqual({ never: false, closed: [] })
    expect(parseHintPrefs('{"never":"yes","closed":["a",1]}')).toEqual({ never: false, closed: ['a'] })
  })
})

describe('closeHint', () => {
  it('nhớ công cụ đã tắt, không lặp', () => {
    expect(closeHint(closeHint({ never: false, closed: [] }, 'a'), 'a').closed).toEqual(['a'])
  })
})

describe('hintMode', () => {
  it('có hộp cài thì mời cài một chạm', () => expect(hintMode({ ...base, promptReady: true })).toBe('prompt'))
  it('Safari iPhone thì hướng dẫn', () => expect(hintMode({ ...base, ios: true })).toBe('ios'))
  it('trình duyệt khác không cài được thì im', () => expect(hintMode(base)).toBeNull())
  it('không gợi ý khi đang là ứng dụng, trong khung hoặc đã tắt', () => {
    expect(hintMode({ ...base, promptReady: true, standalone: true })).toBeNull()
    expect(hintMode({ ...base, promptReady: true, framed: true })).toBeNull()
    expect(hintMode({ ...base, ios: true, prefs: { never: true, closed: [] } })).toBeNull()
    expect(hintMode({ ...base, ios: true, prefs: { never: false, closed: ['vay-tra-gop'] } })).toBeNull()
  })
})
