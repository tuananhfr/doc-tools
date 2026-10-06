import { describe, expect, it } from 'vitest'
import { parseVideoMetadata, validateVideoFile, validateVideoOptions, VIDEO_LIMITS } from './video-validation'

const metadata = { duration: 10, width: 1280, height: 720, hasAudio: true }
const probe = (duration: string, streams = [{ codec_type: 'video', width: 1280, height: 720 }, { codec_type: 'audio' }]) => JSON.stringify({ format: { duration }, streams })

describe('video input guards', () => {
  it('rejects empty, oversized, and non-video inputs before loading WASM', () => {
    expect(() => validateVideoFile({ name: 'a.mp4', size: 0, type: 'video/mp4' })).toThrow(/trống/)
    expect(() => validateVideoFile({ name: 'a.mp4', size: VIDEO_LIMITS.bytes + 1, type: 'video/mp4' })).toThrow(/100 MB/)
    expect(() => validateVideoFile({ name: 'note.txt', size: 100, type: 'text/plain' })).toThrow(/video/)
    expect(() => validateVideoFile({ name: 'phone.MOV', size: 100, type: '' })).not.toThrow()
  })
  it('uses probe evidence for streams and bounded duration/resolution', () => {
    expect(parseVideoMetadata(probe('10'))).toEqual(metadata)
    expect(() => parseVideoMetadata('null')).toThrow(/hợp lệ/)
    expect(() => parseVideoMetadata(probe('NaN'))).toThrow(/hợp lệ/)
    expect(() => parseVideoMetadata(probe('601'))).toThrow(/10 phút/)
    expect(() => parseVideoMetadata(probe('10', [{ codec_type: 'video', width: 8000, height: 8000 }]))).toThrow(/4K/)
    expect(() => parseVideoMetadata(probe('10', [{ codec_type: 'audio' }]))).toThrow(/luồng video/)
  })
  it('rejects reversed, empty, non-finite, or out-of-video intervals', () => {
    for (const [start, end] of [[-1, 2], [2, 1], [1, 1], [NaN, 2], [0, Infinity], [0, 11]]) expect(() => validateVideoOptions({ action: 'trim', start, end }, metadata)).toThrow()
    expect(() => validateVideoOptions({ action: 'trim', start: 1.2, end: 10 }, metadata)).not.toThrow()
  })
  it('bounds GIF work and refuses extracting nonexistent audio', () => {
    expect(() => validateVideoOptions({ action: 'gif', start: 0, end: 21, width: 640, fps: 15 })).toThrow(/20 giây/)
    expect(() => validateVideoOptions({ action: 'audio', format: 'mp3' }, { ...metadata, hasAudio: false })).toThrow(/không có âm thanh/)
  })
})
