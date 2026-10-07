import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, type PDFPage } from 'pdf-lib'
import { newId } from '@/utils/id'
import { translate } from '@/i18n/runtime'
import { originOf, type PageRef, type PdfSource } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import type { Rgb } from '../utils/decorations'
import type { FontStyle } from '../utils/font-style'
import { markupBounds, moveMarkup } from '../utils/markup-geometry'
import { normalizeRotation, userToVisual, visualSize, visualToUser, type PageBox, type Point, type QuarterTurn } from '../utils/page-geometry'
import { describeOrigin } from '../utils/page-label'
import {
  blockShift,
  placeOf,
  placeRiders,
  planShift,
  reflowLineStart,
  riderFrames,
  type PageObject,
  type PageObjectKind,
  type ReflowPlan,
  type Rider,
  type ShiftPlan,
} from '../utils/reflow-layout'
import { finishCarryover, prepareSource, pruneFormToPages, radioGroupKey } from './pdf-carryover'
import { drawTextRun } from './pdf-draw'
import { createFontLoader } from './pdf-fonts'
import { createTextPreparer } from './pdf-text'
import { formSummary } from './pdf-form'
import { loadPdfium, type Pdfium } from './pdfium'

/**
 * Sửa chữ bằng cách VIẾT LẠI nội dung trang: PDFium gỡ chữ gốc và dời phần bên
 * dưới, pdf-lib viết chữ mới bằng phông đã cắt gọn. Khác "che bề mặt" ở chỗ chữ
 * cũ biến mất khỏi tệp thật — sao chép hay tìm không còn ra.
 *
 * PDFium tự nhúng phông được nhưng nhúng CẢ tệp (+590 KB mỗi lần sửa); để nó
 * chỉ gỡ + dời rồi giao phần viết chữ cho pdf-lib thì mỗi lần chỉ thêm ~15–20 KB.
 */

/** Trang đã tách riêng và liệt kê nội dung — có là trang này viết lại được. */
export interface ReflowProbe {
  sourceId: string
  pageIndex: number
  /** Tệp MỘT trang tách từ nguồn: PDFium chỉ phải nạp trang đang sửa, không nạp cả tệp trăm trang. */
  bytes: Uint8Array
  box: PageBox
  rotation: QuarterTurn
  objects: PageObject[]
  /** Khung của liên kết, ghi chú, ô form trên trang (khung gốc) — chúng cũng được tính khi xét trang đã đầy chưa. */
  annotations: Rider[]
}

export interface ReflowRequest extends ReflowPlan {
  /** Nguồn lúc lên kế hoạch — chỉ số đối tượng chỉ đúng với đúng nguồn đó. */
  sourceId: string
  /** Chữ mới, đã ngắt dòng. */
  lines: string[]
  font: FontStyle
  ink: Rgb
}

export interface ReflowPage {
  source: PdfSource
  page: PageRef
}

export interface ReflowResult extends ReflowPage {
  /** Trang mới chứa phần bị đẩy quá mép dưới thân bài — chèn ngay sau `page`. */
  spill: ReflowPage[]
}

// Hằng FPDF_PAGEOBJ_* của PDFium.
const KINDS: Record<number, PageObjectKind> = { 1: 'text', 2: 'path', 3: 'image', 4: 'shading', 5: 'form' }
const KEEP = 2
const probes = new Map<string, Promise<ReflowProbe | null>>()

async function singlePage(source: PdfSource, pageIndex: number) {
  const doc = await PDFDocument.load(source.bytes, { updateMetadata: false })
  const output = await PDFDocument.create()
  // Như trang cắt: giữ form, layer, tệp đính kèm của tệp gốc.
  const prepared = prepareSource(doc, source.id, [pageIndex])
  const [copied] = await output.copyPages(doc, [pageIndex])
  output.addPage(copied)
  finishCarryover(output, [prepared], [{ page: copied, sourceKey: source.id, pageIndex }])
  const box = copied.getCropBox()
  const rotation = normalizeRotation(copied.getRotation().angle)
  const annotations = annotationRiders(output, copied, box, rotation).filter((rider) => rider !== null)
  return { bytes: await output.save(), box, rotation, annotations }
}

