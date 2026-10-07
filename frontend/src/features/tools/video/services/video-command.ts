import { translate } from '@/i18n/runtime'
import type { VideoOptions } from '../types/video.types'

const videoEncoding = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-threads', '1']
const audioEncoding = ['-c:a', 'aac', '-b:a', '128k']
const scale = (edge: number) => `scale=w='min(iw,${edge})':h='min(ih,${edge})':force_original_aspect_ratio=decrease:force_divisible_by=2`

export function videoCommand(options: VideoOptions): { args: string[]; extension: string; mime: string; suffix: string } {
  const input = ['-i', 'input.dat']
  const map = ['-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1']
  if (options.action === 'audio') {
    const codecs = { mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'], m4a: ['-c:a', 'aac', '-b:a', '192k'], wav: ['-c:a', 'pcm_s16le'] }
    return { args: [...input, '-map', '0:a:0', '-vn', '-map_metadata', '-1', ...codecs[options.format], '-ac', '2', '-ar', '44100', `output.${options.format}`], extension: options.format, mime: { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' }[options.format], suffix: translate('video:file.audio') }
  }
  if (options.action === 'gif') {
    const filter = `fps=${options.fps},scale=${options.width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`
    return { args: ['-ss', String(options.start), '-t', String(options.end - options.start), ...input, '-an', '-filter_complex', filter, '-loop', '0', 'output.gif'], extension: 'gif', mime: 'image/gif', suffix: translate('video:file.gif') }
  }
  const timing = options.action === 'trim' ? ['-ss', String(options.start), '-t', String(options.end - options.start)] : []
  return { args: [...input, ...timing, ...map, '-vf', scale(options.action === 'compress' ? options.edge : 1080), ...videoEncoding, '-crf', String(options.action === 'compress' ? options.quality : 23), ...audioEncoding, '-movflags', '+faststart', 'output.mp4'], extension: 'mp4', mime: 'video/mp4', suffix: translate(options.action === 'trim' ? 'video:file.trimmed' : 'video:file.compressed') }
}

export function videoOutputName(name: string, suffix: string, extension: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[\x00-\x1f<>:"/\\|?*]/g, '-').slice(0, 100) || 'video'
  return `${base}-${suffix}.${extension}`
}
