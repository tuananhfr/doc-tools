import { translate } from '@/i18n/runtime'
import type { VideoMetadata, VideoOptions } from '../types/video.types'

export const VIDEO_LIMITS = { bytes: 100 * 1024 * 1024, duration: 600, pixels: 3840 * 2160, gifDuration: 20 } as const
export const VIDEO_ACCEPT = 'video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi'

export function validateVideoFile(file: Pick<File, 'name' | 'size' | 'type'>): void {
  if (!file.size) throw new Error(translate('video:errors.emptyFile'))
  if (file.size > VIDEO_LIMITS.bytes) throw new Error(translate('video:errors.tooLarge'))
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) throw new Error(translate('video:errors.notVideo'))
}

export function parseVideoMetadata(text: string): VideoMetadata {
  let value: { format?: { duration?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }> }
  try { value = JSON.parse(text) } catch { throw new Error(translate('video:errors.unreadableInfo')) }
  const streams = Array.isArray(value?.streams) ? value.streams : []
  const video = streams.find((stream) => stream?.codec_type === 'video')
  const duration = Number(value?.format?.duration ?? video?.duration)
  const width = Number(video?.width)
  const height = Number(video?.height)
  if (!video || !Number.isFinite(duration) || duration <= 0 || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error(translate('video:errors.noVideoStream'))
  if (duration > VIDEO_LIMITS.duration) throw new Error(translate('video:errors.tooLong'))
  if (width * height > VIDEO_LIMITS.pixels) throw new Error(translate('video:errors.tooHighRes'))
  return { duration, width, height, hasAudio: streams.some((stream) => stream?.codec_type === 'audio') }
}

export function validateVideoOptions(options: VideoOptions, metadata?: VideoMetadata): void {
  if (options.action === 'compress' && (![23, 28, 32].includes(options.quality) || ![720, 1080].includes(options.edge))) throw new Error(translate('video:errors.badCompress'))
  if (options.action === 'audio' && !['mp3', 'm4a', 'wav'].includes(options.format)) throw new Error(translate('video:errors.badAudioFormat'))
  if (options.action === 'gif' || options.action === 'trim') {
    if (!Number.isFinite(options.start) || !Number.isFinite(options.end) || options.start < 0 || options.end <= options.start) throw new Error(translate('video:errors.badRange'))
    if (metadata && options.end > metadata.duration + 0.001) throw new Error(translate('video:errors.endPastDuration', { seconds: metadata.duration.toFixed(2) }))
    if (options.action === 'gif' && (options.end - options.start > VIDEO_LIMITS.gifDuration || ![320, 480, 640].includes(options.width) || ![8, 12, 15].includes(options.fps))) throw new Error(translate('video:errors.gifLimits'))
  }
  if (metadata && options.action === 'audio' && !metadata.hasAudio) throw new Error(translate('video:errors.noAudio'))
}
