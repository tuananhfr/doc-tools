import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { PageText, Quad } from '../types/text-layer.types'
import { DEFAULT_OCR_OPTIONS, OCR_PIPELINE_VERSION, type OcrPipelineOptions } from '../types/ocr-profile.types'
import { normalizeRotation } from '../utils/page-geometry'
import { ocrWords } from '../utils/ocr-review'
import { mergeOcrPasses, selectOcrExportPass, type OcrPassWords } from '../utils/ocr-consensus'
import { invertMatrix, transformPoint, transformQuad } from '../utils/ocr-transform'
import { glareRegions } from '../utils/ocr-glare'
import { inspectOcrImage, ocrSourceHash } from './ocr-quality'
import { recognizeCanvas, type OcrProgress } from './ocr'
import { preprocessOcr, sampledGray } from './ocr-preprocess'
import { routeOcr } from './ocr-router'
import { detectOcrLayout } from './ocr-layout'
import { numericOcrPass } from './ocr-numeric'
import { proposeOcrCells } from '../utils/ocr-cell-proposals'
import { renderOcrInput } from './ocr-input'
import { recognizeLocalPrint } from './ocr-local'
import { IDENTITY } from '../utils/ocr-transform'

export function ocrFingerprint(hash: string | null, page: PageRef, options: OcrPipelineOptions) {
  return JSON.stringify({ hash, page: page.pageIndex, rotation: normalizeRotation(page.rotation), sheet: page.sheet ?? null, options, version: OCR_PIPELINE_VERSION })
}