async function withPage<T>(bytes: Uint8Array, run: (pdfium: Pdfium, doc: number, page: number) => T): Promise<T> {
  const pdfium = await loadPdfium()
  const { api } = pdfium
  // PDFium đọc thẳng vùng nhớ này suốt lúc tài liệu còn mở — chỉ giải phóng sau khi đóng.
  const data = pdfium.put(bytes)
  const doc = api.FPDF_LoadMemDocument(data, bytes.length, '')
  try {
    const page = doc ? api.FPDF_LoadPage(doc, 0) : 0
    if (!page) throw new Error('PDFium không mở được trang.')
    try {
      return run(pdfium, doc, page)
    } finally {
      api.FPDF_ClosePage(page)
    }
  } finally {
    if (doc) api.FPDF_CloseDocument(doc)
    pdfium.free(data)
  }
}

function baseRect(a: Point, b: Point, box: PageBox, rotation: QuarterTurn): Rect {
  const p = userToVisual(a, box, rotation)
  const q = userToVisual(b, box, rotation)
  return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y) }
}

const RECT = PDFName.of('Rect')

/** Khung `/Rect` của một annotation ở khung gốc; `null` khi nó không có khung đo được. */
function annotationBox(annot: PDFDict | undefined, box: PageBox, rotation: QuarterTurn): Rect | null {
  const rect = annot?.lookupMaybe(RECT, PDFArray)
  const [x1, y1, x2, y2] = [0, 1, 2, 3].map((at) => {
    const item = rect?.size() === 4 ? rect.lookup(at) : undefined
    return item instanceof PDFNumber ? item.asNumber() : NaN
  })
  return [x1, y1, x2, y2].every(Number.isFinite) ? baseRect({ x: x1, y: y1 }, { x: x2, y: y2 }, box, rotation) : null
}

/** Khung đi kèm của từng annotation, đúng thứ tự `/Annots`; `null` khi nó không có khung đo được. */
function annotationRiders(doc: PDFDocument, page: PDFPage, box: PageBox, rotation: QuarterTurn): (Rider | null)[] {
  const annots = page.node.Annots()
  return Array.from({ length: annots?.size() ?? 0 }, (_, index) => {
    const annot = annots?.lookupMaybe(index, PDFDict)
    const rect = annotationBox(annot, box, rotation)
    return annot && rect ? { box: rect, group: radioGroupKey(doc, annot) } : null
  })
}

function pageHandles({ api }: Pdfium, page: number): number[] {
  return Array.from({ length: api.FPDFPage_CountObjects(page) }, (_, index) => api.FPDFPage_GetObject(page, index))
}

function describeObject(pdfium: Pdfium, handle: number, box: PageBox, rotation: QuarterTurn): PageObject {
  const { api } = pdfium
  const kind = KINDS[api.FPDFPageObj_GetType(handle)] ?? 'form'
  let anchor: Point | undefined
  if (kind === 'text') {
    const matrix = pdfium.floats(6, (ptr) => api.FPDFPageObj_GetMatrix(handle, ptr))
    anchor = userToVisual({ x: matrix[4], y: matrix[5] }, box, rotation)
  }
  let measured = false
  const [left, bottom, right, top] = pdfium.floats(4, (ptr) => {
    measured = api.FPDFPageObj_GetBounds(handle, ptr, ptr + 4, ptr + 8, ptr + 12)
  })
  // Chữ toàn dấu cách không có khung bao: đặt khung rỗng tại gốc chữ để nó vẫn thuộc về đúng dòng.
  const empty = { x: anchor?.x ?? 0, y: anchor?.y ?? 0, width: 0, height: 0 }
  const stroked = kind === 'path' ? pdfium.ints(2, (ptr) => api.FPDFPath_GetDrawMode(handle, ptr, ptr + 4))[1] !== 0 : undefined
  return { kind, anchor, stroked, box: measured ? baseRect({ x: left, y: top }, { x: right, y: bottom }, box, rotation) : empty }
}

