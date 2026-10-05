import { describe, expect, it } from 'vitest'
import type { Note } from '../types/note.types'
import { isBlankNote, NOTE_LIMITS, noteLabel, parseNotes, serializeNotes, sortNotes, taskProgress } from './notes'
import {
  DEFAULT_CODE,
  DEFAULT_PASSWORD,
  generateBatch,
  generateCode,
  generatePassword,
  passwordBits,
  passwordClasses,
  passwordStrength,
  secureRng,
  type Rng,
} from './random-code'

/** Bộ sinh giả lặp lại được (mulberry32) — test không phụ thuộc may rủi. */
function seeded(seed: number): Rng {
  let state = seed
  return (bound) => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 0x1_0000_0000) * bound)
  }
}

describe('generatePassword', () => {
  it('đủ độ dài và có mặt mọi nhóm ký tự đang bật', () => {
    const options = { ...DEFAULT_PASSWORD, symbols: true, length: 12 }
    for (let seed = 1; seed <= 200; seed++) {
      const password = generatePassword(options, seeded(seed))
      expect(password).toHaveLength(12)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[!@#$%^&*\-_=+?]/)
    }
  })

  it('chỉ dùng nhóm đang bật', () => {
    const digitsOnly = { ...DEFAULT_PASSWORD, lower: false, upper: false, length: 20 }
    expect(generatePassword(digitsOnly, seeded(7))).toMatch(/^[0-9]{20}$/)
    expect(generatePassword({ ...digitsOnly, digits: false }, seeded(7))).toBe('')
  })

  it('bỏ ký tự dễ nhầm khi được yêu cầu', () => {
    const options = { ...DEFAULT_PASSWORD, plain: true, length: 64 }
    expect(passwordClasses(options).join('')).not.toMatch(/[0Oo1lI]/)
    for (let seed = 1; seed <= 50; seed++) expect(generatePassword(options, seeded(seed))).not.toMatch(/[0Oo1lI]/)
  })

  it('ước lượng độ mạnh theo entropy', () => {
    expect(passwordBits({ ...DEFAULT_PASSWORD, lower: false, upper: false, length: 8 })).toBeCloseTo(8 * Math.log2(10), 10)
    expect(passwordStrength(passwordBits({ ...DEFAULT_PASSWORD, lower: false, upper: false, length: 8 }))).toBe('weak')
    expect(passwordStrength(passwordBits({ ...DEFAULT_PASSWORD, length: 10 }))).toBe('fair')
    expect(passwordStrength(passwordBits(DEFAULT_PASSWORD))).toBe('strong')
    expect(passwordStrength(passwordBits({ ...DEFAULT_PASSWORD, symbols: true, length: 24 }))).toBe('excellent')
    expect(passwordBits({ ...DEFAULT_PASSWORD, lower: false, upper: false, digits: false })).toBe(0)
  })
})

describe('generateCode', () => {
  it('ghép tiền tố với phần ngẫu nhiên không có ký tự dễ nhầm', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(generateCode({ ...DEFAULT_CODE, prefix: 'PX-' }, seeded(seed))).toMatch(/^PX-[A-HJ-NP-Z2-9]{8}$/)
    }
    expect(generateCode({ prefix: '', length: 6, charset: 'digits' }, seeded(3))).toMatch(/^[0-9]{6}$/)
  })
})

describe('generateBatch', () => {
  it('trả đủ số lượng, không trùng', () => {
    const rng = seeded(11)
    const batch = generateBatch(50, () => generateCode(DEFAULT_CODE, rng))
    expect(batch).toHaveLength(50)
    expect(new Set(batch).size).toBe(50)
  })

  it('không gian mã nhỏ hơn số cần thì dừng, không lặp vô tận', () => {
    const rng = seeded(5)
    const batch = generateBatch(30, () => generateCode({ prefix: '', length: 1, charset: 'digits' }, rng))
    expect(batch.length).toBeLessThanOrEqual(10)
    expect(new Set(batch).size).toBe(batch.length)
    expect(generateBatch(5, () => '')).toEqual([])
  })
})

describe('secureRng', () => {
  it('luôn nằm trong khoảng và ra đủ mọi giá trị', () => {
    const rng = secureRng()
    const seen = new Set<number>()
    for (let index = 0; index < 2000; index++) {
      const value = rng(7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
      seen.add(value)
    }
    expect(seen.size).toBe(7)
  })
})

const note = (patch: Partial<Note>): Note => ({ id: 'n1', title: '', body: '', tasks: [], updatedAt: 1, ...patch })

describe('ghi chú', () => {
  it('ghi rồi đọc lại nguyên vẹn, mới sửa lên đầu', () => {
    const notes = [note({ id: 'a', title: 'Cũ', updatedAt: 10 }), note({ id: 'b', body: 'Mới', updatedAt: 20, tasks: [{ id: 't', text: 'Gọi nhà cung cấp', done: true }] })]
    expect(parseNotes(serializeNotes(notes))).toEqual(sortNotes(notes))
    expect(parseNotes(serializeNotes(notes))[0].id).toBe('b')
  })

  it('không tin dữ liệu đã lưu', () => {
    expect(parseNotes(null)).toEqual([])
    expect(parseNotes('không phải JSON')).toEqual([])
    expect(parseNotes('[]')).toEqual([])
    expect(parseNotes('{"notes":"x"}')).toEqual([])
    const raw = JSON.stringify({
      notes: [null, 5, { title: 'thiếu id' }, { id: 'a', title: 7, body: 'ổn', tasks: [{ id: 't1', text: 'việc', done: 'yes' }, { text: 'thiếu id' }, 'x'], updatedAt: 'hôm qua' }, { id: 'a', body: 'trùng id' }],
    })
    expect(parseNotes(raw)).toEqual([{ id: 'a', title: '', body: 'ổn', tasks: [{ id: 't1', text: 'việc', done: false }], updatedAt: 0 }])
  })

  it('cắt nội dung vượt trần', () => {
    const raw = serializeNotes([note({ title: 'x'.repeat(500), body: 'y'.repeat(NOTE_LIMITS.body + 10) })])
    const [parsed] = parseNotes(raw)
    expect(parsed.title).toHaveLength(NOTE_LIMITS.title)
    expect(parsed.body).toHaveLength(NOTE_LIMITS.body)
  })

  it('đặt tên theo tiêu đề, dòng đầu, rồi việc đầu tiên', () => {
    expect(noteLabel(note({ title: ' Họp giao ban ', body: 'x' }))).toBe('Họp giao ban')
    expect(noteLabel(note({ body: '\n  Kiểm tra cốp pha tầng 3\ndòng hai' }))).toBe('Kiểm tra cốp pha tầng 3')
    expect(noteLabel(note({ tasks: [{ id: 't', text: ' Đặt thép D16 ', done: false }] }))).toBe('Đặt thép D16')
    expect(noteLabel(note({}))).toBe('Ghi chú chưa có nội dung')
  })

  it('nhận ra ghi chú trống và đếm việc đã xong', () => {
    expect(isBlankNote(note({ tasks: [{ id: 't', text: '  ', done: false }] }))).toBe(true)
    expect(isBlankNote(note({ body: 'a' }))).toBe(false)
    expect(
      taskProgress(
        note({
          tasks: [
            { id: '1', text: 'a', done: true },
            { id: '2', text: 'b', done: false },
          ],
        }),
      ),
    ).toEqual({ done: 1, total: 2 })
  })
})