export async function recognizePipeline(source: SourceFile, page: PageRef, onProgress: (progress: OcrProgress) => void, signal: AbortSignal, options = DEFAULT_OCR_OPTIONS): Promise<PageText> {
  signal.throwIfAborted()
  const turn = normalizeRotation(page.rotation)
  const { canvas: original, pxPerPt, toBase: originalToBase, toPreviewBox } = await renderOcrInput(source, page, options.profile === 'printed' && !options.perspective)
  const [qualityFlags, sourceHash] = await Promise.all([inspectOcrImage(original, source), ocrSourceHash(source)])
  const numeric = options.maxPasses === 3 && options.profile === 'numeric'
  const localPrint = options.profile === 'printed' && options.maxPasses > 1 && !options.perspective && original.width >= 600 && original.height >= 600
  const preprocessOptions = numeric ? { ...options, maxPasses: 2 as const } : localPrint ? { ...options, maxPasses: (options.maxPasses - 1) as 1 | 2 } : options
  const variants = preprocessOcr(original, preprocessOptions), router = routeOcr(options), passes: OcrPassWords[] = []
  const passCount = variants.length + Number(numeric) + Number(localPrint)
  let localRegions: Awaited<ReturnType<typeof recognizeLocalPrint>>['regions'] = []
  let numericCrops: { targetWordId: string; toOriginal: import('../types/ocr-profile.types').OcrMatrix }[] = []
  if (variants.some(variant => variant.id === 'deskew')) qualityFlags.push('skew')
  if (variants.some(variant => variant.id === 'perspective')) qualityFlags.push('perspective')
  if (glareRegions(sampledGray(original)).length) qualityFlags.push('glare')
  if (router.handwritingUnsupported) qualityFlags.push('handwriting-unsupported')
  try {
    for (const [index, variant] of variants.entries()) {
      signal.throwIfAborted()
      const lines = await recognizeCanvas(variant.canvas, progress => onProgress({ ...progress, progress: (index + progress.progress) / passCount }), false, signal)
      signal.throwIfAborted()
      const toBase = (point: { x: number; y: number }) => {
        const pixel = transformPoint(variant.toOriginal, { x: point.x * pxPerPt, y: point.y * pxPerPt })
        return originalToBase({ x: pixel.x / pxPerPt, y: pixel.y / pxPerPt })
      }
      const words = ocrWords(lines, pxPerPt, toBase, variant.canvas).map(word => {
        const box = word.previewBox
        const quad: Quad = [{ x: box.x * variant.canvas.width, y: box.y * variant.canvas.height }, { x: (box.x + box.width) * variant.canvas.width, y: box.y * variant.canvas.height }, { x: (box.x + box.width) * variant.canvas.width, y: (box.y + box.height) * variant.canvas.height }, { x: box.x * variant.canvas.width, y: (box.y + box.height) * variant.canvas.height }]
        const points = transformQuad(variant.toOriginal, quad), xs = points.map(point => point.x / original.width), ys = points.map(point => point.y / original.height)
        return { ...word, previewBox: { x: Math.max(0, Math.min(...xs)), y: Math.max(0, Math.min(...ys)), width: Math.min(1, Math.max(...xs)) - Math.max(0, Math.min(...xs)), height: Math.min(1, Math.max(...ys)) - Math.max(0, Math.min(...ys)) } }
      })
      passes.push({ pass: variant.id, words, engineVersion: '7.0.0/vie-4.0.0_best_int' })
    }
    if (localPrint) {
      const local = await recognizeLocalPrint(original, progress => onProgress({ ...progress, progress: (variants.length + progress.progress) / passCount }), signal)
      localRegions = local.regions
      const words = ocrWords(local.lines, pxPerPt, originalToBase, original)
      passes.push({ pass: 'local', words, engineVersion: passes[0].engineVersion })
    }
    if (numeric) {
      const result = await numericOcrPass(original, passes[0].words, pxPerPt, originalToBase, signal, progress => onProgress({ stage: 'reading', progress: (variants.length + progress) / passCount }))
      numericCrops = result.crops
      passes.push({ pass: 'numeric', words: result.words, targetWordIds: result.targetWordIds, engineVersion: passes[0].engineVersion })
    }
    const words = mergeOcrPasses(passes).map(word => router.requiresFullReview ? { ...word, reviewReasons: [...new Set([...(word.reviewReasons ?? []), 'unreadable' as const])] } : word)
    const geometry = options.profile === 'table' ? variants.find(variant => variant.id === 'deskew' || variant.id === 'perspective') ?? variants[0] : variants[0]
    const sample = geometry.layoutSample ?? sampledGray(geometry.canvas), toGeometry = invertMatrix(geometry.toOriginal)
    const layoutWords = geometry.id === 'original' ? words : words.map(word => {
      const box = word.previewBox, points = transformQuad(toGeometry, [{ x: box.x*original.width, y: box.y*original.height }, { x: (box.x+box.width)*original.width, y: box.y*original.height }, { x: (box.x+box.width)*original.width, y: (box.y+box.height)*original.height }, { x: box.x*original.width, y: (box.y+box.height)*original.height }])
      const xs = points.map(point => point.x/geometry.canvas.width), ys = points.map(point => point.y/geometry.canvas.height)
      return { ...word, previewBox: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) } }
    })
    const layout = detectOcrLayout(layoutWords, options.profile, sample, point => {
      const pixel = transformPoint(geometry.toOriginal, { x: point.x*geometry.canvas.width/sample.width, y: point.y*geometry.canvas.height/sample.height })
      return originalToBase({ x: pixel.x/pxPerPt, y: pixel.y/pxPerPt })
    })
    const proposal = passes.find(pass => pass.pass === geometry.id && pass.pass !== 'original') ?? passes.find(pass => pass.pass === 'grid')
    if (proposal) layout.tables = layout.tables.map(table => proposeOcrCells(table, proposal, passes[0]))
    const exportPass = selectOcrExportPass(passes) ?? passes[0]
    return { runs: exportPass.words.map(word => word.run), ocr: { sourceId: source.id, pageIndex: page.pageIndex, sourceHash, engine: 'tesseract', engineVersion: exportPass.engineVersion, pass: exportPass.pass, words: words.map(word => ({ ...word, previewBox: toPreviewBox(word.previewBox) })), qualityFlags,
      layout, pipeline: { version: OCR_PIPELINE_VERSION, profile: options.profile, fingerprint: ocrFingerprint(sourceHash, page, options), rotation: turn, passes: [...variants.map(variant => ({ id: variant.id, toOriginal: variant.toOriginal, operations: variant.operations ?? [variant.id] })), ...(localPrint ? [{ id: 'local' as const, toOriginal: IDENTITY, operations: ['threshold', 'deskew'] as const, regions: localRegions }] : []), ...(numeric ? [{ id: 'numeric' as const, toOriginal: variants[0].toOriginal, crops: numericCrops }] : [])] } } }
  } finally {
    for (const variant of variants) { variant.canvas.width = 1; variant.canvas.height = 1 }
  }
}
