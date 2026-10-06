export type VideoOptions =
  | { action: 'compress'; quality: 23 | 28 | 32; edge: 720 | 1080 }
  | { action: 'trim'; start: number; end: number }
  | { action: 'gif'; start: number; end: number; width: 320 | 480 | 640; fps: 8 | 12 | 15 }
  | { action: 'audio'; format: 'mp3' | 'm4a' | 'wav' }

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  hasAudio: boolean
}

export interface VideoProgress {
  phase: 'loading' | 'reading' | 'processing' | 'saving'
  percent: number | null
}

export interface VideoOutput {
  blob: Blob
  name: string
  metadata: VideoMetadata
}
