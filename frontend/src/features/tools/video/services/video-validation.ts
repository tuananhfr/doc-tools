import type { VideoMetadata, VideoOptions } from '../types/video.types'

export const VIDEO_LIMITS = { bytes: 100 * 1024 * 1024, duration: 600, pixels: 3840 * 2160, gifDuration: 20 } as const
export const VIDEO_ACCEPT = 'video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi'

export function validateVideoFile(file: Pick<File, 'name' | 'size' | 'type'>): void {
  if (!file.size) throw new Error('Tệp trống. Hãy chọn một video khác.')
  if (file.size > VIDEO_LIMITS.bytes) throw new Error('Video vượt quá 100 MB. Hãy chọn tệp nhỏ hơn.')
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) throw new Error('Hãy chọn một tệp video MP4, MOV, WebM, MKV hoặc AVI.')
}

export function parseVideoMetadata(text: string): VideoMetadata {
  let value: { format?: { duration?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }> }
  try { value = JSON.parse(text) } catch { throw new Error('Không đọc được thông tin video.') }
  const streams = Array.isArray(value?.streams) ? value.streams : []
  const video = streams.find((stream) => stream?.codec_type === 'video')
  const duration = Number(value?.format?.duration ?? video?.duration)
  const width = Number(video?.width)
  const height = Number(video?.height)
  if (!video || !Number.isFinite(duration) || duration <= 0 || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error('Tệp không có luồng video hợp lệ hoặc không xác định được thời lượng.')
  if (duration > VIDEO_LIMITS.duration) throw new Error('Video dài hơn 10 phút. Hãy chọn một đoạn ngắn hơn.')
  if (width * height > VIDEO_LIMITS.pixels) throw new Error('Độ phân giải video vượt quá 4K. Hãy chọn bản có độ phân giải thấp hơn.')
  return { duration, width, height, hasAudio: streams.some((stream) => stream?.codec_type === 'audio') }
}

export function validateVideoOptions(options: VideoOptions, metadata?: VideoMetadata): void {
  if (options.action === 'compress' && (![23, 28, 32].includes(options.quality) || ![720, 1080].includes(options.edge))) throw new Error('Thiết lập nén chưa hợp lệ.')
  if (options.action === 'audio' && !['mp3', 'm4a', 'wav'].includes(options.format)) throw new Error('Định dạng âm thanh chưa hợp lệ.')
  if (options.action === 'gif' || options.action === 'trim') {
    if (!Number.isFinite(options.start) || !Number.isFinite(options.end) || options.start < 0 || options.end <= options.start) throw new Error('Thời gian kết thúc phải lớn hơn bắt đầu và cả hai phải là số giây hợp lệ.')
    if (metadata && options.end > metadata.duration + 0.001) throw new Error(`Video chỉ dài ${metadata.duration.toFixed(2)} giây. Hãy giảm thời gian kết thúc.`)
    if (options.action === 'gif' && (options.end - options.start > VIDEO_LIMITS.gifDuration || ![320, 480, 640].includes(options.width) || ![8, 12, 15].includes(options.fps))) throw new Error('GIF tối đa 20 giây, rộng 640 px và 15 khung hình/giây.')
  }
  if (metadata && options.action === 'audio' && !metadata.hasAudio) throw new Error('Video này không có âm thanh để tách.')
}
