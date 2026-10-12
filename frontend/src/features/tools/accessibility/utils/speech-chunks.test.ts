import { describe, expect, it } from 'vitest'
import { splitSpeechText } from './speech-chunks'
import { encodeWav } from './wav'

describe('splitSpeechText', () => {
  it('packs short sentences together and keeps paragraphs apart', () => {
    expect(splitSpeechText('Xin chào. Tôi là Đức!\n\nĐoạn hai?', 40)).toEqual(['Xin chào. Tôi là Đức!', 'Đoạn hai?'])
  })

  it('never returns a chunk over the limit, preferring commas then spaces', () => {
    const long = 'một hai ba bốn năm sáu bảy tám chín mười, '.repeat(12) + 'hết.'
    const chunks = splitSpeechText(long, 100)
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long.trim().replace(/\s+/g, ' '))
    expect(splitSpeechText('a'.repeat(250), 100).map((chunk) => chunk.length)).toEqual([100, 100, 50])
  })

  it('drops punctuation-only pieces that a voice cannot read', () => {
    expect(splitSpeechText('Một. ... ! \n — \nHai.')).toEqual(['Một. ... !', 'Hai.'])
    expect(splitSpeechText('   ')).toEqual([])
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
