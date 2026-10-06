import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { videoCommand } from './video-command'
import { parseVideoMetadata } from './video-validation'

interface Core {
  exec: (...args: string[]) => number
  ffprobe: (...args: string[]) => number
  reset: () => void
  FS: { readFile: (name: string, options?: { encoding: string }) => Uint8Array | string; unlink: (name: string) => void }
}
let core: Core
const previousSelf = globalThis.self
const command = (args: string[]) => { core.reset(); expect(core.exec(...args)).toBe(0) }
const inspect = (file: string) => {
  core.reset()
  const status = core.ffprobe('-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,duration', '-of', 'json', file, '-o', 'info.json')
  expect([0, -1]).toContain(status)
  return JSON.parse(String(core.FS.readFile('info.json', { encoding: 'utf8' })))
}

beforeAll(async () => {
  // The unmodified browser core needs only a worker location when wasmBinary is supplied.
  Object.defineProperty(globalThis, 'self', { value: { location: { href: 'http://localhost/' } }, configurable: true })
  const module = await import(/* @vite-ignore */ pathToFileURL(resolve('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js')).href)
  core = await module.default({ wasmBinary: fs.readFileSync('node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm') })
  command(['-f', 'lavfi', '-i', 'testsrc2=size=128x96:rate=12', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '4', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-c:a', 'aac', '-f', 'mp4', 'input.dat'])
}, 30_000)
afterAll(() => { Object.defineProperty(globalThis, 'self', { value: previousSelf, configurable: true }) })

describe('unmodified FFmpeg WASM outputs', () => {
  it('encodes a playable MP4 and preserves audio', () => {
    command(videoCommand({ action: 'compress', quality: 32, edge: 720 }).args)
    const info = inspect('output.mp4')
    const metadata = parseVideoMetadata(JSON.stringify(info))
    expect(metadata.duration).toBeCloseTo(4, 1)
    expect(metadata.hasAudio).toBe(true)
    expect(metadata.width).toBeLessThanOrEqual(720)
    expect(core.FS.readFile('output.mp4').length).toBeGreaterThan(1000)
  })
  it('cuts a fractional interval without keyframe rounding', () => {
    command(videoCommand({ action: 'trim', start: 1.25, end: 2.75 }).args)
    const info = inspect('output.mp4')
    expect(Number(info.format.duration)).toBeCloseTo(1.5, 1)
    expect(info.streams.some((s: { codec_type: string }) => s.codec_type === 'audio')).toBe(true)
  })
  it('creates a bounded GIF with the requested width and duration', () => {
    command(videoCommand({ action: 'gif', start: 1, end: 2.5, width: 320, fps: 8 }).args)
    const bytes = core.FS.readFile('output.gif') as Uint8Array
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toMatch(/^GIF8[79]a$/)
    const info = inspect('output.gif')
    expect(info.streams[0].width).toBe(320)
    expect(Number(info.format.duration)).toBeCloseTo(1.5, 1)
  })
  it.each(['mp3', 'm4a', 'wav'] as const)('extracts valid %s audio without a video stream', (format) => {
    command(videoCommand({ action: 'audio', format }).args)
    const info = inspect(`output.${format}`)
    expect(info.streams.map((s: { codec_type: string }) => s.codec_type)).toEqual(['audio'])
    expect(Number(info.format.duration)).toBeGreaterThanOrEqual(3.9)
    expect(Number(info.format.duration)).toBeLessThan(4.2)
  })
  it('handles a longer silent video and reports its missing audio', () => {
    core.FS.unlink('input.dat')
    command(['-f', 'lavfi', '-i', 'color=c=blue:size=64x48:rate=5', '-t', '61', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-f', 'mp4', 'input.dat'])
    const metadata = parseVideoMetadata(JSON.stringify(inspect('input.dat')))
    expect(metadata.duration).toBeCloseTo(61, 1)
    expect(metadata.hasAudio).toBe(false)
    command(videoCommand({ action: 'trim', start: 59.5, end: 61 }).args)
    expect(Math.abs(Number(inspect('output.mp4').format.duration) - 1.5)).toBeLessThanOrEqual(1 / 5)
  })
})
