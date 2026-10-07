import { useEffect, useRef, useState } from 'react'
import { translate } from '@/i18n/runtime'
import { runVideoTask } from '../services/video-engine'
import type { VideoOptions, VideoOutput, VideoProgress } from '../types/video.types'

export function useVideoTask() {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<VideoProgress | null>(null)
  const [output, setOutput] = useState<VideoOutput | null>(null)
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort() }
  }, [])

  const reset = () => { if (!controller.current) { setOutput(null); setMessage(''); setProgress(null) } }
  const run = async (file: File, options: VideoOptions) => {
    if (controller.current) return
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    setMessage('')
    setOutput(null)
    try {
      const result = await runVideoTask(file, options, current.signal, (state) => { if (mounted.current) setProgress(state) })
      if (mounted.current) { setOutput(result); setMessage(translate('video:task.done')) }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : translate('video:task.failed'))
    } finally {
      controller.current = null
      if (mounted.current) { setBusy(false); setProgress(null) }
    }
  }
  return { busy, progress, output, message, reset, run, cancel: () => controller.current?.abort() }
}