/**
 * Tách trang ra tệp riêng và liệt kê nội dung của nó. `null` = trang không có
 * chữ ở cấp trang (bản scan, trang OCR, cả trang gói trong một form XObject) —
 * chỉ sửa được trên bề mặt. Giữ 2 trang gần nhất.
 */
export function probeReflow(source: PdfSource, pageIndex: number): Promise<ReflowProbe | null> {
  const key = `${source.id}:${pageIndex}`
  let entry = probes.get(key)
  if (entry) {
    probes.delete(key)
    probes.set(key, entry)
    return entry
  }
  entry = (async () => {
    const single = await singlePage(source, pageIndex)
    const objects = await withPage(single.bytes, (pdfium, _doc, page) =>
      pageHandles(pdfium, page).map((handle) => describeObject(pdfium, handle, single.box, single.rotation)),
    )
    return objects.some((object) => object.kind === 'text') ? { ...single, sourceId: source.id, pageIndex, objects } : null
  })()
  entry.catch(() => probes.delete(key))
  probes.set(key, entry)
  while (probes.size > KEEP) probes.delete(probes.keys().next().value as string)
  return entry
}

export function clearReflowProbes(): void {
  probes.clear()
}

function saveCopy(pdfium: Pdfium, doc: number): Uint8Array<ArrayBuffer> {
  const { api } = pdfium
  const writer = api.PDFiumExt_OpenFileWriter()
  try {
    if (!api.PDFiumExt_SaveAsCopy(doc, writer)) throw new Error('PDFium không ghi được tệp.')
    const size = api.PDFiumExt_GetFileWriterSize(writer)
    const ptr = pdfium.alloc(size)
    try {
      api.PDFiumExt_GetFileWriterData(writer, ptr, size)
      return pdfium.take(ptr, size)
    } finally {
      pdfium.free(ptr)
    }
  } finally {
    api.PDFiumExt_CloseFileWriter(writer)
  }
}

/** Vectơ dời ở khung gốc → user space của PDF (trang có `/Rotate` thì hai hệ lệch nhau). */
function userVector(shift: Point, box: PageBox, rotation: QuarterTurn): Point {
  const from = visualToUser({ x: 0, y: 0 }, box, rotation)
  const to = visualToUser(shift, box, rotation)
  return { x: to.x - from.x, y: to.y - from.y }
}

/**
 * Ma trận kéo dài một hình dọc theo chiều xuống `down` (vectơ đơn vị, user space): mép trên đứng yên, mép dưới đi thêm
 * `delta`. Viền bảng của Word và Chrome là hình chữ nhật mảnh TÔ ĐẶC nên kéo kiểu này không làm nét dày lên.
 */
function stretchMatrix(object: PageObject, delta: number, down: Point, box: PageBox, rotation: QuarterTurn): [number, number, number, number, number, number] {
  const { x, y, width, height } = object.box
  const ends = [{ x, y }, { x: x + width, y: y + height }].map((corner) => {
    const user = visualToUser(corner, box, rotation)
    return user.x * down.x + user.y * down.y
  })
  const top = Math.min(...ends)
  const gain = delta / (Math.max(...ends) - top)
  return [1 + gain * down.x * down.x, gain * down.x * down.y, gain * down.x * down.y, 1 + gain * down.y * down.y, -gain * top * down.x, -gain * top * down.y]
}

const INK_LIST = PDFName.of('InkList')
// Các mảng toạ độ x,y xen kẽ của annotation — dời `Rect` mà quên chúng là vùng bấm của liên kết / nét mực ở lại chỗ cũ.
const POINT_LISTS = ['Rect', 'QuadPoints', 'L', 'Vertices', 'CL'].map((key) => PDFName.of(key))

