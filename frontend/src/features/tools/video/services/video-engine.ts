import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { withBase } from '@/utils/url'
import type { VideoOptions, VideoOutput, VideoProgress } from '../types/video.types'
import { videoCommand, videoOutputName } from './video-command'
import { parseVideoMetadata, validateVideoFile, validateVideoOptions } from './video-validation'

const vendor = '/vendor/ffmpeg/core-0.12.10-wrapper-0.12.15'
let active = false

export function videoEngineSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
}

export async function runVideoTask(file: File, options: VideoOptions, signal: AbortSignal, report: (state: VideoProgress) => void): Promise<VideoOutput> {
  validateVideoFile(file)
  validateVideoOptions(options)
  if (!videoEngineSupported()) throw new Error('Trình duyệt này chưa hỗ trợ xử lý video. Hãy thử Chrome, Edge, Firefox hoặc Safari phiên bản mới trên máy tính.')
  if (active) throw new Error('Một video khác đang được xử lý. Hãy chờ hoặc hủy tác vụ đó.')
  active = true
  let engine: FFmpeg | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  const terminate = () => engine?.terminate()
  signal.addEventListener('abort', terminate, { once: true })
  try {
    signal.throwIfAborted()
    report({ phase: 'loading', percent: null })
    const { FFmpeg: Engine } = await import('@ffmpeg/ffmpeg')
    signal.throwIfAborted()
    engine = new Engine()
    timeout = setTimeout(() => { timedOut = true; terminate() }, 90_000)
    // Webpack substitutes import.meta.url inside the wrapper; absolute HTTP URLs avoid file:// workers.
    const assetUrl = (name: string) => new URL(withBase(`${vendor}/${name}`), window.location.href).href
    await engine.load({ coreURL: assetUrl('ffmpeg-core.js'), wasmURL: assetUrl('ffmpeg-core.wasm'), classWorkerURL: assetUrl('worker.js') })
    clearTimeout(timeout)
    timeout = setTimeout(() => { timedOut = true; terminate() }, 600_000)
    signal.throwIfAborted()
    report({ phase: 'reading', percent: null })
    const input = new Uint8Array(await file.arrayBuffer())
    signal.throwIfAborted()
    await engine.writeFile('input.dat', input)
    const probeStatus = await engine.ffprobe(['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,duration', '-of', 'json', 'input.dat', '-o', 'probe.json'], 30_000)
    // Core 0.12.10 leaves ret=-1 after a successful ffprobe; validate the emitted JSON below.
    if (probeStatus !== 0 && probeStatus !== -1) throw new Error('Không đọc được video. Tệp có thể hỏng hoặc dùng codec chưa hỗ trợ.')
    const probe = await engine.readFile('probe.json', 'utf8')
    const metadata = parseVideoMetadata(String(probe))
    validateVideoOptions(options, metadata)
    const command = videoCommand(options)
    const duration = options.action === 'trim' || options.action === 'gif' ? options.end - options.start : metadata.duration
    engine.on('progress', ({ time }) => report({ phase: 'processing', percent: Math.max(0, Math.min(99, Math.floor(time / 1_000_000 / duration * 100))) }))
    report({ phase: 'processing', percent: 0 })
    const status = await engine.exec(command.args, 570_000)
    signal.throwIfAborted()
    if (status !== 0) throw new Error('Không xử lý được video hoặc đã hết thời gian. Hãy thử một đoạn ngắn hơn hoặc chất lượng thấp hơn.')
    report({ phase: 'saving', percent: null })
    const data = await engine.readFile(`output.${command.extension}`)
    if (!(data instanceof Uint8Array) || !data.byteLength) throw new Error('Không tạo được tệp kết quả. Hãy thử video khác.')
    return { blob: new Blob([new Uint8Array(data)], { type: command.mime }), name: videoOutputName(file.name, command.suffix, command.extension), metadata }
  } catch (error) {
    if (signal.aborted) throw new DOMException('Đã hủy xử lý video.', 'AbortError')
    if (timedOut) throw new Error('Tác vụ mất quá nhiều thời gian. Hãy thử video ngắn hơn và kiểm tra kết nối khi tải bộ xử lý.')
    if (error instanceof Error && !/memory|wasm|Aborted|worker|fetch|network|import/i.test(error.message)) throw error
    throw new Error('Không tải hoặc chạy được bộ xử lý video. Kiểm tra kết nối, đóng bớt tab hoặc thử tệp nhỏ hơn trên máy tính.')
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', terminate)
    terminate()
    active = false
  }
}
