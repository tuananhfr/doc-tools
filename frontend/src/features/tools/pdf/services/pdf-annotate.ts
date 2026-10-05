import { degrees, PDFArray, PDFHexString, PDFName, PDFRef, PDFString, type PDFDocument, type PDFPage } from 'pdf-lib'
import type { Markup, Rect } from '../types/markup.types'
import { annotationSpec, type AnnotSpec } from '../utils/markup-annotation'
import { markupBounds } from '../utils/markup-geometry'
import { normalizeRotation, visualToUser, type PageBox, type Point, type QuarterTurn } from '../utils/page-geometry'
import type { FontLoader } from './pdf-fonts'
import { drawMarkups } from './pdf-markup'

const AUTHOR = 'ERPCons DocTools'
/** Đầu mũi tên, nét dày, chữ tràn khung đều ra ngoài `markupBounds` — hộp appearance cắt mất phần tràn. */
const APPEARANCE_PAD = 14
/** Cờ Print: không có thì in ra giấy mất hết ghi chú. */
const PRINT_FLAG = 4

interface Frame {
  box: PageBox
  rotation: QuarterTurn
}

function toUser(p: Point, frame: Frame): [number, number] {
  const user = visualToUser(p, frame.box, frame.rotation)
  return [user.x, user.y]
}

function userRect(bounds: Rect, frame: Frame): [number, number, number, number] {
  const corners = [
    toUser({ x: bounds.x, y: bounds.y }, frame),
    toUser({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, frame),
  ]
  return [
    Math.min(corners[0][0], corners[1][0]),
    Math.min(corners[0][1], corners[1][1]),
    Math.max(corners[0][0], corners[1][0]),
    Math.max(corners[0][1], corners[1][1]),
  ]
}

/**
 * Vẽ MỘT dấu lên một trang tạm cùng khung với trang thật rồi nhúng trang tạm
 * thành Form XObject làm appearance — dùng lại nguyên bộ vẽ của bản in phẳng,
 * khỏi viết bộ vẽ thứ hai cho annotation rồi để hai bản lệch nhau.
 */
async function appearance(doc: PDFDocument, page: PDFPage, markup: Markup, rect: [number, number, number, number], fonts: FontLoader) {
  const media = page.getMediaBox()
  const crop = page.getCropBox()
  const temp = doc.addPage([media.width, media.height])
  temp.setMediaBox(media.x, media.y, media.width, media.height)
  temp.setCropBox(crop.x, crop.y, crop.width, crop.height)
  temp.setRotation(degrees(page.getRotation().angle))
  await drawMarkups(temp, [markup], fonts)

  const embedded = await doc.embedPage(temp, { left: rect[0], bottom: rect[1], right: rect[2], top: rect[3] })
  await embedded.embed()
  // Trang tạm đã chép xong vào XObject — gỡ khỏi cây trang và xoá hẳn, không thì tệp ra mang thêm trang ma.
  const contents = temp.node.get(PDFName.of('Contents'))
  doc.removePage(doc.getPageCount() - 1)
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents]
  for (const ref of refs) if (ref instanceof PDFRef) doc.context.delete(ref)
  doc.context.delete(temp.ref)
  return embedded.ref
}

function specEntries(spec: AnnotSpec, frame: Frame): Record<string, unknown> {
  const entries: Record<string, unknown> = {}
  if (spec.border !== undefined) entries.BS = { W: spec.border }
  if (spec.cloudy) entries.BE = { S: 'C', I: 1 }
  if (spec.line) {
    entries.L = [...toUser(spec.line.from, frame), ...toUser(spec.line.to, frame)]
    if (spec.line.arrow) entries.LE = ['None', 'OpenArrow']
  }
  if (spec.ink) entries.InkList = spec.ink.map((stroke) => stroke.flatMap((p) => toUser(p, frame)))
  if (spec.quads) entries.QuadPoints = spec.quads.flatMap((quad) => quad.flatMap((p) => toUser(p, frame)))
  if (spec.subtype === 'FreeText') entries.DA = PDFString.of(`/Helv 12 Tf ${spec.color.join(' ')} rg`)
  if (spec.subtype === 'Text') {
    entries.Name = 'Comment'
    entries.Open = false
  }
  if (spec.stampName) entries.Name = spec.stampName
  return entries
}

/**
 * Ghi dấu thành annotation PDF. Trả về các dấu KHÔNG làm annotation được (sửa
 * / che chữ) để bên gọi in phẳng như cũ. Gọi TRƯỚC khi áp xoay thêm, như
 * `drawMarkups`: toạ độ dấu tính theo khung chỉ có `/Rotate` của tệp nguồn.
 */
export async function annotateMarkups(doc: PDFDocument, page: PDFPage, markups: Markup[], fonts: FontLoader): Promise<Markup[]> {
  const frame: Frame = { box: page.getCropBox(), rotation: normalizeRotation(page.getRotation().angle) }
  const flat: Markup[] = []
  const now = PDFString.fromDate(new Date())

  for (const markup of markups) {
    const spec = annotationSpec(markup)
    if (!spec) {
      flat.push(markup)
      continue
    }
    const bounds = markupBounds(markup)
    const rect = userRect(
      { x: bounds.x - APPEARANCE_PAD, y: bounds.y - APPEARANCE_PAD, width: bounds.width + APPEARANCE_PAD * 2, height: bounds.height + APPEARANCE_PAD * 2 },
      frame,
    )
    const normal = await appearance(doc, page, markup, rect, fonts)
    const annotation = doc.context.obj({
      Type: 'Annot',
      Subtype: spec.subtype,
      Rect: rect,
      F: PRINT_FLAG,
      NM: PDFString.of(markup.id),
      M: now,
      T: PDFHexString.fromText(AUTHOR),
      C: [...spec.color],
      Contents: PDFHexString.fromText(spec.contents),
      AP: { N: normal },
      ...specEntries(spec, frame),
    })
    page.node.addAnnot(doc.context.register(annotation))
  }
  return flat
}