function shiftPairs(list: PDFArray, by: Point) {
  for (let index = 0; index < list.size(); index++) {
    const item = list.lookup(index)
    if (item instanceof PDFNumber) list.set(index, PDFNumber.of(item.asNumber() + (index % 2 === 0 ? by.x : by.y)))
  }
}

// Trang tràn dựng từ cùng tệp một trang với trang gốc: để nguyên là tệp đính kèm có hai bản khi xuất.
const NAMES = PDFName.of('Names')

/**
 * Liên kết, ghi chú, ô form đi theo nội dung của chúng: dời theo, hoặc sang trang tràn cùng phần bị cắt (`sheet` =
 * trang đang dựng, 0 là trang gốc).
 */
function placeAnnotations(doc: PDFDocument, page: PDFPage, probe: ReflowProbe, plan: ReflowPlan, shift: ShiftPlan, sheet: number) {
  const annots = page.node.Annots()
  if (!annots) return
  // Dò lại trên tệp PDFium vừa ghi chứ không dùng `probe.annotations`: khoá nhóm là ref, chỉ đúng trong chính tệp ấy.
  const riders = annotationRiders(doc, page, probe.box, probe.rotation)
  const known = riders.filter((rider) => rider !== null)
  const places = new Map(placeRiders(known, plan, shift).map((place, at) => [known[at], place]))
  for (let index = annots.size() - 1; index >= 0; index--) {
    const annot = annots.lookupMaybe(index, PDFDict)
    const rider = riders[index]
    const place = (rider && places.get(rider)) ?? { page: 0, by: 0 }
    if (place.page !== sheet) {
      annots.remove(index)
      continue
    }
    if (!annot || place.by === 0) continue
    const by = userVector(blockShift(plan.block, place.by), probe.box, probe.rotation)
    for (const key of POINT_LISTS) {
      const list = annot.lookupMaybe(key, PDFArray)
      if (list) shiftPairs(list, by)
    }
    const strokes = annot.lookupMaybe(INK_LIST, PDFArray)
    for (let at = 0; strokes && at < strokes.size(); at++) {
      const stroke = strokes.lookupMaybe(at, PDFArray)
      if (stroke) shiftPairs(stroke, by)
    }
  }
}

/**
 * Viết lại khối chữ của `request` trên trang → một tệp một trang mới, như trang
 * cắt: lớp chữ, xem trước, xuất tệp chạy y như trang thường. Trang giữ nguyên
 * id; dấu tay nằm dưới khối dời theo. Phần bị đẩy quá mép dưới thân bài thành
 * các trang mới (`spill`), mỗi trang một tệp riêng.
 */
