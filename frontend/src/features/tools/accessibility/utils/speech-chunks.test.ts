import { describe, expect, it } from 'vitest'
import { neighbourChunkStart, speechChunksFrom, splitSpeechText } from './speech-chunks'
import { encodeWav } from './wav'

const texts = (text: string, max?: number) => splitSpeechText(text, max).map((chunk) => chunk.text)

describe('splitSpeechText', () => {
  it('reads one sentence per chunk and keeps paragraphs apart', () => {
    expect(texts('Xin chào. Tôi là Đức!\n\nĐoạn hai?', 40)).toEqual(['Xin chào.', 'Tôi là Đức!', 'Đoạn hai?'])
  })

  it('keeps offsets into the original text', () => {
    const text = '  Câu một.   Câu hai!\nCâu  ba'
    for (const chunk of splitSpeechText(text)) expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    expect(splitSpeechText(text).map((chunk) => chunk.start)).toEqual([2, 13, 22])
  })

  it('does not break after titles, place prefixes or abbreviations inside a sentence', () => {
    expect(texts('UBND TP. Hà Nội họp tại Q. 1 với ThS. Lan, v.v. và nhiều người. Hết.'))
      .toEqual(['UBND TP. Hà Nội họp tại Q. 1 với ThS. Lan, v.v. và nhiều người.', 'Hết.'])
  })

  it('never returns a chunk over the limit, preferring commas then spaces', () => {
    const long = 'một hai ba bốn năm sáu bảy tám chín mười, '.repeat(12) + 'hết.'
    const chunks = texts(long, 100)
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long.trim().replace(/\s+/g, ' '))
    expect(texts('a'.repeat(250), 100).map((chunk) => chunk.length)).toEqual([100, 100, 50])
  })

  it('drops punctuation-only pieces that a voice cannot read', () => {
    expect(texts('Một. ... ! \n — \nHai.')).toEqual(['Một.', 'Hai.'])
    expect(texts('   ')).toEqual([])
  })
})

describe('speechChunksFrom', () => {
  it('resumes inside the current chunk and keeps later chunks whole', () => {
    const text = 'Câu một rất dài. Câu hai.'
    const resumed = speechChunksFrom(splitSpeechText(text), text.indexOf('rất'))
    expect(resumed.map(({ chunk, from }) => text.slice(from, chunk.end))).toEqual(['rất dài.', 'Câu hai.'])
    expect(resumed[0].chunk.start).toBe(0)
  })

  it('skips a remainder that has nothing left to read', () => {
    const text = 'Câu một. Câu hai.'
    expect(speechChunksFrom(splitSpeechText(text), text.indexOf('.')).map(({ chunk }) => chunk.text)).toEqual(['Câu hai.'])
  })
})

describe('encodeWav', () => {
  it('writes a 16-bit mono header and clamps samples', () => {
    const view = new DataView(encodeWav([Float32Array.from([0, 1]), Float32Array.from([-2, Number.NaN])], 22050))
    const text = (offset: number) => String.fromCharCode(...Array.from({ length: 4 }, (_, index) => view.getUint8(offset + index)))
    expect([text(0), text(8), text(36)]).toEqual(['RIFF', 'WAVE', 'data'])
    expect(view.getUint32(24, true)).toBe(22050)
    expect(view.getUint32(40, true)).toBe(8)
    expect([44, 46, 48, 50].map((offset) => view.getInt16(offset, true))).toEqual([0, 32767, -32767, 0])
  })
})

describe('neighbourChunkStart', () => {
  const text = 'Câu một. Câu hai rất dài. Câu ba.'
  const chunks = splitSpeechText(text)

  it('jumps from the middle of a sentence to the previous and next sentence starts', () => {
    const middle = text.indexOf('rất')
    expect(neighbourChunkStart(chunks, middle, -1)).toBe(0)
    expect(neighbourChunkStart(chunks, middle, 1)).toBe(text.indexOf('Câu ba'))
  })

  it('returns null past either end and for empty text', () => {
    expect(neighbourChunkStart(chunks, 0, -1)).toBeNull()
    expect(neighbourChunkStart(chunks, text.indexOf('Câu ba'), 1)).toBeNull()
    expect(neighbourChunkStart([], 0, 1)).toBeNull()
  })

  it('feeds speechChunksFrom so a seek resumes exactly at the sentence start', () => {
    const target = neighbourChunkStart(chunks, 0, 1)!
    expect(speechChunksFrom(chunks, target).map(({ chunk, from }) => text.slice(from, chunk.end))).toEqual(['Câu hai rất dài.', 'Câu ba.'])
  })
})
