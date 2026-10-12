import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadOutput } from '@/features/tools/hub'
import { BackgroundRemovalError, removeBackgroundWithAi } from '../services/ai-background-removal'
import { normalizeBackgroundInput } from '../services/background-removal-input'
import model from '../services/background-removal-model.json'
import { composeBackgroundAlpha, renderBackgroundAlpha } from '../utils/background-alpha'
import { newStrokeEdit, paintStroke, pushStroke, STROKE_ERASE, STROKE_KEEP, undoStroke, type StrokeEdit } from '../utils/mask-strokes'

type CanvasState = { source: ImageData; auto: Uint8Array; strokes: Uint8Array; mask: Uint8Array }
type Phase = 'idle' | 'loading' | 'processing' | 'ready' | 'error' | 'cancelled'

function resizeAlpha(alpha: Uint8Array, width: number, height: number): Uint8Array {
  const small = document.createElement('canvas')
  const large = document.createElement('canvas')
  try {
    small.width = small.height = model.inputSize
    large.width = width; large.height = height
    const smallContext = small.getContext('2d')!
    const pixels = smallContext.createImageData(model.inputSize, model.inputSize)
    for (let index = 0; index < alpha.length; index++) {
      pixels.data[index * 4] = pixels.data[index * 4 + 1] = pixels.data[index * 4 + 2] = alpha[index]
      pixels.data[index * 4 + 3] = 255
    }
    smallContext.putImageData(pixels, 0, 0)
    const context = large.getContext('2d', { willReadFrequently: true })!
    context.imageSmoothingQuality = 'high'
    context.drawImage(small, 0, 0, width, height)
    const data = context.getImageData(0, 0, width, height).data
    return Uint8Array.from({ length: width * height }, (_, index) => data[index * 4])
  } finally { small.width = small.height = large.width = large.height = 0 }
}