export async function rewriteText(source: PdfSource, page: PageRef, request: ReflowRequest): Promise<ReflowResult> {
  const probe = await probeReflow(source, page.pageIndex)
  if (!probe || request.sourceId !== source.id) throw new Error('Trang này không viết lại được.')
  const { block, lines } = request
  const { box, rotation } = probe
  const riders = [...riderFrames(probe.annotations, request), ...(page.markups ?? []).map(markupBounds)]
  const shift = planShift(probe.objects, request, lines.length, visualSize(box, rotation), riders)
  const down = userVector(blockShift(block, 1), box, rotation)
  const spilled = new Set(shift.spill.flatMap((sheet) => sheet.objects.map((item) => item.index)))
  const label = describeOrigin(source, page.pageIndex)

  /** Dựng một trang từ trang gốc: `sheet` 0 = trang đang sửa, `n` = trang tràn thứ `n`. */
  const build = async (sheet: number): Promise<ReflowPage> => {
    const extra = sheet > 0 ? shift.spill[sheet - 1] : null
    const rewritten = await withPage(probe.bytes, (pdfium, doc, handle) => {
      const { api } = pdfium
      // Lấy đủ tay nắm TRƯỚC khi gỡ: gỡ một đối tượng là chỉ số của mọi đối tượng sau nó đổi.
      const handles = pageHandles(pdfium, handle)
      if (handles.length !== probe.objects.length) throw new Error('Nội dung trang đã đổi.')
      const drop = (index: number) => {
        if (api.FPDFPage_RemoveObject(handle, handles[index])) api.FPDFPageObj_Destroy(handles[index])
      }
      // Word cắt chữ và nền của từng ô bảng bằng một vùng cắt riêng. `Transform` chỉ dời vật, vùng cắt ở lại chỗ cũ —
      // chữ dời ra khỏi vùng cắt của chính nó là biến mất, không lỗi nào báo.
      const transform = (index: number, matrix: [number, number, number, number, number, number]) => {
        api.FPDFPageObj_Transform(handles[index], ...matrix)
        api.FPDFPageObj_TransformClipPath(handles[index], ...matrix)
      }
      const slide = (index: number, by: number) => {
        if (by !== 0) transform(index, [1, 0, 0, 1, down.x * by, down.y * by])
      }
      if (extra) {
        // Trang tràn chỉ giữ phần của nó: nền, chân trang, cột bên cạnh đều ở lại trang gốc.
        const kept = new Map(extra.objects.map((item) => [item.index, item.by]))
        handles.forEach((_, index) => {
          const by = kept.get(index)
          if (by === undefined) drop(index)
          else slide(index, by)
        })
      } else {
        for (const index of request.remove) drop(index)
        for (const index of spilled) drop(index)
        for (const index of shift.move) slide(index, shift.delta)
        for (const index of shift.tail) slide(index, shift.tailDelta)
        for (const item of shift.stretch) transform(item.index, stretchMatrix(probe.objects[item.index], item.by, down, box, rotation))
      }
      if (!api.FPDFPage_GenerateContent(handle)) throw new Error('PDFium không ghi lại được nội dung trang.')
      return saveCopy(pdfium, doc)
    })

    const doc = await PDFDocument.load(rewritten, { updateMetadata: false })
    const target = doc.getPage(0)
    const [from, to] = extra ? extra.lines : [0, shift.keep]
    const lifted = blockShift(block, extra?.lift ?? 0)
    const typed = lines.slice(from, to)
    if (typed.some((text) => text.trim())) {
      const prepare = createTextPreparer(doc, createFontLoader(doc))
      for (const [at, text] of typed.entries()) {
        if (!text.trim()) continue
        const start = reflowLineStart(block, from + at)
        drawTextRun(target, box, rotation, {
          content: await prepare(text, request.font, block.size, request.ink),
          size: block.size,
          anchor: { x: start.x + lifted.x, y: start.y + lifted.y },
          align: 'start',
          angle: block.turn,
          baselineShift: 0,
          color: request.ink,
          opacity: 1,
        })
      }
    }
    placeAnnotations(doc, target, probe, request, shift, sheet)
    if (extra) doc.catalog.delete(NAMES)
    // Ô form đã chia theo trang: mỗi tệp chỉ giữ trường của những ô nó đang mang.
    if (shift.spill.length > 0) pruneFormToPages(doc)
    const bytes = await doc.save()

    const edited: PdfSource = {
      id: newId(),
      originId: originOf(source),
      name: source.name,
      label: extra ? translate('pdf:origin.continued', { label }) : label,
      kind: 'pdf',
      mime: 'application/pdf',
      bytes: bytes as Uint8Array<ArrayBuffer>,
      size: bytes.byteLength,
      pageCount: 1,
      form: formSummary(doc),
    }
    const markups = page.markups?.flatMap((markup) => {
      const place = placeOf(markupBounds(markup), request, shift)
      if (place.page !== sheet) return []
      const moved = blockShift(block, place.by)
      return [moved.x === 0 && moved.y === 0 ? markup : moveMarkup(markup, moved.x, moved.y)]
    })
    return {
      source: edited,
      page: { ...page, id: extra ? newId() : page.id, sourceId: edited.id, pageIndex: 0, markups: extra && !markups?.length ? undefined : markups },
    }
  }

  const first = await build(0)
  const spill: ReflowPage[] = []
  for (let sheet = 1; sheet <= shift.spill.length; sheet++) spill.push(await build(sheet))
  return { ...first, spill }
}
