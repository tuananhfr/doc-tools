import { beforeEach, expect, it, vi } from 'vitest'
import { runVideoTask } from './video-engine'

const mocks = vi.hoisted(() => ({ load: vi.fn(), terminate: vi.fn(), readFile: vi.fn(), exec: vi.fn(), writeFile: vi.fn(), ffprobe: vi.fn() }))
vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: class {
  load = mocks.load
  terminate = mocks.terminate
  readFile = mocks.readFile
  exec = mocks.exec
  writeFile = mocks.writeFile
  ffprobe = mocks.ffprobe
  on() {}
} }))
const file = new File(['fake video'], 'demo.mp4', { type: 'video/mp4' })
const options = { action: 'audio', format: 'mp3' } as const
const probe = { format: { duration: '4' }, streams: [{ codec_type: 'video', width: 128, height: 96 }, { codec_type: 'audio' }] }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('Worker', class {})
  vi.stubGlobal('window', { location: { href: 'http://localhost/nen-video' } })
  mocks.load.mockResolvedValue(true)
  mocks.ffprobe.mockResolvedValue(-1)
  mocks.writeFile.mockResolvedValue(true)
  mocks.exec.mockResolvedValue(0)
  mocks.readFile.mockImplementation((name) => Promise.resolve(name === 'probe.json' ? JSON.stringify(probe) : new Uint8Array([1, 2, 3])))
})

it('terminates the worker and releases the job lock after successful processing', async () => {
  const first = await runVideoTask(file, options, new AbortController().signal, vi.fn())
  expect(first.blob.type).toBe('audio/mpeg')
  const loaded = mocks.load.mock.calls[0][0]
  expect(loaded.classWorkerURL).toBe('http://localhost/vendor/ffmpeg/core-0.12.10-wrapper-0.12.15/worker.js')
  expect(loaded.coreURL).toMatch(/^http:\/\/localhost\/vendor\//)
  expect(loaded.wasmURL).toMatch(/^http:\/\/localhost\/vendor\//)
  expect(mocks.terminate).toHaveBeenCalledOnce()
  await runVideoTask(file, options, new AbortController().signal, vi.fn())
  expect(mocks.terminate).toHaveBeenCalledTimes(2)
})
it('terminates on encoding failure and permits a new job', async () => {
  mocks.exec.mockResolvedValueOnce(1)
  await expect(runVideoTask(file, options, new AbortController().signal, vi.fn())).rejects.toThrow(/Không xử lý/)
  expect(mocks.terminate).toHaveBeenCalledOnce()
  await expect(runVideoTask(file, options, new AbortController().signal, vi.fn())).resolves.toHaveProperty('name')
})
it('refuses to encode a silent video and cleans up the worker', async () => {
  mocks.readFile.mockResolvedValue(JSON.stringify({ ...probe, streams: [probe.streams[0]] }))
  await expect(runVideoTask(file, options, new AbortController().signal, vi.fn())).rejects.toThrow(/không có âm thanh/)
  expect(mocks.exec).not.toHaveBeenCalled()
  expect(mocks.terminate).toHaveBeenCalledOnce()
})
it('rejects a second simultaneous job and cancels the first during loading', async () => {
  let rejectLoad: (error: Error) => void = () => {}
  let started: () => void = () => {}
  const startedPromise = new Promise<void>((resolve) => { started = resolve })
  mocks.load.mockImplementationOnce(() => { started(); return new Promise((_, reject) => { rejectLoad = reject }) })
  mocks.terminate.mockImplementation(() => rejectLoad(new Error('terminated')))
  const controller = new AbortController()
  const running = runVideoTask(file, options, controller.signal, vi.fn())
  const rejection = expect(running).rejects.toMatchObject({ name: 'AbortError' })
  await startedPromise
  await expect(runVideoTask(file, options, new AbortController().signal, vi.fn())).rejects.toThrow(/video khác/)
  controller.abort()
  await rejection
  expect(mocks.exec).not.toHaveBeenCalled()
})