export function useBackgroundRemoval() {
  const { t } = useTranslation('image')
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef<CanvasState | null>(null)
  const stroke = useRef<StrokeEdit | null>(null)
  const history = useRef<StrokeEdit[]>([])
  const controller = useRef<AbortController | null>(null)
  const file = useRef<File | null>(null)
  const backgroundRef = useRef('transparent')
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [brush, setBrush] = useState<'off' | 'erase' | 'keep'>('off')
  const [radius, setRadius] = useState(24)
  const [background, setBackground] = useState('transparent')
  const [message, setMessage] = useState('')
  const [undoSteps, setUndoSteps] = useState(0)
  const busy = phase === 'loading' || phase === 'processing'

  useEffect(() => () => { controller.current?.abort(); state.current = null; file.current = null; history.current = [] }, [])

  const draw = () => {
    const current = state.current
    if (!current || !canvas.current) return
    composeBackgroundAlpha(current.auto, current.strokes, current.mask)
    canvas.current.getContext('2d')?.putImageData(renderBackgroundAlpha(current.source, current.mask, backgroundRef.current === 'transparent' ? null : backgroundRef.current), 0, 0)
  }
  const clear = () => {
    state.current = null; stroke.current = null; history.current = []; setUndoSteps(0)
    if (canvas.current) canvas.current.width = canvas.current.height = 0
  }
  const open = async (nextFile: File) => {
    controller.current?.abort()
    controller.current = null
    clear()
    file.current = null
    setName('')
    if (!/^image\/(jpeg|png|webp)$/.test(nextFile.type) || nextFile.size > 20 * 1024 * 1024) { setPhase('error'); setMessage(t('removeBg.invalidFile')); return }
    const job = new AbortController()
    controller.current = job
    file.current = nextFile
    setName(nextFile.name)
    setPhase('loading'); setMessage(t('removeBg.loading'))
    let bitmap: ImageBitmap | undefined
    const small = document.createElement('canvas')
    try {
      bitmap = await createImageBitmap(nextFile)
      if (job.signal.aborted) return
      const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
      const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale)
      if (!width || !height || !canvas.current) throw new Error('INVALID_IMAGE')
      const target = canvas.current
      target.width = width; target.height = height
      const context = target.getContext('2d', { willReadFrequently: true })!
      context.drawImage(bitmap, 0, 0, width, height)
      const source = context.getImageData(0, 0, width, height)
      small.width = small.height = model.inputSize
      const smallContext = small.getContext('2d', { willReadFrequently: true })!
      smallContext.imageSmoothingQuality = 'high'
      smallContext.drawImage(bitmap, 0, 0, model.inputSize, model.inputSize)
      bitmap.close(); bitmap = undefined
      const input = normalizeBackgroundInput(smallContext.getImageData(0, 0, model.inputSize, model.inputSize).data)
      small.width = small.height = 0
      const alpha = await removeBackgroundWithAi(input, job.signal, nextPhase => {
        if (controller.current !== job) return
        setPhase(nextPhase); setMessage(t(nextPhase === 'loading' ? 'removeBg.loading' : 'removeBg.processing'))
      })
      if (job.signal.aborted || controller.current !== job) return
      const total = width * height
      state.current = { source, auto: resizeAlpha(alpha, width, height), strokes: new Uint8Array(total), mask: new Uint8Array(total) }
      draw()
      setPhase('ready'); setMessage(t('removeBg.processed', { width, height }))
    } catch (error) {
      if (job.signal.aborted || controller.current !== job) return
      clear(); setPhase('error')
      setMessage(t(error instanceof BackgroundRemovalError ? error.code === 'MODEL_LOAD' ? 'removeBg.modelFailed' : error.code === 'TIMEOUT' ? 'removeBg.timeout' : error.code === 'UNSUPPORTED' ? 'removeBg.unsupported' : 'removeBg.processingFailed' : 'removeBg.openFailed'))
    } finally {
      bitmap?.close(); small.width = small.height = 0
      if (controller.current === job) controller.current = null
    }
  }
  const cancel = () => {
    controller.current?.abort(); controller.current = null
    clear(); setPhase('cancelled'); setMessage(t('removeBg.cancelled'))
  }
  const retry = () => { if (file.current) void open(file.current) }
  const changeBackground = (value: string) => { backgroundRef.current = value; setBackground(value); draw() }
  const brushAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = state.current, target = canvas.current, edit = stroke.current
    if (!current || !target || !edit || brush === 'off') return
    const bounds = target.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * current.source.width / bounds.width
    const y = (event.clientY - bounds.top) * current.source.height / bounds.height
    paintStroke(current.strokes, current.source.width, current.source.height, x, y, radius, brush === 'keep' ? STROKE_KEEP : STROKE_ERASE, edit)
    draw()
  }
  const startStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (brush === 'off' || !state.current) return
    stroke.current = newStrokeEdit(); event.currentTarget.setPointerCapture(event.pointerId); brushAt(event)
  }
  const endStroke = () => {
    if (!stroke.current) return
    history.current = pushStroke(history.current, stroke.current); stroke.current = null; setUndoSteps(history.current.length)
  }
  const undo = () => {
    const edit = history.current.pop()
    if (!edit || !state.current) return
    undoStroke(state.current.strokes, edit); setUndoSteps(history.current.length); draw()
  }
  const save = () => {
    const target = canvas.current, current = state.current
    if (!target || !current || phase !== 'ready') return
    const outputName = `${name.replace(/\.[^.]+$/, '')}-xoa-phong.png`
    target.toBlob(blob => {
      if (state.current !== current) return
      if (!blob) { setMessage(t('removeBg.exportFailed')); return }
      downloadOutput({ name: outputName, blob }); setMessage(t('removeBg.done'))
    }, 'image/png')
  }
  return { canvas, name, phase, busy, brush, setBrush, radius, setRadius, background, changeBackground, message, undoSteps, open, cancel, retry, canRetry: (phase === 'error' || phase === 'cancelled') && Boolean(file.current), brushAt, startStroke, endStroke, undo, save }
}
